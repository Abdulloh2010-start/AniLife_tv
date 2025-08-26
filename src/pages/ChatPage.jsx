import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import '../styles/chatpage.scss';
import { db, storage } from '../firebase.config';
import { collection, query, where, orderBy, startAt, endAt, limit, getDocs, addDoc, serverTimestamp, onSnapshot, doc, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Helmet } from '@dr.pogodin/react-helmet';

export default function ChatPage() {
  const navigate = useNavigate();
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
  const textInputRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const EMOJIS = ['😀','😂','😍','👍','🔥','🎉','😢','🙌','🤘','🥳'];

  const ensureUserDoc = async (u) => {
    if (!u?.uid || !db) return;
    const userDocRef = doc(db, 'users', u.uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      await setDoc(userDocRef, { uid: u.uid, displayName: u.displayName || '', email: u.email || '', photoURL: u.photoURL || '', createdAt: serverTimestamp() });
    }
  };

  useEffect(() => {
    if (!me || !db) return;
    ensureUserDoc(me);
    const coll = collection(db, 'chats');
    const q = query(coll, where('participants', 'array-contains', me.uid), orderBy('lastUpdated', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(s => arr.push({ id: s.id, ...s.data() }));
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
      const map = {};
      snap.forEach(d => map[d.id] = d.data());
      setAllPresence(map);
    }, (err) => {
      console.error('presence onSnapshot error', err);
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
      setMessages(arr);
      setTimeout(() => {
        const el = document.querySelector('.messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }, (err) => {
      console.error('messages onSnapshot error', err);
    });
    return () => unsub();
  }, [activeChat?.id]);

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
        const usersColl = collection(db, 'users');
        const qEmailPrefix = query(usersColl, orderBy('email'), startAt(qStr), endAt(qStr + '\uf8ff'), limit(10));
        const snapEmail = await getDocs(qEmailPrefix);
        snapEmail.forEach(s => results.push({ id: s.id, ...s.data() }));
        const nameQuery = query(usersColl, orderBy('displayName'), startAt(qStr), endAt(qStr + '\uf8ff'), limit(10));
        const snap2 = await getDocs(nameQuery);
        snap2.forEach(s => { if (!results.find(r => r.id === s.id)) results.push({ id: s.id, ...s.data() }); });
        setSearchResults(results.slice(0, 10));
      } catch (err) {
        console.error('search error', err);
      }
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const openOrCreateChat = async (otherUser) => {
    if (!me || !otherUser || !db) return;
    const otherUid = otherUser.uid || otherUser.id;
    if (otherUid === me.uid) return;
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', otherUid));
      const snap = await getDocs(q);
      let found = null;
      snap.forEach(d => {
        const data = d.data();
        const parts = data.participants || [];
        if (Array.isArray(parts) && parts.length === 2 && parts.includes(me.uid) && parts.includes(otherUid)) found = { id: d.id, ...data };
      });
      if (found) {
        setActiveChat(found);
        return found;
      }
      const newChat = {
        participants: [me.uid, otherUid],
        participantsMeta: { [me.uid]: { displayName: me.displayName || '', email: me.email || '', photoURL: me.photoURL || '' }, [otherUid]: { displayName: otherUser.displayName || otherUser.display_name || '', email: otherUser.email || '', photoURL: otherUser.photoURL || '' } },
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        lastMessage: null,
        lastMessageSender: null
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
        await new Promise((res, rej) => uploadTask.on('state_changed', null, (err) => rej(err), () => res()));
        mediaUrl = await getDownloadURL(storageRef(storage, path));
        mediaMeta = { name: file.name, size: file.size, type: file.type };
        fileRef.current.value = null;
      }
      const msgsColl = collection(db, `chats/${activeChat.id}/messages`);
      const msg = { senderId: me.uid, text: text.trim() || '', createdAt: serverTimestamp(), mediaUrl: mediaUrl || null, mediaMeta: mediaMeta || null, type: mediaUrl ? 'media' : 'text' };
      await addDoc(msgsColl, msg);
      const chatDoc = doc(db, 'chats', activeChat.id);
      await updateDoc(chatDoc, { lastMessage: msg.text ? msg.text : (mediaMeta?.name || 'Вложение'), lastUpdated: serverTimestamp(), lastMessageSender: me.uid });
      setText('');
      setShowEmoji(false);
    } catch (err) {
      console.error('send error', err);
      alert('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const editMessage = async (msgId) => {
    if (!activeChat) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const msgDoc = doc(db, `chats/${activeChat.id}/messages`, msgId);
    await updateDoc(msgDoc, { text: trimmed, edited: true, editedAt: serverTimestamp() });
    setEditingMessageId(null);
    setEditingText('');
  };

  const removeMessage = async (msgId) => {
    if (!activeChat) return;
    const msgDoc = doc(db, `chats/${activeChat.id}/messages`, msgId);
    await deleteDoc(msgDoc);
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

  const computeOnline = (presence) => {
    if (!presence) return false;
    if (presence.state === 'online') return true;
    if (presence.lastSeen && presence.lastSeen.seconds) {
      const diff = Date.now() - presence.lastSeen.seconds * 1000;
      return diff < 60000;
    }
    return false;
  };

  const lastSeenText = (presence) => {
    if (!presence) return 'Был(а): недавно';
    if (presence.state === 'online') return 'Онлайн';
    if (presence.lastSeen && presence.lastSeen.seconds) {
      const d = new Date(presence.lastSeen.seconds * 1000);
      const diff = Date.now() - d.getTime();
      if (diff < 60000) return 'только что';
      if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
      if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';
      return d.toLocaleString();
    }
    return 'Был(а): недавно';
  };

  const slugify = (s) => {
    if (!s) return 'user';
    return s.toString().toLowerCase().trim().replace(/[^a-z0-9а-яёё]+/g,'-').replace(/^-+|-+$/g,'');
  };

  const openProfile = (userObj) => {
    if (!userObj) return;
    const uid = typeof userObj === 'string' ? userObj : (userObj.uid || userObj.id);
    if (!uid) return;
    const name = typeof userObj === 'string' ? '' : (userObj.displayName || userObj.email || 'user');
    const slug = slugify(name);
    navigate(`/profile/${slug}~${uid}`);
  };

  const handleEmojiClick = (emoji) => {
    const input = textInputRef.current;
    if (!input) {
      setText((t) => t + emoji);
      return;
    }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      input.focus();
      const pos = start + emoji.length;
      input.selectionStart = input.selectionEnd = pos;
    }, 0);
  };

  return (
    <div className="chat-page">
      <Helmet>
        <title>Чаты - AniLifeTv</title>
        <meta name="description" content="Общайтесь с другими пользователями AniLifeTV в личных чатах." />
        <link rel="canonical" href={window.location.href} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Чат - AniLifeTv" />
        <meta property="og:description" content="Общайтесь с другими пользователями AniLifeTV в личных чатах." />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <div className="chat-left">
        <div className="auth-area">
          <div className="me">
            <img src={me?.photoURL || '/default-avatar.png'} alt="me" onClick={() => openProfile(me)} />
            <div>
              <div className="name">{me?.displayName || 'Я'}</div>
              <div className="email">{me?.email}</div>
            </div>
          </div>
        </div>

        <div className="search-area">
          <input placeholder="Найти пользователя (email или имя)..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              const time = c.lastUpdated ? (c.lastUpdated.seconds ? new Date(c.lastUpdated.seconds * 1000).toLocaleString() : '') : '';
              return (
                <div key={c.id} className={`chat-row ${activeChat?.id === c.id ? 'active' : ''}`} onClick={() => setActiveChat(c)}>
                  <div className="avatar-wrapper">
                    {other.photoURL ? (
                      <div className="presence-container">
                        <img src={other.photoURL} alt="" onClick={(e)=>{ e.stopPropagation(); openProfile(other); }} />
                        <div className={`presence ${computeOnline(otherPresence) ? 'online' : 'offline'}`}></div>
                      </div>
                    ) : (
                      <div className="avatar-placeholder" onClick={(e)=>{ e.stopPropagation(); openProfile(other); }}>{(other.displayName || 'U').slice(0, 1)}</div>
                    )}
                  </div>
                  <div className="center">
                    <div className="title">{other.displayName || other.email}</div>
                    <div className="last">{c.lastMessage || 'Нет сообщений'}</div>
                  </div>
                  <div className="right">{time}</div>
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
                <img src={getOtherParticipantMeta(activeChat).photoURL || '/default-avatar.png'} alt="" onClick={() => openProfile(getOtherParticipantMeta(activeChat))} />
                <div>
                  <div className="title" onClick={() => openProfile(getOtherParticipantMeta(activeChat))}>{getOtherParticipantMeta(activeChat).displayName}</div>
                  <div className="subtitle">{lastSeenText(allPresence[getOtherParticipantMeta(activeChat).uid])}</div>
                </div>
              </div>
            </div>

            <div className="messages-area">
              {messages.map(m => (
                <div key={m.id} className={`message ${m.senderId === me.uid ? 'mine' : 'their'}`}>
                  {editingMessageId === m.id ? (
                    <div>
                      <input value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                      <div className='edit-panel'>
                        <button className='btn-save' onClick={() => editMessage(m.id)}>Сохранить</button>
                        <button className='btn-cancel' onClick={() => { setEditingMessageId(null); setEditingText(''); }}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div>
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
                    </div>
                  )}
                  <div className="meta">
                    <small>{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : ''}{m.edited ? ' • отредактировано' : ''}</small>
                    {m.senderId === me.uid && editingMessageId !== m.id && (
                      <div className='eeedit'>
                        <button className='btn-edit' onClick={() => { setEditingMessageId(m.id); setEditingText(m.text || ''); }}>Изменить</button>
                        <button className='btn-delete' onClick={() => removeMessage(m.id)}>Удалить</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="composer">
              <div className='emoji'>
                <button className="emoji-btn" onClick={() => setShowEmoji(s => !s)}>😊</button>
                {showEmoji && (
                  <div className="emoji-panel">
                    {EMOJIS.map(e => <button key={e} onClick={() => handleEmojiClick(e)} className="emoji-item">{e}</button>)}
                  </div>
                )}
                <input id='textinp' ref={textInputRef} type="text" placeholder="Написать сообщение..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }} />
              </div>
              <button onClick={handleSend} disabled={sending}>{sending ? 'Отправка...' : 'Отправить'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}