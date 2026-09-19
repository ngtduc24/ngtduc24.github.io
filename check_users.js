import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCQvGg8PSg_2gWMaFxc3KB5M5DY6xNETlg",
  authDomain: "andynguyen-9c4cd.firebaseapp.com",
  projectId: "andynguyen-9c4cd",
  storageBucket: "andynguyen-9c4cd.firebasestorage.app",
  messagingSenderId: "479317338093",
  appId: "1:479317338093:web:ca9532e4b44ec5feed29e4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = collection(db, 'users');
  const snapshot = await getDocs(q);
  snapshot.docs.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
check();
