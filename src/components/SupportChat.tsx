// Player website ke liye (clutchzone.fun): src/components/SupportChat.tsx
// Use: <SupportChat uid={firebaseUser.uid} playerName={player.name} />
// Sirf logged-in player ke liye render karo. supportChat.ts ko website ke services folder mein bhi copy karo.
// Assumption: Tailwind CSS.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SupportChatMeta,
  SupportMessage,
  Broadcast,
  MAX_MESSAGE_LENGTH,
  listenChatMeta,
  listenMessages,
  listenBroadcasts,
  sendSupportMessage,
  markReadByPlayer
} from '../services/supportChat';

const SEEN_KEY = 'cz_broadcast_seen';

type Item =
  | { kind: 'msg'; id: string; createdAt: number; msg: SupportMessage }
  | { kind: 'broadcast'; id: string; createdAt: number; text: string };

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function SupportChat({ uid, playerName }: { uid: string; playerName: string }) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<SupportChatMeta | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [latestBroadcastAt, setLatestBroadcastAt] = useState(0);
  const [seenAt, setSeenAt] = useState<number>(() => Number(localStorage.getItem(SEEN_KEY) || 0));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hamesha on: chat summary (1 doc) + sabse naya broadcast (1 doc) sirf badge ke liye
  useEffect(() => listenChatMeta(uid, setMeta), [uid]);
  useEffect(
    () => listenBroadcasts(1, items => setLatestBroadcastAt(items[0]?.createdAt || 0)),
    []
  );

  // Sirf jab chat khuli ho: messages + last 10 broadcasts
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
      localStorage.setItem(SEEN_KEY, String(latestBroadcastAt));
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

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendSupportMessage({
        chatUid: uid,
        playerName,
        text,
        role: 'player',
        senderId: uid
      });
      setText('');
    } catch (err) {
      console.error(err);
      alert('Message send nahi hua. Dobara try karo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-2xl shadow-lg"
          aria-label="Support"
        >
          💬
          {unreadBadge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {unreadBadge}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[75vh] flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[32rem] sm:w-96 sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-zinc-700 p-3">
            <div>
              <p className="text-sm font-bold text-white">ClutchZone Support</p>
              <p className="text-xs text-zinc-400">Apna masla likho, admin reply karega</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {items.length === 0 && (
              <p className="pt-8 text-center text-sm text-zinc-500">
                Abhi koi message nahi. Pehla message bhejo 👇
              </p>
            )}
            {items.map(it =>
              it.kind === 'broadcast' ? (
                <div key={'b_' + it.id} className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
                  <p className="text-xs font-bold text-orange-400">📢 ClutchZone</p>
                  <p className="whitespace-pre-wrap break-words text-sm text-zinc-100">{it.text}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{timeLabel(it.createdAt)}</p>
                </div>
              ) : (
                <div key={it.id} className={`flex ${it.msg.senderRole === 'player' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      it.msg.senderRole === 'player' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    {it.msg.text}
                    <div className="mt-1 text-[10px] opacity-60">{timeLabel(it.createdAt)}</div>
                  </div>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-zinc-700 p-3">
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
              className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white outline-none focus:border-orange-500"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
