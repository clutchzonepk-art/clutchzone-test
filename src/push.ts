// src/push.ts
// Web push notifications (FCM). Player permission deta hai, token Firestore mein `fcmTokens/{uid}` mein save hota hai.
// Bhejne ka kaam admin panel + Cloudflare Worker karta hai (alag).
//
// Zaroori: .env / Vercel Environment Variables mein VITE_FIREBASE_VAPID_KEY
// (Firebase Console > Project settings > Cloud Messaging > Web Push certificates > Generate key pair)

import { getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const SW_URL = '/firebase-messaging-sw.js';
const REFRESH_KEY = 'cz_push_refreshed_at';

export type PushStatus = 'unsupported' | 'no-key' | 'default' | 'granted' | 'denied';
export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'no-key' | 'error';

export async function getPushStatus(): Promise<PushStatus> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }
    if (!(await isSupported())) return 'unsupported';
  } catch {
    return 'unsupported';
  }
  if (!VAPID_KEY) return 'no-key';
  return Notification.permission as PushStatus;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  const reg = existing || (await navigator.serviceWorker.register(SW_URL));
  await navigator.serviceWorker.ready;
  return reg;
}

async function saveToken(uid: string): Promise<boolean> {
  const reg = await getRegistration();
  const token = await getToken(getMessaging(getApp()), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: reg
  });
  if (!token) return false;
  await setDoc(doc(db, 'fcmTokens', uid), {
    token,
    updatedAt: serverTimestamp(),
    ua: navigator.userAgent.slice(0, 120)
  });
  return true;
}

/** Player ke button dabane par chalao (user gesture zaroori hai): permission maangta hai aur token save karta hai. */
export async function enablePush(uid: string): Promise<EnableResult> {
  const status = await getPushStatus();
  if (status === 'unsupported' || status === 'no-key') return status;
  try {
    if (status === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return 'denied';
    } else if (status === 'denied') {
      return 'denied';
    }
    return (await saveToken(uid)) ? 'ok' : 'error';
  } catch (err) {
    console.error('enablePush error:', err);
    return 'error';
  }
}

/** Permission pehle se mili ho to token ko roz ek baar taza kar do (tokens badalte rehte hain). Kabhi throw nahi karta. */
export async function refreshPushToken(uid: string) {
  try {
    if ((await getPushStatus()) !== 'granted') return;
    const last = Number(localStorage.getItem(REFRESH_KEY) || 0);
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    if (await saveToken(uid)) localStorage.setItem(REFRESH_KEY, String(Date.now()));
  } catch (err) {
    console.error('refreshPushToken error:', err);
  }
}
