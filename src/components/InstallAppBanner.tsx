// src/components/InstallAppBanner.tsx
// Home page ka permanent "Install ClutchZone App" banner + Navbar ka chhota install button.
// Install ho jaye (ya app ke andar khula ho) to dono khud chhup jate hain.

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInstallApp, promptInstall, getInstallEnv } from '../install';

const TOAST_KEY = 'cz_install_toast_shown';

// Install ka tareeqa jab browser ek-tap install na de (iPhone, in-app browser, ya prompt abhi tayyar nahi)
const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const env = getInstallEnv();
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-[#F5A623]/40 bg-[#0F1220] p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-heading font-black uppercase tracking-wider text-[#F5A623] text-sm">
            ClutchZone App Install
          </p>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded bg-[#161A2E] text-[#7A84A8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {env.inAppBrowser ? (
          <ol className="text-sm text-[#EEF0FF] space-y-2 list-decimal list-inside">
            <li>Ye link WhatsApp/Facebook ke andar khula hai, yahan install nahi hota.</li>
            <li>Upar ya neeche menu (⋮) dabao aur <b>"Open in Chrome"</b> chuno.</li>
            <li>Chrome mein <b>Install App</b> button dabao.</li>
          </ol>
        ) : env.isIOS ? (
          <ol className="text-sm text-[#EEF0FF] space-y-2 list-decimal list-inside">
            <li><b>Safari</b> mein clutchzone.fun kholo (Chrome mein nahi).</li>
            <li>Neeche <b>Share</b> (⬆️) button dabao.</li>
            <li><b>"Add to Home Screen"</b> chuno, phir <b>Add</b>.</li>
            <li>Home screen se ClutchZone app kholo.</li>
          </ol>
        ) : (
          <ol className="text-sm text-[#EEF0FF] space-y-2 list-decimal list-inside">
            <li><b>Chrome</b> mein clutchzone.fun kholo.</li>
            <li>Upar kone mein menu <b>(⋮)</b> dabao.</li>
            <li><b>"Install app"</b> (ya "Add to Home screen") chuno, phir <b>Install</b>.</li>
          </ol>
        )}

        <p className="text-[11px] text-[#7A84A8]">
          Install karne ke baad app kholo aur chat mein 🔔 Enable dabao, taake Room ID ka notification aaye.
        </p>
      </div>
    </div>
  );
};

/** Install button ka common logic: ek-tap install ya help modal */
function useInstallAction() {
  const { showToast } = useAuth();
  const { installed, canPrompt } = useInstallApp();
  const [help, setHelp] = useState(false);

  const run = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        showToast('✅ ClutchZone app install ho raha hai! Home screen se kholo.', 'success');
      }
      return;
    }
    setHelp(true);
  };
  return { installed, canPrompt, help, setHelp, run };
}

/** Home page ka permanent banner */
export const InstallAppBanner: React.FC = () => {
  const { showToast } = useAuth();
  const { installed, canPrompt, help, setHelp, run } = useInstallAction();

  // Ek session mein sirf ek baar halka sa toast (jab ek-tap install tayyar ho)
  useEffect(() => {
    if (installed || !canPrompt) return;
    try {
      if (sessionStorage.getItem(TOAST_KEY)) return;
      sessionStorage.setItem(TOAST_KEY, '1');
    } catch {
      /* ignore */
    }
    const t = setTimeout(
      () => showToast('📲 ClutchZone app install karein! Home page par "Install App" button hai.', 'info'),
      4000
    );
    return () => clearTimeout(t);
  }, [installed, canPrompt]);

  if (installed) return null;

  return (
    <>
      <div className="rounded-2xl border border-[#F5A623]/40 bg-gradient-to-r from-[#F5A623]/15 via-[#161A2E] to-[#161A2E] p-3 sm:p-4 flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#F5A623] text-black flex items-center justify-center">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-black text-sm uppercase tracking-wide text-[#EEF0FF]">ClutchZone App</p>
          <p className="text-xs text-[#7A84A8]">Home screen par install karein: fast access aur Room ID ke notifications.</p>
        </div>
        <button
          onClick={run}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-[#F5A623] text-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
      </div>
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </>
  );
};

/** Navbar ka chhota icon button */
export const InstallNavButton: React.FC = () => {
  const { installed, help, setHelp, run } = useInstallAction();
  if (installed) return null;
  return (
    <>
      <button
        onClick={run}
        title="Install ClutchZone App"
        aria-label="Install ClutchZone App"
        className="w-8 h-8 rounded-lg bg-[#F5A623]/15 border border-[#F5A623]/40 text-[#F5A623] hover:bg-[#F5A623]/25 flex items-center justify-center transition-colors"
      >
        <Download className="w-4 h-4" />
      </button>
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </>
  );
};
