// firebase-messaging-sw.js
// Must live at the ROOT of the domain (clutchzone.fun/firebase-messaging-sw.js)
// Handles push notifications when the app/tab is closed or in background.

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAtzCy0CzlheMJJhGCdHdwGg9CDP6KQQg4",
  authDomain: "clutchzone-de519.firebaseapp.com",
  projectId: "clutchzone-de519",
  storageBucket: "clutchzone-de519.firebasestorage.app",
  messagingSenderId: "753147427268",
  appId: "1:753147427268:web:3b86fed888fe9d608ccc91"
});

const messaging = firebase.messaging();

// Background message handler — shows the OS notification
// Admin panel data-only messages bhejta hai (title/body/url data mein), isliye yahan se notification dikhti hai.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const title = d.title || payload.notification?.title || "ClutchZone";
  const options = {
    body: d.body || payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: d.tag || "clutchzone-chat",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: d.url || "/?chat=1" }
  };
  self.registration.showNotification(title, options);
});

// Clicking the notification opens/focuses the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/?chat=1";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          // Khuli hui app ko batao ke support chat khol de
          client.postMessage({ type: "OPEN_SUPPORT_CHAT" });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
