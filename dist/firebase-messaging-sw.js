importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCQvGg8PSg_2gWMaFxc3KB5M5DY6xNETlg",
  authDomain: "andynguyen-9c4cd.firebaseapp.com",
  projectId: "andynguyen-9c4cd",
  storageBucket: "andynguyen-9c4cd.firebasestorage.app",
  messagingSenderId: "479317338093",
  appId: "1:479317338093:web:ca9532e4b44ec5feed29e4",
  measurementId: "G-KDQZHCG4F1"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
