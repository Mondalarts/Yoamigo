import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
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

const $ = (id) => document.getElementById(id);
const emailInp = $('email');
const pwdInp   = $('password');

$('loginBtn')?.addEventListener('click', async ()=>{
  try{
    const email = emailInp.value.trim();
    const pwd   = pwdInp.value.trim();
    if(!email || !pwd) return alert('Enter email and password');
    await signInWithEmailAndPassword(auth, email, pwd);
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

$('signupBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const email = emailInp.value.trim();
    const pwd   = pwdInp.value.trim();
    if(!email || !pwd) return alert('Enter email and password to sign up');

    await createUserWithEmailAndPassword(auth, email, pwd);
    const uid = auth.currentUser.uid;
    const username = email.split('@')[0] || `user_${uid.slice(0,6)}`;
    const unameKey = username.toLowerCase();

    await setDoc(doc(db,'users', uid), { username, photoURL:'', createdAt: Date.now() });
    await setDoc(doc(db,'usernames', unameKey), { uid });

    alert('Account created. Redirecting to chat…');
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

$('googleBtn')?.addEventListener('click', async ()=>{
  try{
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    const user = cred.user;
    const email = user.email || '';
    const baseFromEmail = email.split('@')[0] || '';
    const baseFromName  = (user.displayName||'').split(' ')[0] || '';
    const username = (baseFromName || baseFromEmail || `user_${user.uid.slice(0,6)}`);
    const unameKey = username.toLowerCase();

    await setDoc(doc(db,'users', user.uid), {
      username, photoURL: user.photoURL || ''
    }, { merge:true });
    await setDoc(doc(db,'usernames', unameKey), { uid: user.uid }, { merge:true });

    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

$('anonBtn')?.addEventListener('click', async ()=>{
  try{
    await signInAnonymously(auth);
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

$('forgot')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const email = emailInp.value.trim();
    if(!email) return alert('Enter email first, then click Forgot Password');
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent.');
  }catch(err){ alert(err.message); }
});
