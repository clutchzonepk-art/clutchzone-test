// services/supportChat.ts
// Player <-> Admin support chat + bulk broadcasts.
// Sirf Firestore use karta hai (Spark plan par chalta hai, Functions ki zaroorat nahi).
// NOTE: `db` ko './firebase' se import kiya hai (jaise storage.ts mein hai).
// Agar website ki firebase file ka path alag ho to sirf neeche wali import line badlo.

import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  limitToLast,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface SupportMessage {
  id: string;
  text: string;
  senderRole: 'player' | 'admin';
  senderId: string;
  createdAt: number; // ms
}

export interface SupportChatMeta {
  id: string; // = player ka Firebase UID
  playerName: string;
  lastMessage: string;
  lastMessageAt: number; // ms
  unreadByAdmin: number;
  unreadByPlayer: number;
  status: 'open' | 'resolved';
}

export interface Broadcast {
  id: string;
  text: string;
  createdAt: number; // ms
}

// serverTimestamp pending ho (abhi bheja hai) to null aata hai -> abhi ka time lelo
const toMs = (v: any): number => (v && typeof v.toMillis === 'function' ? v.toMillis() : Date.now());

export const MAX_MESSAGE_LENGTH = 1000;

// ---------- Messages ----------

export async function sendSupportMessage(p: {
  chatUid: string; // player ka Firebase UID (chat doc ID)
  playerName: string;
  text: string;
  role: 'player' | 'admin';
  senderId: string;
}) {
  const text = p.text.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text) return;

  const chatRef = doc(db, 'supportChats', p.chatUid);
  const msgRef = doc(collection(chatRef, 'messages'));
  const batch = writeBatch(db);

  batch.set(msgRef, {
    text,
    senderRole: p.role,
    senderId: p.senderId,
    createdAt: serverTimestamp()
  });

  batch.set(
    chatRef,
    {
      playerName: p.playerName,
      lastMessage: text.slice(0, 80),
      lastMessageAt: serverTimestamp(),
      status: 'open',
      ...(p.role === 'player'
        ? { unreadByAdmin: increment(1) }
        : { unreadByPlayer: increment(1) })
    },
    { merge: true }
  );

  await batch.commit(); // message + chat summary ek saath (atomic)
}

// Aakhri 50 messages live
export function listenMessages(chatUid: string, cb: (msgs: SupportMessage[]) => void) {
  const q = query(
    collection(db, 'supportChats', chatUid, 'messages'),
    orderBy('createdAt', 'asc'),
    limitToLast(50)
  );
  return onSnapshot(
    q,
    snap => {
      cb(
        snap.docs.map(d => {
          const data: any = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            text: data.text || '',
            senderRole: data.senderRole,
            senderId: data.senderId,
            createdAt: toMs(data.createdAt)
          } as SupportMessage;
        })
      );
    },
    err => console.error('listenMessages error:', err)
  );
}

// ---------- Chat summary ----------

// Player apni chat ka summary sunta hai (unread badge ke liye)
export function listenChatMeta(chatUid: string, cb: (meta: SupportChatMeta | null) => void) {
  return onSnapshot(
    doc(db, 'supportChats', chatUid),
    snap => {
      if (!snap.exists()) return cb(null);
      const d: any = snap.data({ serverTimestamps: 'estimate' });
      cb({
        id: snap.id,
        playerName: d.playerName || '',
        lastMessage: d.lastMessage || '',
        lastMessageAt: toMs(d.lastMessageAt),
        unreadByAdmin: d.unreadByAdmin || 0,
        unreadByPlayer: d.unreadByPlayer || 0,
        status: d.status || 'open'
      });
    },
    err => console.error('listenChatMeta error:', err)
  );
}

// Admin inbox: latest 50 chats
export function listenInbox(cb: (chats: SupportChatMeta[]) => void) {
  const q = query(collection(db, 'supportChats'), orderBy('lastMessageAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    snap => {
      cb(
        snap.docs.map(d => {
          const data: any = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            playerName: data.playerName || 'Player',
            lastMessage: data.lastMessage || '',
            lastMessageAt: toMs(data.lastMessageAt),
            unreadByAdmin: data.unreadByAdmin || 0,
            unreadByPlayer: data.unreadByPlayer || 0,
            status: data.status || 'open'
          } as SupportChatMeta;
        })
      );
    },
    err => console.error('listenInbox error:', err)
  );
}

export const markReadByAdmin = (chatUid: string) =>
  updateDoc(doc(db, 'supportChats', chatUid), { unreadByAdmin: 0 }).catch(() => {});

export const markReadByPlayer = (chatUid: string) =>
  updateDoc(doc(db, 'supportChats', chatUid), { unreadByPlayer: 0 }).catch(() => {});

export const setChatStatus = (chatUid: string, status: 'open' | 'resolved') =>
  updateDoc(doc(db, 'supportChats', chatUid), { status });

// ---------- Bulk broadcasts (1 doc = 1 write, sab players ko dikhta hai) ----------

export async function sendBroadcast(text: string) {
  const clean = text.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!clean) return;
  await addDoc(collection(db, 'broadcasts'), { text: clean, createdAt: serverTimestamp() });
}

export function listenBroadcasts(count: number, cb: (items: Broadcast[]) => void) {
  const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(count));
  return onSnapshot(
    q,
    snap => {
      cb(
        snap.docs.map(d => {
          const data: any = d.data({ serverTimestamps: 'estimate' });
          return { id: d.id, text: data.text || '', createdAt: toMs(data.createdAt) } as Broadcast;
        })
      );
    },
    err => console.error('listenBroadcasts error:', err)
  );
}

export const deleteBroadcast = (id: string) => deleteDoc(doc(db, 'broadcasts', id));
