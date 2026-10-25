importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');
const senderId = urlParams.get('senderId');
const appId = urlParams.get('appId');
const envParam = urlParams.get('env');
const originParam = urlParams.get('origin');

const getParam = (val, fallback) => (val && val.trim() !== '') ? val.trim() : fallback;

const finalApiKey = getParam(apiKey, "AIzaSyD4uCGuumfRefkteG6QjGrvFUW1FLMW3o8");
const finalProjectId = getParam(projectId, "ajr3dgalaxy");
const finalSenderId = getParam(senderId, "111872927152");
const finalAppId = getParam(appId, "1:111872927152:web:b498fd9a072f776a2ae275");
const swEnv = getParam(envParam, "production");
const swOrigin = getParam(originParam, self.location.origin);

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
 * Parse incoming push payload into standardized title & options with environment validation
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

    // Defense-in-depth: check environment tag if attached to notification payload
    const payloadEnv = data.environment || payload.environment;
    if (payloadEnv && typeof payloadEnv === 'string' && swEnv) {
      if (payloadEnv.toLowerCase() !== swEnv.toLowerCase()) {
        console.warn(`[firebase-messaging-sw.js] Dropped cross-environment notification (target: ${payloadEnv}, sw: ${swEnv})`);
        return null;
      }
    }

    title = notif.title || data.title || data.name || title;
    body = notif.body || data.body || data.message || body;
    icon = notif.icon || data.icon || notif.image || data.image || icon;
    image = notif.image || data.image || undefined;
    clickAction = data.click_action || data.deepLink || data.link || data.actionUrl || notif.click_action || '/';
    tag = data.eventKey || data.tag || tag;
  }

  const campaignId = (payload && payload.data?.campaignId) || (payload && payload.campaignId) || '';

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
        campaignId,
        click_action: clickAction,
        url: clickAction,
        environment: swEnv
      }
    }
  };
}

// Native Push Event Listener with Duplicate Prevention
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let rawData = {};
    if (event.data) {
      try {
        rawData = event.data.json();
      } catch (e) {
        rawData = { body: event.data.text() };
      }
    }

    const parsed = parseNotificationPayload(rawData);
    if (!parsed) {
      // Notification dropped due to cross-environment isolation
      return;
    }

    // Ping open/delivery receipt for campaign attribution
    const campId = parsed.options?.data?.campaignId;
    if (campId) {
      try {
        fetch(`${self.location.origin}/api/notifications/track-open`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campId, source: 'sw_push_event' })
        }).catch(() => {});
      } catch (e) {}
    }

    // Check if application window is open and focused in the foreground
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedWindow = windowClients.some(
      (client) => client.focused && client.visibilityState === 'visible'
    );

    // If application is already active in the foreground, notify window client
    // without popping a duplicate system tray notification
    if (hasFocusedWindow) {
      windowClients.forEach((client) => {
        client.postMessage({
          type: 'FCM_FOREGROUND_PUSH',
          payload: rawData
        });
      });
      return;
    }

    // Check if message is a data-only push or if Firebase handles it natively
    const hasFCMNotificationPayload = Boolean(
      rawData.notification || (rawData.webpush && rawData.webpush.notification)
    );

    // If the message already contains an FCM notification payload, Firebase
    // automatically displays it. Do not show another notification to avoid duplicates.
    if (hasFCMNotificationPayload) {
      return;
    }

    return self.registration.showNotification(parsed.title, parsed.options);
  })());
});

// Firebase Background Handler for data-only messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received FCM background message in env:', swEnv, payload);
  const parsed = parseNotificationPayload(payload);
  if (!parsed) {
    console.warn(`[firebase-messaging-sw.js] Background message dropped due to environment mismatch`);
    return;
  }

  const campId = parsed.options?.data?.campaignId;
  if (campId) {
    try {
      fetch(`${self.location.origin}/api/notifications/track-open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campId, source: 'sw_background_msg' })
      }).catch(() => {});
    } catch (e) {}
  }

  // Only display if Firebase has not already displayed a notification payload
  if (!payload.notification) {
    return self.registration.showNotification(parsed.title, parsed.options);
  }
});

// Notification Click Handler with Domain & Origin Enforcement
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawTarget = event.notification.data?.click_action || event.notification.data?.url || '/';
  const campaignId = event.notification.data?.campaignId;

  // Immediately track click event to backend API
  if (campaignId) {
    try {
      fetch(`${self.location.origin}/api/notifications/track-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignId,
          source: 'sw_notificationclick'
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // Normalize target URL strictly to current origin to prevent cross-domain leaks
  let safeTargetUrl = '/';
  try {
    const resolved = new URL(rawTarget, self.location.origin);
    if (resolved.origin === self.location.origin) {
      safeTargetUrl = resolved.href;
    } else {
      safeTargetUrl = new URL(resolved.pathname + resolved.search, self.location.origin).href;
    }
  } catch {
    safeTargetUrl = new URL('/', self.location.origin).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Try to find client already at the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === safeTargetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // 2. Try to reuse any open window belonging to this origin
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(safeTargetUrl);
          }
        }
      }

      // 3. Fallback: open new window on this origin
      if (clients.openWindow) {
        return clients.openWindow(safeTargetUrl);
      }
    })
  );
});
