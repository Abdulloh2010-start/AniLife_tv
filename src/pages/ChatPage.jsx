import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  getDoc,
  deleteDoc
} from 'firebase/firestore';
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
  const [playingPreview, setPlayingPreview] = useState(null);

  const fileRef = useRef(null);
  const searchTimer = useRef(null);
  const textInputRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const longPressTimer = useRef(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [openActionMenuFor, setOpenActionMenuFor] = useState(null);
  const [actionMenuPos, setActionMenuPos] = useState({ left: 12, top: 12 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const EMOJIS = ['😀','😂','😍','👍','🔥','🎉','😢','🙌','🤘','🥳'];

  useEffect(() => {
    const onRes = () => setIsMobile(window.innerWidth <= 768);
    onRes();
    window.addEventListener('resize', onRes);
    return () => window.removeEventListener('resize', onRes);
  }, []);

  const ensureUserDoc = async (u) => {
    if (!u?.uid || !db) return;
    const userDocRef = doc(db,'users',u.uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      await setDoc(userDocRef,{ uid:u.uid, displayName:u.displayName||'', email:u.email||'', photoURL:u.photoURL||'', createdAt:serverTimestamp() });
    }
  };

  useEffect(() => {
    if (!me || !db) return;
    ensureUserDoc(me);
    const coll = collection(db,'chats');
    const q = query(coll, where('participants','array-contains',me.uid), orderBy('lastUpdated','desc'));
    const unsub = onSnapshot(q,(snap) => {
      const arr = [];
      snap.forEach((s) => arr.push({ id:s.id, ...s.data() }));
      setMyChats(arr);
    }, (err) => console.error('chats onSnapshot error',err));
    return () => unsub();
  }, [me]);

  useEffect(() => {
    if (!db) return;
    const presRef = collection(db,'presence');
    const unsub = onSnapshot(presRef,(snap) => {
      const map = {};
      snap.forEach((d) => (map[d.id] = d.data()));
      setAllPresence(map);
    }, (err) => console.error('presence onSnapshot error',err));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeChat || !db) {
      setMessages([]);
      return;
    }
    const msgsColl = collection(db, `chats/${activeChat.id}/messages`);
    const q = query(msgsColl, orderBy('createdAt','asc'));
    const unsub = onSnapshot(q,(snap) => {
      const arr = [];
      snap.forEach((s) => arr.push({ id:s.id, ...s.data() }));
      setMessages(arr);
      setTimeout(() => {
        const el = messagesAreaRef.current || document.querySelector('.messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      },50);
      checkAndFillPreviews(arr);
    }, (err) => console.error('messages onSnapshot error',err));
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
        const usersColl = collection(db,'users');
        const qEmailPrefix = query(usersColl, orderBy('email'), startAt(qStr), endAt(qStr + '\uf8ff'), limit(10));
        const snapEmail = await getDocs(qEmailPrefix);
        snapEmail.forEach((s) => results.push({ id:s.id, uid:s.id, ...s.data() }));
        const nameQuery = query(usersColl, orderBy('displayName'), startAt(qStr), endAt(qStr + '\uf8ff'), limit(10));
        const snap2 = await getDocs(nameQuery);
        snap2.forEach((s) => { if (!results.find((r) => r.uid === s.id)) results.push({ id:s.id, uid:s.id, ...s.data() }); });
        setSearchResults(results.slice(0,10));
      } catch (err) {
        console.error('search error',err);
      }
    },300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const openOrCreateChat = async (otherUser) => {
    if (!me || !otherUser || !db) return;
    const otherUid = otherUser.uid || otherUser.id;
    if (otherUid === me.uid) return;
    try {
      const chatsRef = collection(db,'chats');
      const q = query(chatsRef, where('participants','array-contains',otherUid));
      const snap = await getDocs(q);
      let found = null;
      snap.forEach((d) => {
        const data = d.data();
        const parts = data.participants || [];
        if (Array.isArray(parts) && parts.length === 2 && parts.includes(me.uid) && parts.includes(otherUid)) found = { id:d.id, ...data };
      });
      if (found) {
        setActiveChat(found);
        setSearch('');
        return found;
      }
      const newChat = {
        participants:[me.uid, otherUid],
        participantsMeta:{
          [me.uid]:{ displayName:me.displayName||'', email:me.email||'', photoURL:me.photoURL||'' },
          [otherUid]:{ displayName:otherUser.displayName||otherUser.display_name||'', email:otherUser.email||'', photoURL:otherUser.photoURL||'' }
        },
        createdAt:serverTimestamp(),
        lastUpdated:serverTimestamp(),
        lastMessage:null,
        lastMessageSender:null
      };
      const docRef = await addDoc(collection(db,'chats'), newChat);
      const chatObj = { id:docRef.id, ...newChat };
      setActiveChat(chatObj);
      setSearch('');
      return chatObj;
    } catch (err) {
      console.error('openOrCreateChat error',err);
    }
  };

  const deleteChat = async (chatId) => {
    if (!chatId) return;
    try {
      const msgsColl = collection(db, `chats/${chatId}/messages`);
      const snap = await getDocs(msgsColl);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, `chats/${chatId}/messages`, d.id));
      }
      await deleteDoc(doc(db,'chats',chatId));
      if (activeChat?.id === chatId) setActiveChat(null);
    } catch (err) {
      console.error('deleteChat error',err);
      alert('Ошибка при удалении чата');
    }
  };

  const urlRegex = /https?:\/\/[^\s]+/gi;

  const extractUrls = (text) => {
    if (!text) return [];
    return text.match(urlRegex) || [];
  };

  const getYouTubeId = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || (u.pathname.includes('shorts') ? u.pathname.split('/').pop() : null);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      return null;
    } catch {
      return null;
    }
  };

  const fetchYouTubeOEmbed = async (url) => {
    try {
      const oe = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oe);
      if (!res.ok) return null;
      const j = await res.json();
      return { title:j.title||'', description:j.author_name||'', image:j.thumbnail_url||'', url, isYouTube:true };
    } catch {
      return null;
    }
  };

  const fetchHtmlPreview = async (url) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { method:'GET', headers:{ 'User-Agent':'Mozilla/5.0' }, signal:controller.signal, redirect:'follow' });
      clearTimeout(id);
      if (!res.ok) return null;
      const txt = await res.text();
      const ogTitle = (txt.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || [])[1];
      const titleTag = (txt.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1];
      const ogDesc = (txt.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || [])[1] || (txt.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || [])[1];
      const ogImg = (txt.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1];
      return { title:ogTitle || titleTag || null, description:ogDesc || '', image:ogImg || null, url, isYouTube:false };
    } catch {
      return null;
    }
  };

  const domainFavicon = (url) => {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?sz=128&domain=${u.hostname}`;
    } catch {
      return null;
    }
  };

  const getLinkPreview = async (text) => {
    const urls = extractUrls(text);
    if (urls.length === 0) return null;
    const first = urls[0];
    const ytId = getYouTubeId(first);
    if (ytId) {
      const oe = await fetchYouTubeOEmbed(first);
      if (oe) return oe;
      return { title:'YouTube видео', description:'', image:`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, url:first, isYouTube:true };
    }
    const htmlPreview = await fetchHtmlPreview(first);
    if (htmlPreview) return htmlPreview;
    const fav = domainFavicon(first);
    return { title:first, description:'', image:fav, url:first, isYouTube:false };
  };

  const checkAndFillPreviews = async (msgs) => {
    if (!db || !activeChat) return;
    try {
      for (const m of msgs) {
        if (!m.preview && m.text && extractUrls(m.text).length > 0) {
          const prev = await getLinkPreview(m.text);
          if (prev) {
            const msgDoc = doc(db, `chats/${activeChat.id}/messages`, m.id);
            await updateDoc(msgDoc, { preview:prev });
          }
        }
      }
    } catch (e) {
      console.error('fill preview error',e);
    }
  };

  const sendNewMessage = async (txt) => {
    if (!me || !activeChat) return;
    const prevText = txt || '';
    setSending(true);
    try {
      let mediaUrl = null;
      let mediaMeta = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const path = `chat_media/${activeChat.id}/${Date.now()}_${file.name}`;
        const sRef = storageRef(storage,path);
        const uploadTask = uploadBytesResumable(sRef,file);
        await new Promise((res, rej) => uploadTask.on('state_changed', null, (err) => rej(err), () => res()));
        mediaUrl = await getDownloadURL(storageRef(storage,path));
        mediaMeta = { name:file.name, size:file.size, type:file.type };
        fileRef.current.value = null;
      }
      let preview = null;
      const urls = extractUrls(prevText.trim());
      if (urls.length > 0) preview = await getLinkPreview(prevText.trim());
      const msgsColl = collection(db, `chats/${activeChat.id}/messages`);
      const msg = { senderId:me.uid, text:prevText.trim()||'', createdAt:serverTimestamp(), mediaUrl:mediaUrl||null, mediaMeta:mediaMeta||null, type:mediaUrl ? 'media' : 'text', preview:preview||null };
      await addDoc(msgsColl,msg);
      const chatDoc = doc(db,'chats',activeChat.id);
      await updateDoc(chatDoc, { lastMessage: msg.text ? msg.text : (mediaMeta?.name || (preview?.title || 'Вложение')), lastUpdated:serverTimestamp(), lastMessageSender:me.uid });
      setTimeout(() => {
        const el = messagesAreaRef.current || document.querySelector('.messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      },50);
    } catch (err) {
      console.error('send error',err);
      alert('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const saveEditedMessage = async (msgId, newText) => {
    if (!activeChat || !msgId) return;
    try {
      const urls = extractUrls(newText || '');
      const preview = urls.length > 0 ? await getLinkPreview(newText) : null;
      const msgDoc = doc(db, `chats/${activeChat.id}/messages`, msgId);
      await updateDoc(msgDoc, { text:newText.trim(), edited:true, editedAt:serverTimestamp(), preview:preview||null });
      setEditingMessageId(null);
      setText('');
    } catch (err) {
      console.error('edit error',err);
      alert('Ошибка при редактировании');
    }
  };

  const removeMessage = async (msgId) => {
    if (!activeChat) return;
    const msgDoc = doc(db, `chats/${activeChat.id}/messages`, msgId);
    await deleteDoc(msgDoc);
    setOpenActionMenuFor(null);
  };

  const getOtherParticipantMeta = (chat) => {
    if (!chat || !me) return { displayName:'Чат', photoURL:'' };
    const partsMeta = chat.participantsMeta || {};
    const otherUid = (chat.participants || []).find((p) => p !== me.uid);
    if (otherUid) {
      const meta = partsMeta[otherUid] || {};
      return { displayName:meta.displayName || meta.email || 'Пользователь', photoURL:meta.photoURL||'', uid:otherUid };
    }
    return { displayName:'Чат', photoURL:'' };
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
    const uid = typeof userObj === 'string' ? userObj : userObj.uid || userObj.id;
    if (!uid) return;
    const name = typeof userObj === 'string' ? '' : userObj.displayName || userObj.email || 'user';
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
    const newText = text.slice(0,start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      input.focus();
      const pos = start + emoji.length;
      input.selectionStart = input.selectionEnd = pos;
    },0);
  };

  const computeMenuPosition = (x,y) => {
    const menuW = 200;
    const menuH = 180;
    const pad = 12;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    let left = x + 6;
    let top = y + 6;
    if (left + menuW + pad > winW) left = Math.max(pad, x - menuW - 6);
    if (top + menuH + pad > winH) top = Math.max(pad, winH - menuH - pad);
    left = Math.max(pad, left);
    top = Math.max(pad, top);
    return { left, top };
  };

  const onMessageContext = (e,m) => {
    if (!m || m.senderId !== me?.uid) return;
    e.preventDefault();
    const x = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || window.innerWidth / 2;
    const y = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || window.innerHeight / 2;
    const pos = computeMenuPosition(x,y);
    setActionMenuPos(pos);
    setOpenActionMenuFor(m.id);
  };

  const onMessageTouchStart = (e,m) => {
    if (!m || m.senderId !== me?.uid) return;
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches && e.touches[0];
      const x = touch ? touch.clientX : window.innerWidth / 2;
      const y = touch ? touch.clientY : window.innerHeight - 160;
      const pos = computeMenuPosition(x,y);
      setActionMenuPos(pos);
      setOpenActionMenuFor(m.id);
    },600);
  };

  const onMessageTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleComposerSubmit = async () => {
    if (editingMessageId) {
      await saveEditedMessage(editingMessageId, text);
      setEditingMessageId(null);
      setText('');
      setOpenActionMenuFor(null);
      return;
    }
    if (!text.trim() && !(fileRef.current && fileRef.current.files[0])) return;
    await sendNewMessage(text);
    setText('');
  };

  const startEditIncoming = (msgId, originalText) => {
    setEditingMessageId(msgId);
    setText(originalText || '');
    setOpenActionMenuFor(null);
    setTimeout(() => textInputRef.current && textInputRef.current.focus(),60);
  };

  const renderTextWithLinks = (t, previewUrl) => {
    if (!t) return '';
    const parts = t.split(urlRegex);
    const urls = t.match(urlRegex) || [];
    const nodes = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) nodes.push(parts[i]);
      if (urls[i]) {
        const u = urls[i];
        if (previewUrl && previewUrl === u) continue;
        nodes.push(<a key={i} href={u} target="_blank" rel="noreferrer noopener">{u}</a>);
      }
    }
    return nodes;
  };

  const renderPreview = (m) => {
    if (!m.preview) return null;
    const p = m.preview;
    if (p.isYouTube) {
      const ytId = getYouTubeId(p.url);
      if (playingPreview === m.id) {
        return (
          <div className="link-preview youtube playing">
            <div className="yt-iframe-wrap">
              <iframe title={p.title || 'youtube'} src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
            </div>
            <div className="lp-meta">
              <div className="lp-title">{p.title}</div>
              {p.description && <div className="lp-desc">{p.description}</div>}
              <div className="lp-domain">{(() => { try { return new URL(p.url).hostname.replace('www.',''); } catch { return ''; } })()}</div>
            </div>
          </div>
        );
      }
      return (
        <div className="link-preview youtube" onClick={() => setPlayingPreview(m.id)}>
          <div className="lp-meta">
            <div className="lp-title">{p.title}</div>
            {p.description && <div className="lp-desc">{p.description}</div>}
            <div className="lp-domain">{(() => { try { return new URL(p.url).hostname.replace('www.',''); } catch { return ''; } })()}</div>
          </div>
          <div className="yt-thumb" style={{ backgroundImage: `url(${p.image})` }}>
            <div className="yt-overlay">
              <svg viewBox="0 0 24 24" className="yt-play"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </div>
      );
    }
    return (
      <a className="link-preview site" href={p.url} target="_blank" rel="noreferrer noopener">
        <div className="site-thumb">
          {p.image ? <img src={p.image} alt={p.title || p.url} /> : <div className="lp-noimage"></div>}
        </div>
        <div className="lp-meta">
          <div className="lp-title">{p.title || p.url}</div>
          {p.description && <div className="lp-desc">{p.description}</div>}
          <div className="lp-domain">{(() => { try { return new URL(p.url).hostname.replace('www.',''); } catch { return ''; } })()}</div>
        </div>
      </a>
    );
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

      {!isMobile && (
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
              {searchResults.map((u) => (
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
              {myChats.map((c) => {
                const other = getOtherParticipantMeta(c);
                const otherPresence = allPresence[other.uid];
                const time = c.lastUpdated ? (c.lastUpdated.seconds ? new Date(c.lastUpdated.seconds * 1000).toLocaleString() : '') : '';
                return (
                  <div key={c.id} className={`chat-row ${activeChat?.id === c.id ? 'active' : ''}`} onClick={() => setActiveChat(c)}>
                    <div className="avatar-wrapper">
                      {other.photoURL ? (
                        <div className="presence-container">
                          <img src={other.photoURL} alt="" onClick={(e) => { e.stopPropagation(); openProfile(other); }} />
                          <div className={`presence ${computeOnline(otherPresence) ? 'online' : 'offline'}`}></div>
                        </div>
                      ) : (
                        <div className="avatar-placeholder" onClick={(e) => { e.stopPropagation(); openProfile(other); }}>{(other.displayName || 'U').slice(0,1)}</div>
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
      )}

      {isMobile && !activeChat && (
        <div className="chat-left mobile-pane">
          <div className="top-row">
            <div className="me-compact" onClick={() => openProfile(me)}>
              <img src={me?.photoURL || '/default-avatar.png'} alt="me" />
            </div>
            <div className="search-wrap">
              <input placeholder="Найти пользователя или чат..." value={search} id="inputchange" onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results mobile-search-results">
              {searchResults.map((u) => (
                <div key={u.uid || u.id} className="search-item" onClick={async () => { await openOrCreateChat(u); document.activeElement instanceof HTMLElement && document.activeElement.blur(); if (isMobile) window.scrollTo(0,0); }}>
                  <img src={u.photoURL || '/default-avatar.png'} alt={u.displayName || u.email} />
                  <div className="meta">
                    <div className="name">{u.displayName || 'Без имени'}</div>
                    <div className="email">{u.email || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="chat-list">
            {myChats.length === 0 && <div className="no-chats">Нет чатов</div>}
            {myChats.map((c) => {
              const other = getOtherParticipantMeta(c);
              const otherPresence = allPresence[other.uid];
              const time = c.lastUpdated ? (c.lastUpdated.seconds ? new Date(c.lastUpdated.seconds * 1000).toLocaleTimeString() : '') : '';
              return (
                <div key={c.id} className={`chat-row ${activeChat?.id === c.id ? 'active' : ''}`} onClick={() => { setActiveChat(c); setSearch(''); document.activeElement instanceof HTMLElement && document.activeElement.blur(); window.scrollTo(0,0); }}>
                  <div className="avatar-wrapper">
                    {other.photoURL ? (
                      <div className="presence-container">
                        <img src={other.photoURL} alt="" onClick={(e) => { e.stopPropagation(); openProfile(other); }} />
                        <div className={`presence ${computeOnline(otherPresence) ? 'online' : 'offline'}`}></div>
                      </div>
                    ) : (
                      <div className="avatar-placeholder" onClick={(e) => { e.stopPropagation(); openProfile(other); }}>{(other.displayName || 'U').slice(0,1)}</div>
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
      )}

      {(!isMobile || (isMobile && activeChat)) && (
        <div className="chat-right mobile-pane">
          {!activeChat ? (
            <div className="placeholder">Выберите чат или найдите пользователя</div>
          ) : (
            <div className="chat-window">
              <div className="chat-window-header">
                {isMobile && (
                  <button className="back-btn" onClick={() => { setActiveChat(null); setShowHeaderMenu(false); }}>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                )}

                <div className="header-info" onClick={() => openProfile(getOtherParticipantMeta(activeChat))}>
                  <img src={getOtherParticipantMeta(activeChat).photoURL || '/default-avatar.png'} alt="" />
                  <div>
                    <div className="title">{getOtherParticipantMeta(activeChat).displayName}</div>
                    <div className="subtitle">{lastSeenText(allPresence[getOtherParticipantMeta(activeChat).uid])}</div>
                  </div>
                </div>

                <div className="header-actions">
                  <button className="dots-btn" onClick={() => setShowHeaderMenu((s) => !s)}>⋯</button>
                  {showHeaderMenu && (
                    <div className="header-menu">
                      <button onClick={() => { setShowHeaderMenu(false); setShowDeleteConfirm(true); }}>Удалить</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="messages-area" ref={messagesAreaRef}>
                {messages.map((m) => {
                  const mine = m.senderId === me.uid;
                  return (
                    <div key={m.id} className={`message-row-wrapper ${mine ? 'mine-row' : 'their-row'}`} onContextMenu={(e) => onMessageContext(e,m)} onTouchStart={(e) => onMessageTouchStart(e,m)} onTouchEnd={onMessageTouchEnd} onTouchMove={onMessageTouchEnd}>
                      <div className={`message ${mine ? 'mine' : 'their'}`}>
                        <div className="message-row">
                          <div className="message-body">
                            <div className="message-text">{renderTextWithLinks(m.text, m.preview?.url)}</div>
                            {renderPreview(m)}
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
                        </div>

                        <div className="meta"><small>{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : ''}{m.edited ? ' • отредактировано' : ''}</small></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`composer ${isMobile ? 'composer-fixed' : ''} ${editingMessageId ? 'editing-mode' : ''}`}>
                {!isMobile && editingMessageId && (
                  <div className="editing-banner">
                    <div className="editing-text">Редактирование сообщения</div>
                    <button className="btn-cancel" onClick={() => { setEditingMessageId(null); setText(''); }}>Отменить</button>
                  </div>
                )}

                <button className="emoji-btn compact" onClick={() => setShowEmoji((s) => !s)}>😊</button>

                <div className="input-wrap">
                  <input id="textinp" ref={textInputRef} type="text" placeholder={editingMessageId && isMobile ? 'Редактирование...' : 'Написать сообщение...'} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleComposerSubmit(); }} />
                  {showEmoji && (
                    <div className="emoji-panel">
                      {EMOJIS.map((em) => <button key={em} onClick={() => handleEmojiClick(em)} className="emoji-item">{em}</button>)}
                    </div>
                  )}
                </div>

                <input ref={fileRef} type="file" style={{ display:'none' }} />

                <button className="send-btn" onClick={handleComposerSubmit} disabled={sending}>{editingMessageId ? 'Изменить' : (sending ? 'Отправка...' : 'Отправить')}</button>
              </div>

              {openActionMenuFor && (
                <div className={`action-menu ${isMobile ? 'action-sheet' : 'action-popover'}`} style={!isMobile ? { left:actionMenuPos.left, top:actionMenuPos.top } : {}}>
                  <button onClick={() => { const msg = messages.find((mm) => mm.id === openActionMenuFor); startEditIncoming(openActionMenuFor, msg?.text || ''); }}>Изменить</button>
                  <button onClick={() => { removeMessage(openActionMenuFor); setOpenActionMenuFor(null); }}>Удалить</button>
                  <button onClick={() => setOpenActionMenuFor(null)}>Отмена</button>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="modal-overlay">
                  <div className="modal-box">
                    <div className="modal-title">Удалить чат?</div>
                    <div className="modal-body">Вы действительно хотите удалить этот чат? Все сообщения будут удалены.</div>
                    <div className="modal-actions">
                      <button className="btn-delete" onClick={() => { setShowDeleteConfirm(false); deleteChat(activeChat.id); }}>Удалить</button>
                      <button className="btn-cancel-modal" onClick={() => setShowDeleteConfirm(false)}>Отмена</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}