// src/components/SupportChat.tsx
// Player <-> Admin support chat widget (floating button + chat panel).
// Admin ke bulk messages (broadcasts) bhi isi chat mein "ClutchZone" card ki shakal mein nazar aate hain.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  SupportChatMeta,
  SupportMessage,
  Broadcast,
  MAX_MESSAGE_LENGTH,
  OPEN_SUPPORT_CHAT_EVENT,
  listenChatMeta,
  listenMessages,
  listenBroadcasts,
  sendSupportMessage,
  markReadByPlayer
} from '../supportChat';

const SEEN_KEY = 'cz_broadcast_seen';

type Item =
  | { kind: 'msg'; id: string; createdAt: number; msg: SupportMessage }
  | { kind: 'broadcast'; id: string; createdAt: number; text: string };

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const SupportChat: React.FC<{ uid: string; playerName: string }> = ({ uid, playerName }) => {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<SupportChatMeta | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [latestBroadcastAt, setLatestBroadcastAt] = useState(0);
  const [seenAt, setSeenAt] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(SEEN_KEY) || 0);
    } catch {
      return 0;
    }
  });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useAuth();

  // Naye message par popup (toast) dikhane ke liye refs
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const openRef = useRef(open);
  openRef.current = open;
  const prevUnreadRef = useRef<number | null>(null);
  const lastToastedBroadcastRef = useRef(0);

  // Doosre components (Deposit, Support button...) chat kholne ke liye event bhejte hain
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, handler);
  }, []);

  // Hamesha on (sirf 2 chhote docs): apni chat ka summary + sabse naya broadcast (badge ke liye)
  useEffect(() => listenChatMeta(uid, setMeta), [uid]);
  useEffect(() => listenBroadcasts(1, items => setLatestBroadcastAt(items[0]?.createdAt || 0)), []);

  // Sirf jab chat khuli ho: messages + aakhri 10 broadcasts
  useEffect(() => {
    if (!open) return;
    const u1 = listenMessages(uid, setMessages);
    const u2 = listenBroadcasts(10, setBroadcasts);
    return () => {
      u1();
      u2();
    };
  }, [open, uid]);

  // Chat khuli ho to unread clear + broadcasts "seen" mark
  useEffect(() => {
    if (!open) return;
    if (meta && meta.unreadByPlayer > 0) markReadByPlayer(uid);
    if (latestBroadcastAt > seenAt) {
      try {
        localStorage.setItem(SEEN_KEY, String(latestBroadcastAt));
      } catch {
        /* ignore */
      }
      setSeenAt(latestBroadcastAt);
    }
  }, [open, meta?.unreadByPlayer, latestBroadcastAt]);

  const items: Item[] = useMemo(() => {
    const all: Item[] = [
      ...messages.map(m => ({ kind: 'msg' as const, id: m.id, createdAt: m.createdAt, msg: m })),
      ...broadcasts.map(b => ({ kind: 'broadcast' as const, id: b.id, createdAt: b.createdAt, text: b.text }))
    ];
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }, [messages, broadcasts]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length, open]);

  const unreadBadge = (meta?.unreadByPlayer || 0) + (latestBroadcastAt > seenAt ? 1 : 0);

  // Admin ka naya reply aaye aur chat band ho to popup (mobile par badge se zyada nazar aata hai)
  useEffect(() => {
    if (meta === null) return;
    const n = meta.unreadByPlayer;
    const prev = prevUnreadRef.current;
    if (n > 0 && !openRef.current && (prev === null || n > prev)) {
      showToastRef.current('💬 Support se naya message aaya hai. Chat button dabao.', 'info');
    }
    prevUnreadRef.current = n;
  }, [meta?.unreadByPlayer]);

  // Naya bulk message (broadcast) aaye to popup
  useEffect(() => {
    if (latestBroadcastAt > seenAt && latestBroadcastAt > lastToastedBroadcastRef.current && !openRef.current) {
      showToastRef.current('📢 ClutchZone ka naya message aaya hai. Chat button dabao.', 'info');
    }
    lastToastedBroadcastRef.current = Math.max(lastToastedBroadcastRef.current, latestBroadcastAt);
  }, [latestBroadcastAt, seenAt]);

  // Browser tab ke title mein (1) aur installed app icon par badge
  const baseTitleRef = useRef(document.title.replace(/^\(\d+\)\s*/, ''));
  useEffect(() => {
    document.title = unreadBadge > 0 ? `(${unreadBadge}) ${baseTitleRef.current}` : baseTitleRef.current;
    try {
      const nav: any = navigator;
      if (unreadBadge > 0) nav.setAppBadge?.(unreadBadge);
      else nav.clearAppBadge?.();
    } catch {
      /* ignore */
    }
  }, [unreadBadge]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await sendSupportMessage({ chatUid: uid, playerName, text, role: 'player', senderId: uid });
      setText('');
    } catch (err) {
      console.error('Support message error:', err);
      setError('Message send nahi hua. Dobara try karo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Support chat"
          className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-[#F5A623] text-black shadow-lg shadow-[#F5A623]/30 flex items-center justify-center hover:scale-105 transition-transform"
        >
          {unreadBadge > 0 && (
            <span className="absolute inset-0 rounded-full bg-[#F5A623] opacity-50 animate-ping pointer-events-none" />
          )}
          <MessageCircle className="w-6 h-6 relative" />
          {unreadBadge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-red-500 border-2 border-[#080B14] text-white text-xs font-bold flex items-center justify-center">
              {unreadBadge}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[70] h-[75vh] md:inset-x-auto md:bottom-6 md:right-6 md:h-[32rem] md:w-96 flex flex-col rounded-t-2xl md:rounded-2xl border border-[#1E2340] bg-[#0F1220] shadow-2xl pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2340]">
            <div>
              <p className="font-heading font-black text-sm uppercase tracking-wider text-[#F5A623]">
                ClutchZone Support
              </p>
              <p className="text-xs text-[#7A84A8]">Apna masla likho, admin reply karega</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-lg bg-[#161A2E] text-[#7A84A8] hover:text-[#EEF0FF]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 && (
              <p className="pt-8 text-center text-sm text-[#7A84A8]">Abhi koi message nahi. Pehla message bhejo 👇</p>
            )}
            {items.map(it =>
              it.kind === 'broadcast' ? (
                <div key={'b_' + it.id} className="rounded-xl border border-[#F5A623]/40 bg-[#F5A623]/10 p-3">
                  <p className="text-xs font-bold text-[#F5A623]">📢 ClutchZone</p>
                  <p className="text-sm text-[#EEF0FF] whitespace-pre-wrap break-words">{it.text}</p>
                  <p className="mt-1 text-[10px] text-[#7A84A8]">{timeLabel(it.createdAt)}</p>
                </div>
              ) : (
                <div key={it.id} className={`flex ${it.msg.senderRole === 'player' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      it.msg.senderRole === 'player'
                        ? 'bg-[#F5A623] text-black'
                        : 'bg-[#161A2E] text-[#EEF0FF] border border-[#1E2340]'
                    }`}
                  >
                    {it.msg.text}
                    <div className="mt-1 text-[10px] opacity-60">
                      {timeLabel(it.createdAt)}
                      {it.msg.editedAt ? ' · edited' : ''}
                    </div>
                  </div>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-3 pb-1 text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 p-3 border-t border-[#1E2340]">
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Message likho..."
              className="flex-1 resize-none rounded-lg border border-[#1E2340] bg-[#161A2E] p-2 text-sm text-[#EEF0FF] outline-none focus:border-[#F5A623]"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              aria-label="Send message"
              className="px-3 rounded-lg bg-[#F5A623] text-black disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
