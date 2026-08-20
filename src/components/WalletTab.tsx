import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trophy, 
  History, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  Skull
} from 'lucide-react';
import { formatTimestamp } from '../firebase';

export const WalletTab: React.FC = () => {
  const { profile, transactions, openModal } = useAuth();
  const [txFilter, setTxFilter] = useState<'all' | 'deposits' | 'prizes' | 'withdrawals'>('all');

  const balance = profile?.walletBalance || 0;

  // Calculate totals from transactions
  let totalDeposited = 0;
  let totalWithdrawn = 0;
  let totalWon = 0;
  let totalKillsPrize = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'deposit') totalDeposited += tx.amount;
    if (tx.type === 'withdrawal') totalWithdrawn += Math.abs(tx.amount);
    if (tx.type === 'prize') totalWon += tx.amount;
    if (tx.type === 'kill_prize') totalKillsPrize += tx.amount;
  });

 const filteredTransactions = transactions
  .filter((tx) => {
    if (txFilter === 'deposits') return tx.type === 'deposit';
    if (txFilter === 'prizes') return tx.type === 'prize' || tx.type === 'kill_prize';
    if (txFilter === 'withdrawals') return tx.type.startsWith('withdrawal');
    return true;
  })
  .sort((a, b) => {
    const getTime = (t: any) => {
      const val = t.createdAt || t.timestamp;
      if (!val) return 0;
      if (typeof val.toMillis === 'function') return val.toMillis(); // Firestore Timestamp
      if (val instanceof Date) return val.getTime();
      if (typeof val === 'number') return val;
      return new Date(val).getTime();
    };
    return getTime(b) - getTime(a); // latest first
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Wallet Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#161A2E] via-[#1E2340] to-[#0F1220] border border-[#F5A623]/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-8xl font-heading">
          💳
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs uppercase font-tech font-bold tracking-wider text-[#7A84A8] flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-[#F5A623]" /> Available Wallet Balance
            </span>
            {profile && (
              <span className="text-[11px] text-[#2ECC71] font-tech font-bold bg-[#2ECC71]/10 px-2.5 py-0.5 rounded-full border border-[#2ECC71]/20">
                Verified Account
              </span>
            )}
          </div>

          <div className="font-heading font-black text-5xl sm:text-6xl text-[#F5A623] tracking-tight mb-6 text-gold-shadow">
            Rs {balance.toLocaleString()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <button
              onClick={() => openModal('deposit')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#F5A623] to-[#D4891C] text-black font-heading font-black text-lg uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-[#F5A623]/25 hover:brightness-110 active:scale-98 transition-all"
            >
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Deposit Funds</span>
            </button>

            <button
              onClick={() => openModal('withdraw')}
              className="flex items-center justify-center gap-2 bg-[#161A2E] border-2 border-[#F5A623] text-[#F5A623] font-heading font-black text-lg uppercase tracking-wider py-3.5 px-6 rounded-xl hover:bg-[#F5A623]/10 active:scale-98 transition-all"
            >
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              <span>Withdraw Cash</span>
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161A2E] border border-[#252B47] rounded-xl p-4">
          <span className="text-[11px] text-[#7A84A8] font-tech uppercase block mb-1">Total Deposited</span>
          <span className="font-heading font-black text-xl sm:text-2xl text-[#2ECC71]">
            Rs {totalDeposited.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#161A2E] border border-[#252B47] rounded-xl p-4">
          <span className="text-[11px] text-[#7A84A8] font-tech uppercase block mb-1">Total Withdrawn</span>
          <span className="font-heading font-black text-xl sm:text-2xl text-[#E74C3C]">
            Rs {totalWithdrawn.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#161A2E] border border-[#252B47] rounded-xl p-4">
          <span className="text-[11px] text-[#7A84A8] font-tech uppercase block mb-1">Tournament Prizes</span>
          <span className="font-heading font-black text-xl sm:text-2xl text-[#F5A623]">
            Rs {totalWon.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#161A2E] border border-[#252B47] rounded-xl p-4">
          <span className="text-[11px] text-[#7A84A8] font-tech uppercase block mb-1">Kill Rewards</span>
          <span className="font-heading font-black text-xl sm:text-2xl text-[#4A9EFF]">
            Rs {totalKillsPrize.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-[#161A2E] border border-[#252B47] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#F5A623]" />
            <h2 className="font-heading font-black text-xl uppercase tracking-wider text-[#EEF0FF]">
              Transaction History
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-tech uppercase">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                txFilter === 'all'
                  ? 'bg-[#F5A623] text-black font-bold'
                  : 'bg-[#0F1220] text-[#7A84A8] hover:text-[#EEF0FF]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTxFilter('deposits')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                txFilter === 'deposits'
                  ? 'bg-[#2ECC71] text-black font-bold'
                  : 'bg-[#0F1220] text-[#7A84A8] hover:text-[#EEF0FF]'
              }`}
            >
              Deposits
            </button>
            <button
              onClick={() => setTxFilter('prizes')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                txFilter === 'prizes'
                  ? 'bg-[#F5A623] text-black font-bold'
                  : 'bg-[#0F1220] text-[#7A84A8] hover:text-[#EEF0FF]'
              }`}
            >
              Prizes
            </button>
            <button
              onClick={() => setTxFilter('withdrawals')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                txFilter === 'withdrawals'
                  ? 'bg-[#E74C3C] text-black font-bold'
                  : 'bg-[#0F1220] text-[#7A84A8] hover:text-[#EEF0FF]'
              }`}
            >
              Withdrawals
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-[#7A84A8]">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-sm font-medium text-[#EEF0FF] mb-1">No transactions recorded</p>
            <p className="text-xs max-w-xs mx-auto">
              Deposit funds to join tournaments and win cash per kill.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#252B47]">
            {filteredTransactions.map((tx, idx) => {
              const isPositive = tx.amount > 0;
              const isPending = tx.type === 'withdrawal_pending';
              const isRejected = tx.type === 'withdrawal_rejected';

              return (
                <div key={tx.id || idx} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'deposit'
                          ? 'bg-[#2ECC71]/15 text-[#2ECC71]'
                          : tx.type === 'prize' || tx.type === 'kill_prize'
                          ? 'bg-[#F5A623]/15 text-[#F5A623]'
                          : tx.type === 'entry_fee'
                          ? 'bg-[#4A9EFF]/15 text-[#4A9EFF]'
                          : 'bg-[#E74C3C]/15 text-[#E74C3C]'
                      }`}
                    >
                      {tx.type === 'deposit' && <ArrowDownLeft className="w-5 h-5" />}
                      {tx.type === 'prize' && <Trophy className="w-5 h-5" />}
                      {tx.type === 'kill_prize' && <Skull className="w-5 h-5" />}
                      {tx.type === 'entry_fee' && <Trophy className="w-5 h-5" />}
                      {tx.type.startsWith('withdrawal') && <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[#EEF0FF] leading-snug">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-[#7A84A8]">
                        {formatTimestamp(tx.createdAt || tx.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-heading font-black text-base sm:text-lg ${
                        isPending
                          ? 'text-[#F5A623]'
                          : isRejected
                          ? 'text-[#7A84A8] line-through'
                          : isPositive
                          ? 'text-[#2ECC71]'
                          : 'text-[#E74C3C]'
                      }`}
                    >
                      {isPositive ? '+' : ''}Rs {Math.abs(tx.amount).toLocaleString()}
                    </div>

                    <div className="text-[10px] font-tech uppercase font-bold mt-0.5">
                      {isPending && (
                        <span className="text-[#F5A623] flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[#E74C3C] flex items-center justify-end gap-1">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                      {!isPending && !isRejected && (
                        <span className="text-[#2ECC71] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Processed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
