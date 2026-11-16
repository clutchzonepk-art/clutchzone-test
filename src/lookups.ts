// src/lookups.ts
// Privacy-safe uniqueness lookups.
//
// Pehle website `players` collection ko query karti thi (gameUID / whatsapp / name / referralCode
// check karne ke liye), is wajah se rules mein `players` ki list sab logged-in players ke liye
// khuli rakhni padti thi (aur us mein sab ka WhatsApp / payment account hota hai).
//
// Ab sirf chhote "lookup" docs use hote hain jin mein sirf { uid } hota hai:
//   lookupGameUIDs/{gameUID}   lookupWhatsapps/{whatsapp}   lookupRefCodes/{referralCode}
// Rules mein inhe sirf key se `get` kiya ja sakta hai (list nahi), aur koi player sirf apni
// profile ki value ka doc bana sakta hai. Naam ke liye `publicProfiles/{uid}` = { name } hai
// (naam waise bhi leaderboard par public hote hain).

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const COL = {
  gameUID: 'lookupGameUIDs',
  whatsapp: 'lookupWhatsapps',
  refCode: 'lookupRefCodes'
} as const;

export type LookupKind = keyof typeof COL;

/** Value ka maalik uid wapas deta hai, ya null agar value free hai. Error aaye to throw karta hai. */
export async function lookupOwner(kind: LookupKind, value: string): Promise<string | null> {
  if (!value) return null;
  const snap = await getDoc(doc(db, COL[kind], value));
  if (!snap.exists()) return null;
  const uid = (snap.data() as { uid?: string }).uid;
  return uid || null;
}

/** true agar value kisi DOOSRE player ke paas hai. */
export async function isLookupTakenByOther(kind: LookupKind, value: string, myUid: string): Promise<boolean> {
  const owner = await lookupOwner(kind, value);
  return owner !== null && owner !== myUid;
}

/** true agar yehi naam (exact match, pehle jaisa) kisi DOOSRE player ka hai. */
export async function isNameTakenByOther(name: string, myUid: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'publicProfiles'), where('name', '==', name), limit(5)));
  let taken = false;
  snap.forEach(d => {
    if (d.id !== myUid) taken = true;
  });
  return taken;
}

/**
 * Naya profile + uske lookup docs EK SAATH (atomic) likhta hai.
 * Agar koi value kisi aur ne beech mein le li ho to poora batch fail hota hai (kuch save nahi hota).
 */
export async function createProfileWithClaims(
  uid: string,
  profileDoc: Record<string, any>,
  claims: { gameUID: string; whatsapp: string; referralCode: string; name: string }
) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'players', uid), profileDoc);
  batch.set(doc(db, COL.gameUID, claims.gameUID), { uid });
  batch.set(doc(db, COL.whatsapp, claims.whatsapp), { uid });
  if (claims.referralCode) batch.set(doc(db, COL.refCode, claims.referralCode), { uid });
  batch.set(doc(db, 'publicProfiles', uid), { name: claims.name });
  await batch.commit();
}

/**
 * Profile edit: players doc update + naye lookup docs + purane (apne) lookup docs ki safai, sab atomic.
 */
export async function updateProfileWithClaims(
  uid: string,
  updates: { name: string; whatsapp: string; paymentMethod: string; paymentAccount: string },
  old: { whatsapp?: string }
) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'players', uid), updates);

  batch.set(doc(db, COL.whatsapp, updates.whatsapp), { uid });
  batch.set(doc(db, 'publicProfiles', uid), { name: updates.name });

  // Purana WhatsApp claim sirf tab delete karo jab wo exist karta ho aur MERA ho
  // (nonexistent doc delete karne par rules error dete hain).
  if (old.whatsapp && old.whatsapp !== updates.whatsapp) {
    try {
      const oldSnap = await getDoc(doc(db, COL.whatsapp, old.whatsapp));
      if (oldSnap.exists() && (oldSnap.data() as { uid?: string }).uid === uid) {
        batch.delete(doc(db, COL.whatsapp, old.whatsapp));
      }
    } catch {
      // purana claim reh bhi jaye to koi nuqsan nahi (wo isi player ka hai)
    }
  }

  await batch.commit();
}

/**
 * Self-heal: purane players (jinke lookup docs abhi nahi bane) jab login karte hain to unke docs
 * chup chaap ban jate hain. Har device par ek hi baar chalta hai (values badlen tab dobara).
 * Kabhi throw nahi karta, aur login ko slow nahi karta (await mat karo).
 */
export async function ensureLookups(
  uid: string,
  p: { gameUID?: string; whatsapp?: string; referralCode?: string; name?: string }
) {
  const flagKey = `cz_lookups_v1_${uid}`;
  const fingerprint = [p.gameUID, p.whatsapp, p.referralCode, p.name].join('|');
  try {
    if (localStorage.getItem(flagKey) === fingerprint) return;
  } catch {
    // localStorage band ho to bhi aage chalo
  }

  let allOk = true;
  const claims: [LookupKind, string | undefined][] = [
    ['gameUID', p.gameUID],
    ['whatsapp', p.whatsapp],
    ['refCode', p.referralCode]
  ];

  for (const [kind, value] of claims) {
    if (!value) continue;
    try {
      const owner = await lookupOwner(kind, value);
      if (owner === null) {
        await setDoc(doc(db, COL[kind], value), { uid });
      }
      // owner kisi aur ka ho (purana duplicate) to kuch nahi karna
    } catch {
      allOk = false;
    }
  }

  if (p.name) {
    try {
      await setDoc(doc(db, 'publicProfiles', uid), { name: p.name });
    } catch {
      allOk = false;
    }
  }

  if (allOk) {
    try {
      localStorage.setItem(flagKey, fingerprint);
    } catch {
      /* ignore */
    }
  }
}
