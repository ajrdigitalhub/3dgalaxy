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

/**
 * Parse incoming push payload into standardized title & options
 */
function parseNotificationPayload(rawData) {
  let title = '3D Galaxy';
  let body = '';
  let icon = '/assets/icons/icon-192x192.png';
  let image = undefined;
  let clickAction = '/';
  let tag = '3dgalaxy-notification';

  if (!rawData) {
    return { title, options: { body, icon, data: { click_action: clickAction } } };
  }

  let payload = rawData;
  if (typeof rawData === 'string') {
    try {
      payload = JSON.parse(rawData);
    } catch (e) {
      body = rawData;
    }
  }

  if (payload && typeof payload === 'object') {
    const notif = payload.notification || payload.data?.notification || {};
    const data = payload.data || payload;

    title = notif.title || data.title || data.name || title;
    body = notif.body || data.body || data.message || body;
    icon = notif.icon || data.icon || notif.image || data.image || icon;
    image = notif.image || data.image || undefined;
    clickAction = data.click_action || data.deepLink || data.link || data.actionUrl || notif.click_action || '/';
    tag = data.eventKey || data.tag || tag;
  }

  return {
    title,
    options: {
      body,
      icon,
      image: image || undefined,
      badge: '/assets/icons/badge-72x72.png',
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        click_action: clickAction,
        url: clickAction
      }
    }
  };
}

// Native Push Event Listener
// CRITICAL: Chrome on Android requires event.waitUntil(showNotification(...)) to prevent
// displaying the default fallback notification "This site has been updated in the background."
self.addEventListener('push', (event) => {
  let rawData = {};
  if (event.data) {
    try {
      rawData = event.data.json();
    } catch (e) {
      rawData = { body: event.data.text() };
    }
  }

  const { title, options } = parseNotificationPayload(rawData);

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Firebase Background Handler fallback
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received FCM background message:', payload);
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.click_action || event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

