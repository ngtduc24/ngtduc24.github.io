import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
config.firestoreDatabaseId = '(default)'; 
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, 'ngtduc24@gmail.com', 'Tienn@1997');
    console.log("Logged in as:", auth.currentUser.uid);
    
    // Check if we can read our own doc
    const myDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    console.log("My doc exists:", myDoc.exists());
    if (myDoc.exists()) {
      console.log("My role:", myDoc.data().role);
      
      const newUid = `test-${Date.now()}`;
      console.log("Attempting to write new user", newUid);
      await setDoc(doc(db, 'users', newUid), { role: 'user', test: true });
      console.log("Success writing new user");
    }
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
test();
