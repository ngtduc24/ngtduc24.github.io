import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";
import { initializeFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Nếu file cấu hình firebase-applet-config.json có sẵn API Key hợp lệ,
// chúng ta sử dụng toàn bộ cấu hình từ file JSON này để tránh bị lệch (mismatch)
// giữa các trường khi môi trường hệ thống chứa các biến cấu hình khác.
let envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
let envDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

// Cơ chế phát hiện hoán đổi cấu hình từ môi trường hệ thống
if (envDatabaseId && envDatabaseId.startsWith('AIzaSy')) {
  envApiKey = envDatabaseId;
  envDatabaseId = '(default)';
}

const isLocalConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIzaSy');

const resolvedFirebaseConfig = {
  apiKey: "AIzaSyCQvGg8PSg_2gWMaFxc3KB5M5DY6xNETlg",
  authDomain: "andynguyen-9c4cd.firebaseapp.com",
  projectId: "andynguyen-9c4cd",
  storageBucket: "andynguyen-9c4cd.firebasestorage.app",
  messagingSenderId: "479317338093",
  appId: "1:479317338093:web:ca9532e4b44ec5feed29e4",
  measurementId: "G-KDQZHCG4F1",
  firestoreDatabaseId: "(default)"
};

const app = initializeApp(resolvedFirebaseConfig);
const secondaryApp = initializeApp(resolvedFirebaseConfig, "Secondary");

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "(default)");

export const auth = getAuth(app);
export const authAdminClient = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });

// Dummy implementations for FCM to fix lint errors
export const getMessagingInstance = () => {
  try {
    return getMessaging(app);
  } catch (e) {
    return null;
  }
};

export const requestFCMToken = async (userId?: string) => {
  try {
    const messaging = getMessagingInstance();
    if (!messaging) return null;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FCM_VAPID_KEY || undefined
      });
      
      if (token && userId) {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', userId), {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('FCM Token registered');
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Lỗi khi lấy FCM token:', error);
    return null;
  }
};

// End of file
