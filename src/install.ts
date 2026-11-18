// src/install.ts
// "Install ClutchZone App" (PWA / WebAPK): Chrome ka `beforeinstallprompt` event pakad kar
// ek permanent button se install karwana. Event page load par hi aa jata hai, isliye main.tsx mein
// `initInstallCapture()` React se pehle chalti hai.

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let version = 0;
const listeners = new Set<() => void>();
const notify = () => {
  version++;
  listeners.forEach(l => l());
};

export const isStandalone = (): boolean => {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (navigator as any).standalone === true
    );
  } catch {
    return false;
  }
};

export function initInstallCapture() {
  installedFlag = isStandalone();
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // Chrome ka apna chhota infobar nahi, hamara button dikhega
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedFlag = true;
    notify();
  });
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/** Button dabane par chalao (user gesture zaroori hai). */
export async function promptInstall(): Promise<InstallOutcome> {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null; // ek event sirf ek baar use ho sakta hai
  notify();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return 'dismissed';
  }
}

export interface InstallEnv {
  isIOS: boolean;
  isAndroid: boolean;
  inAppBrowser: boolean; // WhatsApp / Facebook / Instagram ka andar ka browser (install nahi ho sakta)
}

export function getInstallEnv(): InstallEnv {
  const ua = navigator.userAgent || '';
  return {
    isIOS: /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document),
    isAndroid: /Android/i.test(ua),
    inAppBrowser: /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|musical_ly/i.test(ua)
  };
}

export function useInstallApp() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    installed: installedFlag || isStandalone(),
    canPrompt: deferred !== null,
    version
  };
}
