import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { uploadImageAndGetURL } from "./storage.js";

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

// UI refs
const contactList = document.getElementById('contactList');
const userSearch  = document.getElementById('userSearch');
const addContactBtn = document.getElementById('addContactBtn');
const meAvatar = document.getElementById('meAvatar');
const meName   = document.getElementById('meName');
const meProfileBtn = document.getElementById('meProfileBtn');

const profileDrawer = document.getElementById('profileDrawer');
const profileAvatar = document.getElementById('profileAvatar');
const profileName   = document.getElementById('profileName');
const avatarFile    = document.getElementById('avatarFile');
const saveProfileBtn= document.getElementById('saveProfileBtn');
const closeProfileBtn= document.getElementById('closeProfileBtn');

const activeAvatar = document.getElementById('activeAvatar');
const activeName   = document.getElementById('activeName');
const feed = document.getElementById('chat-window');
const form = document.getElementById('chat-form');
const msg  = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('file');

let currentUser = null;
let activeContact = null; // {uid, username, photoURL}
let unsubscribeRoom = null;

onAuthStateChanged(auth, async (user)=>{
  if(!user){ location.href = './index.html'; return; }
  currentUser = user;
  await ensureUserDoc(user);
  await loadMeUI(user);
  await loadContacts();
});

document.getElementById('logoutBtn')?.addEventListener('click', ()=>signOut(auth));

// Helpers
function roomIdFor(uidA, uidB){
  return [uidA, uidB].sort().join('_');
}

async function ensureUserDoc(user){
  const uref = doc(db,'users', user.uid);
  const snap = await getDoc(uref);
  if(!snap.exists()){
    const baseName = user.email ? user.email.split('@')[0] : `guest_${user.uid.slice(0,6)}`;
    await setDoc(uref, {
      username: baseName,
      photoURL: user.photoURL || '',
      createdAt: Date.now()
    });
  }
}

async function loadMeUI(user){
  const uref = doc(db,'users', user.uid);
  const snap = await getDoc(uref);
  const data = snap.data() || {};
  meName.textContent = data.username || (user.email ? user.email.split('@')[0] : 'Me');
  meAvatar.src = data.photoURL || 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=' + encodeURIComponent(meName.textContent);
  profileName.value = data.username || '';
  profileAvatar.src = meAvatar.src;
}

async function loadContacts(){
  contactList.innerHTML = '';
  const cref = collection(db,'contacts', currentUser.uid, 'list');
  // Simple one-time load (could listen realtime later)
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

async function openChatWith(contact){
  activeContact = contact;
  activeName.textContent = contact.username || 'User';
  activeAvatar.src = contact.photoURL || 'https://ui-avatars.com/api/?background=37474F&color=fff&name=' + encodeURIComponent(activeName.textContent);
  startRoomListener();
}

function startRoomListener(){
  if(!activeContact) return;
  if(unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
  const roomId = roomIdFor(currentUser.uid, activeContact.uid);
  const mref = collection(db,'rooms', roomId, 'messages');
  const q = query(mref, orderBy('timestamp'));
  unsubscribeRoom = onSnapshot(q,(snap)=>{
    feed.innerHTML='';
    snap.forEach(d=> appendMessage(d.data()));
    feed.scrollTop = feed.scrollHeight;
  });
}

// Composer
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!activeContact) return;
  const text = msg.value.trim();
  if(!text) return;
  await sendMessage({ text });
  msg.value='';
});

fileInput.addEventListener('change', async ()=>{
  if(!activeContact || fileInput.files.length === 0) return;
  const file = fileInput.files[0];
  const url = await uploadImageAndGetURL(file, currentUser.uid);
  await sendMessage({ imageURL: url });
  fileInput.value='';
});

async function sendMessage(payload){
  const roomId = roomIdFor(currentUser.uid, activeContact.uid);
  const mref = collection(db,'rooms', roomId, 'messages');
  await addDoc(mref, {
    ...payload,
    senderUid: currentUser.uid,
    senderName: currentUser.email ? currentUser.email.split('@')[0] : 'user',
    timestamp: serverTimestamp()
  });
}

function appendMessage(m){
  const isMe = m.senderUid === currentUser.uid;
  const wrap = document.createElement('div');
  wrap.className = 'msg' + (isMe ? ' me-msg' : '');
  if(m.text){
    wrap.innerHTML = `${escapeHTML(m.text)}<span class="time">${formatTime(m.timestamp)}</span>`;
  }else if(m.imageURL){
    const im = document.createElement('img'); im.src = m.imageURL;
    const tm = document.createElement('span'); tm.className='time'; tm.textContent = formatTime(m.timestamp);
    wrap.append(im, tm);
  }
  feed.appendChild(wrap);
}

function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function formatTime(ts){ try{ return ts?.toDate?.().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'} ) || ''; }catch{return ''} }

// Add contact by username
addContactBtn.addEventListener('click', async ()=>{
  const uname = userSearch.value.trim();
  if(!uname) return;
  // naive search: users doc id requires knowing uid; here we assume usernames are unique (simple demo)
  // In real app, maintain /usernames/{lowerName}: { uid } index.
  alert('For demo, enter exact UID in search to add.\nProduction: add username index.');
});

// Profile drawer
meProfileBtn.addEventListener('click', ()=> profileDrawer.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', ()=> profileDrawer.classList.add('hidden'));

avatarFile.addEventListener('change', async ()=>{
  if(avatarFile.files.length===0) return;
  const url = await uploadImageAndGetURL(avatarFile.files[0], currentUser.uid, 'avatars');
  profileAvatar.src = url;
});

saveProfileBtn.addEventListener('click', async ()=>{
  const uname = profileName.value.trim();
  const url = profileAvatar.src;
  await setDoc(doc(db,'users', currentUser.uid), {
    username: uname || (currentUser.email ? currentUser.email.split('@')[0] : 'me'),
    photoURL: url || ''
  }, { merge:true });
  await updateProfile(currentUser, { displayName: uname || null, photoURL: url || null });
  await loadMeUI(currentUser);
  profileDrawer.classList.add('hidden');
});
