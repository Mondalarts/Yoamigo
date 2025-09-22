import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  serverTimestamp, query, orderBy, onSnapshot
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

const followingList = document.getElementById('followingList');
const userSearch  = document.getElementById('userSearch');
const followBtn = document.getElementById('followBtn');
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

let currentUser = null;
let activeContact = null;
let unsubscribeRoom = null;

onAuthStateChanged(auth, async (user)=>{
  if(!user){ location.href = './index.html'; return; }
  currentUser = user;
  await ensureUserDoc(user);
  await loadMeUI(user);
  loadFollowingList();
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

function loadFollowingList(){
  if(!currentUser) return;
  const followingRef = collection(db, 'users', currentUser.uid, 'following');
  onSnapshot(query(followingRef, orderBy("followedAt", "desc")), async (snap)=>{
    followingList.innerHTML='';
    for(const followingDoc of snap.docs){
      const followingUid = followingDoc.id;
      const userSnap = await getDoc(doc(db, 'users', followingUid));
      if(!userSnap.exists()) continue;

      const userData = userSnap.data();
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = userData.photoURL || 'https://ui-avatars.com/api/?background=37474F&color=fff&name=' + encodeURIComponent(userData.username||'U');
      const meta = document.createElement('div');
      meta.className='meta';
      const name = document.createElement('div');
      name.className='name';
      name.textContent = userData.username || 'User';
      const last = document.createElement('div');
      last.className='last';
      last.textContent = 'Following';
      meta.append(name,last);
      li.append(img, meta);
      li.addEventListener('click', ()=> openChatWith({ uid: followingUid, ...userData }));
      followingList.appendChild(li);
    }
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

followBtn.addEventListener('click', async ()=>{
  const name = userSearch.value.trim().toLowerCase();
  if(!name) return;
  const ix = await getDoc(doc(db,'usernames', name));
  if(!ix.exists()){ return alert('No user found for that username'); }
  const targetUid = ix.data().uid;
  if(targetUid === currentUser.uid) { return alert('You cannot follow yourself.'); }

  try {
    await setDoc(doc(db, `users/${currentUser.uid}/following/${targetUid}`), { followedAt: serverTimestamp() });
    await setDoc(doc(db, `users/${targetUid}/followers/${currentUser.uid}`), { followedAt: serverTimestamp() });
    alert(`You are now following ${name}. They will appear in your list.`);
    userSearch.value = '';
  } catch(e) {
    console.error("Follow Error:", e);
    alert("Failed to follow user. Please check the console for errors.");
  }
});

meProfileBtn.addEventListener('click', ()=> profileDrawer.classList.remove('hidden'));
closeProfileBtn.addEventListener('click', ()=> profileDrawer.classList.add('hidden'));
saveProfileBtn.addEventListener('click', async ()=>{
  const uname = profileName.value.trim();
  await setDoc(doc(db,'users', currentUser.uid), { username: uname }, { merge:true });
  await updateProfile(currentUser, { displayName: uname || null });
  await loadMeUI(currentUser);
  profileDrawer.classList.add('hidden');
});
