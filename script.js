import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// Flink helpers
const makeEmail = (flink) => `${flink}@yoamigo.chat`;
const genFlink  = () => Math.floor(100000 + Math.random()*900000).toString();

// Login with flink
$('loginBtn')?.addEventListener('click', async ()=>{
  try{
    const flink = $('flink').value.trim();
    const pwd   = $('password').value.trim();
    if(!flink || !pwd) return alert('Enter flink and password');

    const snap = await getDoc(doc(db,'flinks', flink));
    if(!snap.exists()) return alert('Flink not found');

    const email = snap.data().email;
    await signInWithEmailAndPassword(auth, email, pwd);
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

// Sign up generates flink (requires password)
$('signupBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const pwd = $('password').value.trim();
    if(!pwd) return alert('Set a password first, then click Sign up');

    const flink = genFlink();
    const email = makeEmail(flink);

    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    await setDoc(doc(db,'flinks', flink), { email, uid: cred.user.uid, createdAt: Date.now() });

    alert(`Your flink: ${flink}\nUse it with your password to sign in.`);
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

// Apple placeholder (requires Apple setup in Firebase)
$('appleBtn')?.addEventListener('click', ()=>{
  alert('Apple Sign-in requires configuration in Firebase → Authentication → Sign-in method → Apple.');
});

// Anonymous (Guest)
$('anonBtn')?.addEventListener('click', async ()=>{
  try{
    await signInAnonymously(auth);
    location.href = './chat.html';
  }catch(e){ alert(e.message); }
});

// Optional: forgot password (not implemented with flink alias)
$('forgot')?.addEventListener('click', (e)=>{
  e.preventDefault();
  alert('Password reset via flink is not implemented in this demo.');
});
