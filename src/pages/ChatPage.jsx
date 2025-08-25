// src/pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import '../styles/chatpage.scss';

// firebase imports (modular)
import { db, storage } from '../firebase.config'; // <- убедись, что это экспортируется
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
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function ChatPage() {
  const { user } = useUser();
  const me = user;
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myChats, setMyChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { id, data }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const searchTimer = useRef(null);

  // helper: ensure user doc exists in `users` collection
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

  // subscribe chats where I'm participant
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

  // when activeChat changes, subscribe messages
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
      setMessages(arr);
      // scroll to bottom
      setTimeout(() => {
        const el = document.querySelector('.messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }, (err) => {
      console.error('messages onSnapshot error', err);
    });

    return () => unsub();
  }, [activeChat]);

  // search users (debounced)
  useEffect(() => {
    if (!db) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search || search.trim().length === 0) {
      // clear results if query empty
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      const q = search.trim();
      try {
        const results = [];
        // 1) exact email match
        if (q.includes('@')) {
          const qEmail = query(collection(db, 'users'), where('email', '==', q), limit(10));
          const snap = await getDocs(qEmail);
          snap.forEach(s => results.push({ id: s.id, ...s.data() }));
        }

        // 2) prefix search on displayName (case-sensitive depending on how you store names)
        //    uses startAt / endAt trick
        const usersColl = collection(db, 'users');
        const nameQuery = query(usersColl, orderBy('displayName'), startAt(q), endAt(q + '\uf8ff'), limit(10));
        const snap2 = await getDocs(nameQuery);
        snap2.forEach(s => {
          if (!results.find(r => r.uid === s.id)) results.push({ id: s.id, ...s.data() });
        });

        // limit and set
        setSearchResults(results.slice(0, 10));
      } catch (err) {
        console.error('search error', err);
      }
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // create or open chat between me and otherUser
  const openOrCreateChat = async (otherUser) => {
    if (!me || !otherUser || !db) return;
    // don't create chat with self
    if (otherUser.uid === me.uid) {
      // open existing personal chat maybe? for now do nothing
      return;
    }

    // 1) check if chat already exists: query chats where participants array-contains otherUser.uid,
    // then filter locally by checking both participants present
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', otherUser.uid));
      const snap = await getDocs(q);
      let found = null;
      snap.forEach(d => {
        const data = d.data();
        const parts = data.participants || [];
        // exact participants match (2-person chat)
        if (Array.isArray(parts) && parts.length === 2 && parts.includes(me.uid) && parts.includes(otherUser.uid)) {
          found = { id: d.id, ...data };
        }
      });

      if (found) {
        setActiveChat(found);
        return found;
      }

      // create new chat
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

  // send message (text + optional file)
  const handleSend = async () => {
    if (!me || !activeChat || (!text.trim() && (!fileRef.current || !fileRef.current.files[0]))) return;
    setSending(true);
    try {
      let mediaUrl = null;
      let mediaMeta = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        // upload
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

      // create message
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

      // update chat lastMessage
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

  // helper to get other participant meta for chat header
  const getOtherParticipantMeta = (chat) => {
    if (!chat || !me) return { displayName: 'Чат', photoURL: '' };
    const partsMeta = chat.participantsMeta || {};
    const otherUid = (chat.participants || []).find(p => p !== me.uid);
    if (otherUid) {
      const meta = partsMeta[otherUid] || {};
      return { displayName: meta.displayName || meta.email || 'Пользователь', photoURL: meta.photoURL || '' };
    }
    return { displayName: 'Чат', photoURL: '' };
  };

  return (
    <div className="chat-page">
      <div className="chat-left">
        <div className="auth-area">
          <div className="me">
            <img src={me?.photoURL || '/default-avatar.png'} alt="me" />
            <div>
              <div className="name">{me?.displayName || 'Я'}</div>
              <div className="email" style={{fontSize:12, color:'#666'}}>{me?.email}</div>
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
            {searchResults.length === 0 && search.trim() !== '' && <div style={{padding:10,color:'#666'}}>Ничего не найдено</div>}
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

        <div style={{marginTop:10}}>
          <h4>Чаты</h4>
          <div className="chat-list">
            {myChats.length === 0 && <div style={{color:'#777',padding:8}}>Нет чатов</div>}
            {myChats.map(c => {
              const other = getOtherParticipantMeta(c);
              return (
                <div
                  key={c.id}
                  className={`chat-row ${activeChat?.id === c.id ? 'active' : ''}`}
                  onClick={() => setActiveChat(c)}
                >
                  {other.photoURL ? <img src={other.photoURL} alt="" style={{width:44,height:44,borderRadius:8,objectFit:'cover'}} /> : <div className="avatar-placeholder">{(other.displayName||'U').slice(0,1)}</div>}
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
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <img src={getOtherParticipantMeta(activeChat).photoURL || '/default-avatar.png'} alt="" style={{width:44,height:44,borderRadius:8,objectFit:'cover'}}/>
                <div>
                  <div className="title">{getOtherParticipantMeta(activeChat).displayName}</div>
                </div>
              </div>
            </div>

            <div className="messages-area">
              {messages.map(m => (
                <div key={m.id} className={`message ${m.senderId === me.uid ? 'mine' : 'their'}`}>
                  <div>{m.text}</div>
                  {m.mediaUrl && (
                    <div style={{marginTop:8}}>
                      {/* show image or link */}
                      {m.mediaMeta?.type?.startsWith('image') ? (
                        <img src={m.mediaUrl} alt={m.mediaMeta?.name} style={{maxWidth:'100%', borderRadius:8}} />
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
