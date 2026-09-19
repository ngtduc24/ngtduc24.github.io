import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, "admin@example.com", "admin123");
    const uid = cred.user.uid;
    console.log("Created Auth user with UID:", uid);
    
    await setDoc(doc(db, "users", uid), {
      id: uid,
      username: "admin",
      email: "admin@example.com",
      role: "admin",
      createdAt: Date.now()
    });
    
    console.log("Admin seeded successfully.");
    process.exit(0);
  } catch (error: any) {
    console.error("Error seeding:", error.message);
    process.exit(1);
  }
}

seed();
