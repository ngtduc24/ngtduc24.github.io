import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function listUsers() {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
listUsers();
