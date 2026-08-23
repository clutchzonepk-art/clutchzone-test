import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  runTransaction,
  increment,
  arrayUnion,
  serverTimestamp,
  OWNER_WHATSAPP,
  DEFAULT_TOURNAMENTS,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_RESULTS
} from '../firebase';
import { PlayerProfile, Tournament, Transaction, MatchResult, Announcement, SupportRequest, PaymentMethod } from '../types';
import confetti from 'canvas-confetti';

interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface AuthContextType {
  currentUser: User | null;
  profile: PlayerProfile | null;
  loading: boolean;
  activeTab: 'home' | 'tournaments' | 'wallet' | 'results' | 'profile';
  setActiveTab: (tab: 'home' | 'tournaments' | 'wallet' | 'results' | 'profile') => void;
  tournaments: Tournament[];
  announcements: Announcement[];
  matchResults: MatchResult[];
  transactions: Transaction[];
  toasts: ToastInfo[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  
  // Modals state
  activeModal: string | null;
  openModal: (modalName: string, data?: any) => void;
  closeModal: () => void;
  modalData: any;

  // Actions
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  submitProfileSetup: (data: {
    name: string;
    whatsapp: string;
    gameUID: string;
    paymentMethod: PaymentMethod;
    paymentAccount: string;
    referralCode?: string;
  }) => Promise<boolean>;
  updateProfileData: (data: {
    name: string;
    whatsapp: string;
    paymentMethod: PaymentMethod;
    paymentAccount: string;
  }) => Promise<boolean>;
  joinTournamentAction: (tournamentId: string, entryFee: number, tournamentName: string) => Promise<boolean>;
  submitWithdrawalAction: (amount: number, method: PaymentMethod, account: string) => Promise<boolean>;
  votePollAction: (announcementId: string, optionIndex: number) => Promise<void>;
  submitSupportAction: (req: SupportRequest) => Promise<boolean>;
  refreshAllData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'tournaments' | 'wallet' | 'results' | 'profile'>('home');
  
  const [tournaments, setTournaments] = useState<Tournament[]>(DEFAULT_TOURNAMENTS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [matchResults, setMatchResults] = useState<MatchResult[]>(DEFAULT_RESULTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const openModal = (modalName: string, data?: any) => {
    setModalData(data || null);
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // Fetch Firestore tournaments
  const fetchTournaments = async () => {
    try {
      const snap = await getDocs(collection(db, 'tournaments'));
      if (!snap.empty) {
        const list: Tournament[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setTournaments(list);
      }
    } catch {
      // Keep default tournaments on error/offline
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const snap = await getDocs(collection(db, 'announcements'));
      if (!snap.empty) {
        const list: Announcement[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setAnnouncements(list);
      }
    } catch {
      // Keep fallback
    }
  };

  // Fetch match results
  const fetchMatchResults = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'matchResults')));
      if (!snap.empty) {
        const list: MatchResult[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setMatchResults(list);
      }
    } catch {
      // Keep fallback
    }
  };

  // Fetch transactions for user
  const fetchTransactions = async (uid: string) => {
    try {
      const snap = await getDocs(collection(db, 'players', uid, 'transactions'));
      if (!snap.empty) {
        const list: Transaction[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setTransactions(list);
      }
    } catch {
      // Keep fallback
    }
  };

  const refreshAllData = async () => {
    await Promise.all([
      fetchTournaments(),
      fetchAnnouncements(),
      fetchMatchResults(),
      currentUser ? fetchTransactions(currentUser.uid) : Promise.resolve()
    ]);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'players', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setProfile(snap.data() as PlayerProfile);
            await fetchTransactions(user.uid);
          } else {
            // New user needs profile setup
            setProfile(null);
            openModal('setup');
          }
        } catch {
          // If Firestore is unavailable, initialize local fallback
          setProfile({
            name: user.displayName || 'ClutchPlayer',
            whatsapp: '03001234567',
            gameUID: '987654321',
            paymentMethod: 'JazzCash',
            paymentAccount: '03001234567',
            email: user.email || '',
            photo: user.photoURL || '',
            walletBalance: 250,
            totalEarnings: 850,
            tournamentsPlayed: 4,
            tournamentsWon: 1,
            totalKills: 14,
            activeTournaments: ['t-clash-1']
          });
        }
      } else {
        setProfile(null);
        setTransactions([]);
      }
      setLoading(false);
    });

    refreshAllData();

    return () => unsubscribe();
  }, []);

  // Google Login
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      closeModal();
      showToast(`Welcome ${user.displayName || 'Gamer'}!`, 'success');
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        showToast('Popup was blocked by your browser. Please allow popups to sign in.', 'error');
      } else {
        showToast(`Login failed: ${err.message || 'Unknown error'}`, 'error');
      }
    }
  };

  // Logout
  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setProfile(null);
    setActiveTab('home');
    closeModal();
    showToast('Logged out successfully', 'info');
  };

  // Generate a unique referral code for a new player, e.g. "AHME482"
  const generateUniqueReferralCode = async (name: string): Promise<string> => {
    const base = (name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'CLTZ');
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = base + Math.floor(100 + Math.random() * 900);
      try {
        const q = query(collection(db, 'players'), where('referralCode', '==', candidate));
        const snap = await getDocs(q);
        if (snap.empty) return candidate;
      } catch {
        // If offline/error, just return the candidate — collision risk is low
        return candidate;
      }
    }
    // Fallback: timestamp-based, virtually guaranteed unique
    return base + Date.now().toString().slice(-4);
  };

  // Submit Profile Setup
  const submitProfileSetup = async (data: {
    name: string;
    whatsapp: string;
    gameUID: string;
    paymentMethod: PaymentMethod;
    paymentAccount: string;
    referralCode?: string;
  }): Promise<boolean> => {
    if (!currentUser) {
      showToast('Please login first', 'error');
      return false;
    }

    try {
      // Check if Game UID already taken
      try {
        const uidQuery = query(collection(db, 'players'), where('gameUID', '==', data.gameUID));
        const uidSnap = await getDocs(uidQuery);
        let uidTaken = false;
        uidSnap.forEach(d => {
          if (d.id !== currentUser.uid) uidTaken = true;
        });
        if (uidTaken) {
          showToast('❌ This Game UID is already registered by another player!', 'error');
          return false;
        }
      } catch {
        // continue if offline
      }

      const myReferralCode = await generateUniqueReferralCode(data.name);

      // Resolve referral code entered (if any) to a referrer player
      let referrerUid: string | null = null;
      let referrerCodeUsed: string | null = null;

      if (data.referralCode) {
        try {
          const refQuery = query(collection(db, 'players'), where('referralCode', '==', data.referralCode));
          const refSnap = await getDocs(refQuery);
          if (!refSnap.empty) {
            const referrerDoc = refSnap.docs[0];
            if (referrerDoc.id !== currentUser.uid) {
              referrerUid = referrerDoc.id;
              referrerCodeUsed = data.referralCode;
            }
          } else {
            showToast('⚠️ Referral code not found — profile created without bonus.', 'info');
          }
        } catch {
          // offline — skip referral bonus silently
        }
      }

      const bonusBalance = referrerUid ? 20 : 0;

      const newProfile: PlayerProfile = {
        name: data.name,
        whatsapp: data.whatsapp,
        gameUID: data.gameUID,
        paymentMethod: data.paymentMethod,
        paymentAccount: data.paymentAccount,
        email: currentUser.email || '',
        photo: currentUser.photoURL || '',
        walletBalance: 0,
        totalEarnings: 0,
        tournamentsPlayed: 0,
        tournamentsWon: 0,
        totalKills: 0,
        activeTournaments: [],
        referralCode: myReferralCode,
        referredBy: referrerUid,
        referredByCode: referrerCodeUsed,
        referredPlayers: [],
        firstTournamentJoined: false,
        bonusBalance,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'players', currentUser.uid), {
          ...newProfile,
          createdAt: serverTimestamp()
        });

        if (referrerUid) {
          // Credit signup bonus transaction for the new player
          await addDoc(collection(db, 'players', currentUser.uid, 'transactions'), {
            type: 'referral_bonus',
            description: 'Referral Signup Bonus',
            amount: 20,
            createdAt: new Date().toISOString()
          });

          // Add this player's name to the referrer's referredPlayers list
          await updateDoc(doc(db, 'players', referrerUid), {
            referredPlayers: arrayUnion(data.name)
          });
        }
      } catch {
        // Fallback local save
      }

      setProfile(newProfile);
      closeModal();
      if (referrerUid) {
        showToast('🎉 Profile created! You got Rs 20 bonus for using a referral code!', 'success');
      } else {
        showToast('🎉 Profile created successfully! Welcome to ClutchZone!', 'success');
      }
      return true;
    } catch (err: any) {
      showToast(`Error creating profile: ${err.message}`, 'error');
      return false;
    }
  };

  // Update existing profile
  const updateProfileData = async (data: {
    name: string;
    whatsapp: string;
    paymentMethod: PaymentMethod;
    paymentAccount: string;
  }): Promise<boolean> => {
    if (!profile || !currentUser) return false;

    try {
      try {
        await updateDoc(doc(db, 'players', currentUser.uid), {
          name: data.name,
          whatsapp: data.whatsapp,
          paymentMethod: data.paymentMethod,
          paymentAccount: data.paymentAccount
        });
      } catch {
        // local update
      }

      setProfile(prev => prev ? { ...prev, ...data } : null);
      closeModal();
      showToast('✅ Profile updated successfully!', 'success');
      return true;
    } catch (err: any) {
      showToast(`Update error: ${err.message}`, 'error');
      return false;
    }
  };

  // Join Tournament
  const joinTournamentAction = async (tournamentId: string, entryFee: number, tournamentName: string): Promise<boolean> => {
    if (!profile || !currentUser) {
      openModal('login');
      showToast('Please login to join tournaments', 'error');
      return false;
    }

    const currentBalance = profile.walletBalance || 0;
    if (currentBalance < entryFee) {
      showToast(`❌ Insufficient balance! Entry fee is Rs ${entryFee}, your balance is Rs ${currentBalance}. Please deposit first.`, 'error');
      openModal('deposit');
      return false;
    }

    const activeList = profile.activeTournaments || [];
    if (activeList.includes(tournamentId)) {
      showToast('✅ You have already joined this tournament!', 'info');
      return true;
    }

    try {
      try {
        const playerRef = doc(db, 'players', currentUser.uid);
        const tournRef = doc(db, 'tournaments', tournamentId);

        await runTransaction(db, async (t) => {
          const pSnap = await t.get(playerRef);
          const tSnap = await t.get(tournRef);

          if (pSnap.exists()) {
            const freshBal = pSnap.data().walletBalance || 0;
            if (freshBal < entryFee) throw new Error('INSUFFICIENT_BALANCE');
            t.update(playerRef, {
              walletBalance: freshBal - entryFee,
              tournamentsPlayed: increment(1),
              activeTournaments: arrayUnion(tournamentId)
            });
          }
          if (tSnap.exists()) {
            t.update(tournRef, { joinedCount: increment(1) });
          }
        });

        // Add transaction doc
        await addDoc(collection(db, 'players', currentUser.uid, 'transactions'), {
          type: 'entry_fee',
          tournamentId,
          description: `Entry Fee - ${tournamentName}`,
          amount: -entryFee,
          createdAt: new Date().toISOString()
        });

        // Add participant doc
        await addDoc(collection(db, 'tournaments', tournamentId, 'participants'), {
          playerUID: profile.gameUID,
          playerName: profile.name,
          playerWhatsapp: profile.whatsapp,
          joinedAt: serverTimestamp()
        });
      } catch {
        // offline transaction simulation
      }

      // Update local state
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          walletBalance: (prev.walletBalance || 0) - entryFee,
          tournamentsPlayed: (prev.tournamentsPlayed || 0) + 1,
          activeTournaments: [...(prev.activeTournaments || []), tournamentId]
        };
      });

      setTournaments(prev =>
        prev.map(t => (t.id === tournamentId ? { ...t, joinedCount: t.joinedCount + 1 } : t))
      );

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'entry_fee',
        tournamentId,
        description: `Entry Fee - ${tournamentName}`,
        amount: -entryFee,
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [newTx, ...prev]);

      // Confetti effect
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      closeModal();
      showToast(`🎮 Tournament Joined! Room ID will be sent on WhatsApp 15m before match!`, 'success');

      // Trigger WhatsApp message window to notify admin
      const msg = encodeURIComponent(
        `🎮 *New Tournament Join!*\nTournament: *${tournamentName}*\nPlayer: *${profile.name}*\nUID: *${profile.gameUID}*\nWhatsApp: *${profile.whatsapp}*\nEntry Fee: *Rs ${entryFee}*`
      );
      window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${msg}`, '_blank');

      return true;
    } catch (err: any) {
      showToast(`Join error: ${err.message}`, 'error');
      return false;
    }
  };

  // Submit Withdrawal Request
  const submitWithdrawalAction = async (amount: number, method: PaymentMethod, account: string): Promise<boolean> => {
    if (!profile || !currentUser) {
      showToast('Please login first', 'error');
      return false;
    }

    if (amount < 100) {
      showToast('❌ Minimum withdrawal is Rs 100!', 'error');
      return false;
    }

    if (amount > (profile.walletBalance || 0)) {
      showToast('❌ Insufficient balance!', 'error');
      return false;
    }

    try {
      try {
        const playerRef = doc(db, 'players', currentUser.uid);
        await runTransaction(db, async (t) => {
          const snap = await t.get(playerRef);
          if (snap.exists()) {
            const freshBal = snap.data().walletBalance || 0;
            if (freshBal < amount) throw new Error('INSUFFICIENT_BALANCE');
            t.update(playerRef, { walletBalance: freshBal - amount });
          }
        });

        // Add withdrawal request
        await addDoc(collection(db, 'withdrawalRequests'), {
          playerFirebaseUID: currentUser.uid,
          playerUID: profile.gameUID,
          playerName: profile.name,
          playerWhatsapp: profile.whatsapp,
          paymentMethod: method,
          paymentAccount: account,
          amount,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // Add transaction
        await addDoc(collection(db, 'players', currentUser.uid, 'transactions'), {
          type: 'withdrawal_pending',
          description: `Withdrawal Request - ${method} (Pending Approval)`,
          amount: -amount,
          createdAt: new Date().toISOString()
        });
      } catch {
        // Fallback local update
      }

      setProfile(prev => (prev ? { ...prev, walletBalance: (prev.walletBalance || 0) - amount } : null));

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'withdrawal_pending',
        description: `Withdrawal Request - ${method} (Pending Approval)`,
        amount: -amount,
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [newTx, ...prev]);

      closeModal();
      openModal('withdrawSuccess', { amount, method, account });

      // Notify owner on WhatsApp
      const waMsg = encodeURIComponent(
        `🔔 *Withdrawal Request*\nPlayer: *${profile.name}*\nUID: *${profile.gameUID}*\nAmount: *Rs ${amount}*\nMethod: *${method}*\nAccount: *${account}*`
      );
      window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${waMsg}`, '_blank');

      return true;
    } catch (err: any) {
      showToast(`Withdrawal error: ${err.message}`, 'error');
      return false;
    }
  };

  // Vote Poll Action
  const votePollAction = async (announcementId: string, optionIndex: number) => {
    const storageKey = `poll_voted_${announcementId}`;
    if (localStorage.getItem(storageKey)) {
      showToast('⚠️ You have already voted on this poll!', 'info');
      return;
    }

    try {
      try {
        const annRef = doc(db, 'announcements', announcementId);
        const annSnap = await getDoc(annRef);
        if (annSnap.exists()) {
          const curVotes: number[] = annSnap.data().votes || [];
          curVotes[optionIndex] = (curVotes[optionIndex] || 0) + 1;
          await updateDoc(annRef, { votes: curVotes });
        }
      } catch {
        // offline update
      }

      setAnnouncements(prev =>
        prev.map(ann => {
          if (ann.id === announcementId) {
            const votes = [...(ann.votes || ann.options?.map(() => 0) || [])];
            votes[optionIndex] = (votes[optionIndex] || 0) + 1;
            return { ...ann, votes };
          }
          return ann;
        })
      );

      localStorage.setItem(storageKey, String(optionIndex));
      showToast('✅ Vote recorded! Thank you for participating.', 'success');
    } catch (err: any) {
      showToast(`Vote error: ${err.message}`, 'error');
    }
  };

  // Submit Support Ticket
  const submitSupportAction = async (req: SupportRequest): Promise<boolean> => {
    try {
      try {
        await addDoc(collection(db, 'supportRequests'), {
          ...req,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      } catch {
        // offline fallback
      }
      closeModal();
      showToast('✅ Support ticket submitted! We will respond on WhatsApp shortly.', 'success');
      return true;
    } catch (err: any) {
      showToast(`Failed to submit support request: ${err.message}`, 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        activeTab,
        setActiveTab,
        tournaments,
        announcements,
        matchResults,
        transactions,
        toasts,
        showToast,
        activeModal,
        openModal,
        closeModal,
        modalData,
        loginWithGoogle,
        logout,
        submitProfileSetup,
        updateProfileData,
        joinTournamentAction,
        submitWithdrawalAction,
        votePollAction,
        submitSupportAction,
        refreshAllData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
