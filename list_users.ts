import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function listUsers() {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  let hasUsers = false;
  snapshot.forEach(doc => {
    hasUsers = true;
    console.log(doc.id, doc.data());
  });
  if (!hasUsers) console.log("No users found.");
  process.exit(0);
}
listUsers();
