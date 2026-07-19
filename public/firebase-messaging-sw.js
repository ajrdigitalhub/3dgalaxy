importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');
const senderId = urlParams.get('senderId');
const appId = urlParams.get('appId');

const getParam = (val, fallback) => (val && val.trim() !== '') ? val.trim() : fallback;

const finalApiKey = getParam(apiKey, "AIzaSyD4uCGuumfRefkteG6QjGrvFUW1FLMW3o8");
const finalProjectId = getParam(projectId, "ajr3dgalaxy");
const finalSenderId = getParam(senderId, "111872927152");
const finalAppId = getParam(appId, "1:111872927152:web:b498fd9a072f776a2ae275");

firebase.initializeApp({
  apiKey: finalApiKey,
  authDomain: `${finalProjectId}.firebaseapp.com`,
  projectId: finalProjectId,
  storageBucket: `${finalProjectId}.firebasestorage.app`,
  messagingSenderId: finalSenderId,
  appId: finalAppId
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || '3DGalaxy Hub';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || payload.data?.icon || '/favicon.ico',
    image: payload.notification?.image || payload.data?.image || undefined,
    data: {
      click_action: payload.data?.click_action || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(clickAction) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
