import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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


// Sign up with email/password
$('signupBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const email = emailInp.value.trim();
    const pwd   = pwdInp.value.trim();
    if(!email || !pwd) return alert('Enter email and password to sign up');
    await createUserWithEmailAndPassword(auth, email, pwd);
    alert('Account created. Redirecting to chat…');
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});


// Sign up with email/password + create username index
$('signupBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const email = emailInp.value.trim();
    const pwd   = pwdInp.value.trim();
    if(!email || !pwd) return alert('Enter email and password to sign up');

    await createUserWithEmailAndPassword(auth, email, pwd);

    const uid = auth.currentUser.uid;
    const username = email.split('@')[0];
    const unameKey = username.toLowerCase();

    // Create user profile and a username index for search
    await setDoc(doc(db,'users', uid), { username, photoURL:'', createdAt: Date.now() });
    await setDoc(doc(db,'usernames', unameKey), { uid });

    alert('Account created. Redirecting to chat…');
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

// Google sign-in
$('googleBtn')?.addEventListener('click', async ()=>{
  try{
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

// Anonymous (Guest)
$('anonBtn')?.addEventListener('click', async ()=>{
  try{
    await signInAnonymously(auth);
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

// Password reset
$('forgot')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const email = emailInp.value.trim();
    if(!email) return alert('Enter email first, then click Forgot Password');
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent.');
  }catch(err){ alert(err.message); }
});

