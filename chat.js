import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, updateDoc,
  serverTimestamp, query, orderBy, onSnapshot, where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyCfhn6-aFg9u_S93ioPLp6TSjjhnDveMfA",
  authDomain: "yoamigo-347fe.firebaseapp.com",
  projectId: "yoamigo-347fe",
  storageBucket: "yoamigo-347fe.appspot.com",
  messagingSenderId: "734605500408",
  appId: "1:734605500408:web:fa2e3966b3e8bc152a400d",
  measurementId: "G-61R9G9SFLV"
};
const app = initializeApp(cfg);
const auth = getAuth(app);
const db   = getFirestore(app);

const contactList = document.getElementById('contactList');
const userSearch  = document.getElementById('userSearch');
const addContactBtn = document.getElementById('addContactBtn');
const meAvatar = document.getElementById('meAvatar');
const meName   = document.getElementById('meName');
const meProfileBtn = document.getElementById('meProfileBtn');
const profileDrawer = document.getElementById('profileDrawer');
const profileAvatar = document.getElementById('profileAvatar');
const profileName   = document.getElementById('profileName');
const saveProfileBtn= document.getElementById('saveProfileBtn');
const closeProfileBtn= document.getElementById('closeProfileBtn');
const activeAvatar = document.getElementById('activeAvatar');
const activeName   = document.getElementById('activeName');
const feed = document.getElementById('chat-window');
const form = document.getElementById('chat-form');
const msg  = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const guestNotice = document.getElementById('guestNotice');
const reqBar   = document.getElementById('reqBar');
const reqCount = document.getElementById('reqCount');
const openReqBtn = document.getElementById('openReqBtn');
const reqDrawer  = document.getElementById('reqDrawer');
const reqList    = document.getElementById('reqList');
const closeReqBtn= document.getElementById('closeReqBtn');

let currentUser = null;
let activeContact = null;
let unsubscribeRoom = null;

onAuthStateChanged(auth, async (user)=>{
  if(!user){ location.href = './index.html'; return; }
  currentUser = user;
  await ensureUserDoc(user);
  await loadMeUI(user);
  await loadContacts();
  listenToIncomingRequests();
  if(user.isAnonymous){
    sendBtn.disabled = true; msg.disabled = true; guestNotice.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', ()=>signOut(auth));

function roomIdFor(uidA, uidB){ return [uidA, uidB].sort().join('_'); }

async function ensureUserDoc(user){
  const uref = doc(db,'users', user.uid);
  const snap = await getDoc(uref);
  if(!snap.exists()){
    const baseName = user.email ? user.email.split('@')[0] : `guest_${user.uid.slice(0,6)}`;
    await setDoc(uref, { username: baseName, photoURL: '', createdAt: Date.now() });
  }
}

async function loadMeUI(user){
  const snap = await getDoc(doc(db,'users', user.uid));
  const data = snap.data() || {};
  const uname = data.username || (user.email ? user.email.split('@')[0] : 'Me');
  meName.textContent = uname;
  const avatar = data.photoURL || 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=' + encodeURIComponent(uname);
  meAvatar.src = avatar; profileAvatar.src = avatar; profileName.value = uname;
}

async function loadContacts(){
  contactList.innerHTML='';
  const cref = collection(db,'contacts', currentUser.uid, 'list');
  const q = query(cref, orderBy('username'));
  onSnapshot(q,(snap)=>{
    contactList.innerHTML='';
    snap.forEach(d=>{
      const c = d.data();
      const li = document.createElement('li');
      const img = document.createElement('img'); img.src = c.photoURL || 'https://ui-avatars.com/api/?background=37474F&color=fff&name=' + encodeURIComponent(c.username||'U');
      const meta = document.createElement('div'); meta.className='meta';
      const name = document.createElement('div'); name.className='name'; name.textContent = c.username || 'User';
      const last = document.createElement('div'); last.className='last'; last.textContent = 'Tap to chat';
      meta.append(name,last);
      li.append(img, meta);
      li.addEventListener('click', ()=> openChatWith({ uid: d.id, username: c.username, photoURL: c.photoURL }));
      contactList.appendChild(li);
    });
  });
}

function openChatWith(contact){
  activeContact = contact;
  activeName.textContent = contact.username || 'User';
  activeAvatar.src = contact.photoURL || 'https://ui-avatars.com/api/?background=37474F&color=fff&name=' + encodeURIComponent(activeName.textContent);
  startRoomListener();
}

function startRoomListener(){
  if(!activeContact) return;
  if(unsubscribeRoom){ unsubscribeRoom(); unsubscribeRoom=null; }
  const roomId = roomIdFor(currentUser.uid, activeContact.uid);
  const mref = collection(db,'rooms', roomId, 'messages');
  const q = query(mref, orderBy('timestamp'));
  unsubscribeRoom = onSnapshot(q,(snap)=>{
    feed.innerHTML='';
    snap.forEach(d=> appendMessage(d.data()));
    feed.scrollTop = feed.scrollHeight;
  });
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!activeContact || currentUser.isAnonymous) return;
  const text = msg.value.trim(); if(!text) return;
  const roomId = roomIdFor(currentUser.uid, activeContact.uid);
  await addDoc(collection(db,'rooms', roomId, 'messages'), {
    text, senderUid: currentUser.uid,
    senderName: currentUser.email ? currentUser.email.split('@')[0] : 'user',
    timestamp: serverTimestamp()
  });
  msg.value='';
});

function appendMessage(m){
  const isMe = m.senderUid === currentUser.uid;
  const wrap = document.createElement('div');
  wrap.className = 'msg' + (isMe ? ' me-msg' : '');
  wrap.innerHTML = `${escapeHTML(m.text||'')}<span class="time">${formatTime(m.timestamp)}</span>`;
  feed.appendChild(wrap);
}

function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function formatTime(ts){ try{ return ts?.toDate?.().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) || ''; }catch{return ''} }

addContactBtn.addEventListener('click', async ()=>{
  const name = userSearch.value.trim().toLowerCase();
  if(!name) return;
  const ix = await getDoc(doc(db,'usernames', name));
  if(!ix.exists()){ alert('No user found for that username'); return; }
  const toUid = ix.data().uid;
  if(toUid === currentUser.uid) { alert('Cannot send request to yourself'); return; }
  const meSnap = await getDoc(doc(db,'users', currentUser.uid));
  const me = meSnap.data() || { username: 'me' };
  const themSnap = await getDoc(doc(db,'users', toUid));
  const them = themSnap.data() || { username: name };
  const existingFriend = await getDoc(doc(db,'contacts', currentUser.uid, 'list', toUid));
  if(existingFriend.exists()){ alert('Already in contacts'); userSearch.value=''; return; }
  await addDoc(collection(db,'friend_requests'), {
    fromUid: currentUser.uid, fromName: me.username || 'me', toUid,
    toName: them.username || name, status: 'pending', createdAt: serverTimestamp()
  });
  alert('Friend request sent');
  userSearch.value='';
});

function listenToIncomingRequests(){
  if(!currentUser) return;
  const qIn = query(collection(db,'friend_requests'), where('toUid','==',currentUser.uid), where('status','==','pending'));
  onSnapshot(qIn, (snap)=>{
    const n = snap.size;
    reqBar.style.display = n > 0 ? 'flex' : 'none';
    reqCount.textContent = `${n} friend request${n>1?'s':''}`;
    renderReqList(snap);
  }, (err)=>{ console.error("Request listener failed:", err); });
}

function renderReqList(snap){
  reqList.innerHTML = '';
  snap.forEach(d=>{
    const r = d.data(); const id = d.id;
    const item = document.createElement('div');
    item.className = 'req-item';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHTML(r.fromName||'user')}</strong> wants to connect`;
    const row = document.createElement('div');
    const acceptBtn = document.createElement('button');
    acceptBtn.className='btn tiny'; acceptBtn.textContent='Accept';
    acceptBtn.addEventListener('click', ()=>acceptRequest(id, r));
    const rejectBtn = document.createElement('button');
    rejectBtn.className='btn tiny'; rejectBtn.textContent='Reject';
    rejectBtn.style.marginLeft='8px';
    rejectBtn.addEventListener('click', ()=>rejectRequest(id));
    row.append(acceptBtn, rejectBtn);
    item.append(left, row);
    reqList.appendChild(item);
  });
}

async function acceptRequest(id, r){
  try{
    if(!r?.fromUid || !r?.toUid){ return alert('Invalid request data'); }
    if(r.toUid !== currentUser.uid){ return alert('Not authorized'); }
    const [fromSnap, toSnap] = await Promise.all([ getDoc(doc(db,'users', r.fromUid)), getDoc(doc(db,'users', r.toUid)) ]);
    const fromName = (fromSnap.data()?.username)|| r.fromName || 'user';
    const toName   = (toSnap.data()?.username)|| r.toName || 'user';
    await Promise.all([
      setDoc(doc(db,'contacts', r.fromUid, 'list', r.toUid), { username: toName, photoURL: '' }),
      setDoc(doc(db,'contacts', r.toUid, 'list', r.fromUid), { username: fromName, photoURL: '' })
    ]);
    await updateDoc(doc(db,'friend_requests', id), { status:'accepted' });
    alert('Friend added');
  }catch(e){ console.error('Accept Request Error:', e); alert(e.message); }
}

async function rejectRequest(id){
  try{
    await updateDoc(doc(db,'friend_requests', id), { status:'rejected' });
    alert('Request rejected');
  }catch(e){ console.error('Reject Request Error:', e); alert(e.message); }
}

openReqBtn?.addEventListener('click', ()=> reqDrawer.classList.remove('hidden'));
closeReqBtn?.addEventListener('click', ()=> reqDrawer.classList.add('hidden'));

meProfileBtn.addEventListener('click', ()=> profileDrawer.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', ()=> profileDrawer.classList.add('hidden'));
saveProfileBtn.addEventListener('click', async ()=>{
  const uname = profileName.value.trim();
  await setDoc(doc(db,'users', currentUser.uid), { username: uname }, { merge:true });
  await updateProfile(currentUser, { displayName: uname || null });
  await loadMeUI(currentUser);
  profileDrawer.classList.add('hidden');
});
