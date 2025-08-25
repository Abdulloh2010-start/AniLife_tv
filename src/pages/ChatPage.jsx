import { useEffect, useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import '../styles/chatpage.scss';

import { db, storage } from '../firebase.config';
import {
  collection,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function computeOnline(presence) {
  return presence && presence.state === 'online';
}

export default function ChatPage() {
  const { user } = useUser();
  const me = user;
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myChats, setMyChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [allPresence, setAllPresence] = useState({});
  const fileRef = useRef(null);
  const searchTimer = useRef(null);

  const ensureUserDoc = async (u) => {
    if (!u?.uid || !db) return;
    try {
      const userDocRef = doc(db, 'users', u.uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        await setDoc(userDocRef, {
          uid: u.uid,
          displayName: u.displayName || '',
          email: u.email || '',
          photoURL: u.photoURL || '',
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn('ensureUserDoc error', err);
    }
  };

  useEffect(() => {
    if (!me || !db) return;
    ensureUserDoc(me);
    const coll = collection(db, 'chats');
    const q = query(coll, where('participants', 'array-contains', me.uid), orderBy('lastUpdated', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((docSnap) => {
        arr.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMyChats(arr);
    }, (err) => {
      console.error('chats onSnapshot error', err);
    });

    return () => unsub();
  }, [me]);

  useEffect(() => {
    if (!db) return;
    const presRef = collection(db, 'presence');
    const unsub = onSnapshot(presRef, (snap) => {
      let map = {};
      snap.forEach(doc => { map[doc.id] = doc.data(); });
      setAllPresence(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeChat || !db) {
      setMessages([]);
      return;
    }
    const msgsColl = collection(db, `chats/${activeChat.id}/messages`);
    const q = query(msgsColl, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(s => arr.push({ id: s.id, ...s.data() }));

      // Логика для уведомления о новом сообщении
      if (arr.length > 0) {
        const latestMessage = arr[arr.length - 1];
        const otherUserMeta = getOtherParticipantMeta(activeChat);
        if (latestMessage.senderId !== me.uid) {
          toast.info(`${otherUserMeta.displayName}: ${latestMessage.text || 'Вложение'}`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          });
        }
      }

      setMessages(arr);
      
      setTimeout(() => {
        const el = document.querySelector('.messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }, (err) => {
      console.error('messages onSnapshot error', err);
    });

    return () => unsub();
  }, [activeChat, me.uid]);

  useEffect(() => {
    if (!db) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search || search.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      const qStr = search.trim();
      try {
        const results = [];
        if (qStr.includes('@')) {
          const qEmail = query(collection(db, 'users'), where('email', '==', qStr), limit(10));
          const snap = await getDocs(qEmail);
          snap.forEach(s => results.push({ id: s.id, ...s.data() }));
        }
        const usersColl = collection(db, 'users');
        const nameQuery = query(usersColl, orderBy('displayName'), startAt(qStr), endAt(qStr + '\uf8ff'), limit(10));
        const snap2 = await getDocs(nameQuery);
        snap2.forEach(s => {
          if (!results.find(r => r.uid === s.id)) results.push({ id: s.id, ...s.data() });
        });
        setSearchResults(results.slice(0, 10));
      } catch (err) {
        console.error('search error', err);
      }
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const openOrCreateChat = async (otherUser) => {
    if (!me || !otherUser || !db) return;
    if (otherUser.uid === me.uid) return;
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', otherUser.uid));
      const snap = await getDocs(q);
      let found = null;
      snap.forEach(d => {
        const data = d.data();
        const parts = data.participants || [];
        if (Array.isArray(parts) && parts.length === 2 && parts.includes(me.uid) && parts.includes(otherUser.uid)) {
          found = { id: d.id, ...data };
        }
      });

      if (found) {
        setActiveChat(found);
        return found;
      }

      const newChat = {
        participants: [me.uid, otherUser.uid],
        participantsMeta: {
          [me.uid]: { displayName: me.displayName || '', email: me.email || '', photoURL: me.photoURL || '' },
          [otherUser.uid]: { displayName: otherUser.displayName || '', email: otherUser.email || '', photoURL: otherUser.photoURL || '' }
        },
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        lastMessage: null
      };
      const docRef = await addDoc(collection(db, 'chats'), newChat);
      const chatObj = { id: docRef.id, ...newChat };
      setActiveChat(chatObj);
      return chatObj;
    } catch (err) {
      console.error('openOrCreateChat error', err);
    }
  };

  const handleSend = async () => {
    if (!me || !activeChat || (!text.trim() && (!fileRef.current || !fileRef.current.files[0]))) return;
    setSending(true);
    try {
      let mediaUrl = null;
      let mediaMeta = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const path = `chat_media/${activeChat.id}/${Date.now()}_${file.name}`;
        const sRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(sRef, file);
        await new Promise((res, rej) => {
          uploadTask.on('state_changed', null, (err) => rej(err), () => res());
        });
        mediaUrl = await getDownloadURL(sRef);
        mediaMeta = { name: file.name, size: file.size, type: file.type };
        fileRef.current.value = null;
      }

      const msgsColl = collection(db, `chats/${activeChat.id}/messages`);
      const msg = {
        senderId: me.uid,
        text: text.trim() || '',
        createdAt: serverTimestamp(),
        mediaUrl: mediaUrl || null,
        mediaMeta: mediaMeta || null,
        type: mediaUrl ? 'media' : 'text'
      };
      await addDoc(msgsColl, msg);

      const chatDoc = doc(db, 'chats', activeChat.id);
      await updateDoc(chatDoc, {
        lastMessage: msg.text ? msg.text : (mediaMeta?.name || 'Вложение'),
        lastUpdated: serverTimestamp()
      });

      setText('');
    } catch (err) {
      console.error('send error', err);
      alert('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipantMeta = (chat) => {
    if (!chat || !me) return { displayName: 'Чат', photoURL: '' };
    const partsMeta = chat.participantsMeta || {};
    const otherUid = (chat.participants || []).find(p => p !== me.uid);
    if (otherUid) {
      const meta = partsMeta[otherUid] || {};
      return { displayName: meta.displayName || meta.email || 'Пользователь', photoURL: meta.photoURL || '', uid: otherUid };
    }
    return { displayName: 'Чат', photoURL: '' };
  };

  return (
    <div className="chat-page">
      <ToastContainer position="top-right" />
      <div className="chat-left">
        <div className="auth-area">
          <div className="me">
            <img src={me?.photoURL || '/default-avatar.png'} alt="me" />
            <div>
              <div className="name">{me?.displayName || 'Я'}</div>
              <div className="email">{me?.email}</div>
            </div>
          </div>
        </div>

        <div className="search-area">
          <input
            placeholder="Найти пользователя (email или имя)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="search-results">
            {searchResults.length === 0 && search.trim() !== '' && <div className="no-results">Ничего не найдено</div>}
            {searchResults.map(u => (
              <div key={u.uid || u.id} className="search-item" onClick={() => openOrCreateChat(u)}>
                <img src={u.photoURL || '/default-avatar.png'} alt={u.displayName || u.email} />
                <div className="meta">
                  <div className="name">{u.displayName || 'Без имени'}</div>
                  <div className="email">{u.email || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chats-section">
          <h4>Чаты</h4>
          <div className="chat-list">
            {myChats.length === 0 && <div className="no-chats">Нет чатов</div>}
            {myChats.map(c => {
              const other = getOtherParticipantMeta(c);
              const otherPresence = allPresence[other.uid];
              return (
                <div
                  key={c.id}
                  className={`chat-row ${activeChat?.id === c.id ? 'active' : ''}`}
                  onClick={() => setActiveChat(c)}
                >
                  <div className="avatar-wrapper">
                    {other.photoURL ? (
                      <div className="presence-container">
                        <img src={other.photoURL} alt="" />
                        <div className={`presence ${computeOnline(otherPresence) ? 'online' : 'offline'}`}></div>
                      </div>
                    ) : (
                      <div className="avatar-placeholder">{(other.displayName || 'U').slice(0, 1)}</div>
                    )}
                  </div>
                  <div className="center">
                    <div className="title">{other.displayName || other.email}</div>
                    <div className="last">{c.lastMessage || 'Нет сообщений'}</div>
                  </div>
                  <div className="right">{c.lastUpdated ? (new Date(c.lastUpdated.seconds * 1000)).toLocaleString() : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chat-right">
        {!activeChat ? (
          <div className="placeholder">Выберите чат или найдите пользователя</div>
        ) : (
          <div className="chat-window">
            <div className="chat-window-header">
              <div className="header-info">
                <img src={getOtherParticipantMeta(activeChat).photoURL || '/default-avatar.png'} alt="" />
                <div>
                  <div className="title">{getOtherParticipantMeta(activeChat).displayName}</div>
                  <div className="subtitle">{computeOnline(allPresence[getOtherParticipantMeta(activeChat).uid]) ? 'Онлайн' : 'Был(а):недавно'}</div>
                </div>
              </div>
            </div>

            <div className="messages-area">
              {messages.map(m => (
                <div key={m.id} className={`message ${m.senderId === me.uid ? 'mine' : 'their'}`}>
                  <div>{m.text}</div>
                  {m.mediaUrl && (
                    <div className="message-media">
                      {m.mediaMeta?.type?.startsWith('image') ? (
                        <img src={m.mediaUrl} alt={m.mediaMeta?.name} />
                      ) : (
                        <a href={m.mediaUrl} target="_blank" rel="noreferrer noopener">{m.mediaMeta?.name || 'Файл'}</a>
                      )}
                    </div>
                  )}
                  <div className="meta">
                    <small>{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : ''}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="composer">
              <input
                type="text"
                placeholder="Написать сообщение..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              />
              <input type="file" ref={fileRef} />
              <button onClick={handleSend} disabled={sending}>{sending ? 'Отправка...' : 'Отправить'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}