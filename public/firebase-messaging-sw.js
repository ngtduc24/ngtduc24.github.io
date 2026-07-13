importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCG3DNrdBL48TT_6uYdncDl4C3DmySSmr4",
  authDomain: "inspiring-magnet-8wjrd.firebaseapp.com",
  projectId: "inspiring-magnet-8wjrd",
  storageBucket: "inspiring-magnet-8wjrd.firebasestorage.app",
  messagingSenderId: "922873663800",
  appId: "1:922873663800:web:dceb838f164b561d0831cd"
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
