import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCfhn6-aFg9u_S93ioPLp6TSjjhnDveMfA",
  authDomain: "yoamigo-347fe.firebaseapp.com",
  projectId: "yoamigo-347fe",
  storageBucket: "yoamigo-347fe.appspot.com",
  messagingSenderId: "734605500408",
  appId: "1:734605500408:web:fa2e3966b3e8bc152a400d",
  measurementId: "G-61R9G9SFLV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const feed = document.getElementById('chat-window');
const form = document.getElementById('chat-form');
const msg  = document.getElementById('msg');
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');

hamburger?.addEventListener('click', ()=> sidebar.classList.toggle('open'));

onAuthStateChanged(auth, user => {
  if(!user){ location.href='index.html'; return; }
  boot(user);
});

document.getElementById('logoutBtn')?.addEventListener('click', ()=>signOut(auth));

function boot(user){
  const ref = collection(db,'rooms','general','messages');
  const q = query(ref, orderBy('timestamp'));

  onSnapshot(q, (snap)=>{
    const frag = document.createDocumentFragment();
    feed.innerHTML='';
    snap.forEach(d=> frag.appendChild(renderMsg(d.data(), user)));
    feed.appendChild(frag);
    feed.scrollTop = feed.scrollHeight;
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const text = msg.value.trim(); if(!text) return;
    await addDoc(ref, {
      text,
      sender:(auth.currentUser?.email||'user').split('@')[0],
      uid:auth.currentUser?.uid||'',
      timestamp: serverTimestamp()
    });
    msg.value='';
  });
}

function renderMsg(m, user){
  const me = m.uid && user && m.uid===user.uid;
  const wrap = document.createElement('div'); wrap.className = `msg ${me?'me':''}`;
  const ava = document.createElement('div'); ava.className = 'avatar';
  const bubble = document.createElement('div'); bubble.className='bubble';
  const meta = document.createElement('div'); meta.className='meta';
  const t = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  meta.textContent = `${m.sender??'user'}  ${t}`;
  const text = document.createElement('div'); text.className='text'; text.textContent = m.text ?? '';
  bubble.append(meta,text);
  if(me){ wrap.append(bubble,ava);} else { wrap.append(ava,bubble); }
  return wrap;
}
