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

// Flink helpers
const makeEmail = (flink) => `${flink}@yoamigo.chat`;
const genFlink  = () => Math.floor(100000 + Math.random()*900000).toString();

const $ = (id) => document.getElementById(id);
const flinkInput = $('flink');
const pwdInput   = $('password');

// Email/password via flink mapping
$('loginBtn')?.addEventListener('click', async ()=>{
  try{
    const flink = flinkInput.value.trim();
    const pwd   = pwdInput.value.trim();
    if(!flink || !pwd) return alert('Enter flink and password');
    const snap = await getDoc(doc(db,'flinks', flink));
    if(!snap.exists()) return alert('Flink not found');
    const email = snap.data().email;
    await signInWithEmailAndPassword(auth, email, pwd);
    location.href = 'chat.html';
  }catch(e){ alert(e.message); }
});

// Sign up generates flink
$('signupBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    const pwd = pwdInput.value.trim();
    if(!pwd) return alert('Set a password first, then click Sign up');
    const flink = genFlink();
    const email = makeEmail(flink);
    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    await setDoc(doc(db,'flinks', flink), { email, uid: cred.user.uid, createdAt: Date.now() });
    alert(`Your flink: ${flink}\nUse it with your password to sign in.`);
    location.href = 'chat.html';
  }catch(e){ alert(e.message); }
});

// Google sign-in
$('googleBtn')?.addEventListener('click', async ()=>{
  try{
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    location.href = 'chat.html';
  }catch(e){ alert(e.message); }
});

// Apple button (placeholder UI)
// To enable: in Firebase Console → Sign-in method → Apple, configure Services ID & domains, then:
// import { OAuthProvider, signInWithPopup } and use new OAuthProvider('apple.com')
$('appleBtn')?.addEventListener('click', ()=>{
  alert('Apple Sign-in UI ready. Configure Apple in Firebase to enable.');
});

// Anonymous sign-in → guest landing (no chat)
$('anonBtn')?.addEventListener('click', async ()=>{
  try{
    await signInAnonymously(auth);
    alert('Guest mode: browsing only. Chat disabled.');
    // Optionally redirect to a read-only page
    // location.href = 'guest.html';
  }catch(e){ alert(e.message); }
});

// Optional: Forgot password for flink users (uses secret email)
$('forgot')?.addEventListener('click', (e)=>{
  e.preventDefault();
  alert('Password reset via flink not implemented in this demo.');
});
