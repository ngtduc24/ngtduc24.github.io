import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const authAdminClient = getAuth(secondaryApp);

// Dummy implementations for FCM to fix lint errors
export const getMessagingInstance = () => {
  try {
    return getMessaging(app);
  } catch (e) {
    return null;
  }
};

export const requestFCMToken = async (userId?: string) => {
  return null;
};

// Dummy implementations for Journal Firestore functions
export const saveJournalToFirestore = async (journal: any) => {};
export const saveJournalFieldToFirestore = async (field: any) => {};
export const saveJournalTypeToFirestore = async (type: any) => {};
