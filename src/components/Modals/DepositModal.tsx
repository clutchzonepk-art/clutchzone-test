import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, MessageCircle, Copy, Check } from 'lucide-react';
import { sendSupportMessage, openSupportChat } from '../../supportChat';

export const DepositModal: React.FC = () => {
  const { activeModal, closeModal, profile, currentUser, showToast } = useAuth();
  const [amount, setAmount] = useState('200');
  const [copied, setCopied] = useState(false);
  const [tid, setTid] = useState('');
  const [sending, setSending] = useState(false);

  if (activeModal !== 'deposit') return null;

  const quickAmounts = ['70', '140', '200', '500', '1000'];

  const handleCopyAgent = () => {
    navigator.clipboard.writeText('03230410819');
    setCopied(true);
    showToast('📋 Agent number copied: 03230410819', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Deposit request ab in-app Support Chat mein jati hai (WhatsApp nahi)
  const handleSendDepositRequest = async () => {
    if (!profile || !currentUser) {
      showToast('Please login first to deposit', 'error');
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 70) {
      showToast('❌ Please enter a valid amount (minimum Rs 70)!', 'error');
      return;
    }

    const cleanTid = tid.trim();
    if (!/^[A-Za-z0-9]{6,20}$/.test(cleanTid)) {
      showToast('❌ Please enter the JazzCash Transaction ID (TID) from your payment SMS!', 'error');
      return;
    }

    setSending(true);
    try {
      await sendSupportMessage({
        chatUid: currentUser.uid,
        playerName: profile.name,
        text:
          `💰 Deposit Request\n` +
          `Amount: Rs ${parsedAmount}\n` +
          `Transaction ID (TID): ${cleanTid}\n` +
          `Player: ${profile.name}\n` +
          `Game UID: ${profile.gameUID}`,
        role: 'player',
        senderId: currentUser.uid
      });
      setTid('');
      closeModal();
      showToast('✅ Deposit request sent! Balance 2-5 minutes mein add hoga. Reply chat mein aayega.', 'success');
      openSupportChat();
    } catch (err) {
      console.error('Deposit request error:', err);
      showToast('❌ Request send nahi hui. Internet check karke dobara try karo.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="w-full sm:max-w-md bg-[#0F1220] border-t sm:border border-[#F5A623]/30 sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-[#7A84A8] hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl uppercase text-[#EEF0FF]">
              Deposit Wallet Funds
            </h2>
            <p className="text-xs text-[#7A84A8] mt-0.5">
              Transfer to our official JazzCash agent for instant wallet balance top-up.
            </p>
          </div>

          {/* Official Agent Box */}
          <div className="bg-[#161A2E] border border-[#252B47] rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-tech font-bold uppercase text-[#F5A623]">
              Official Verified Deposit Agent
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono font-bold text-lg text-[#EEF0FF]">
                  03230410819
                </div>
                <div className="text-[11px] text-[#7A84A8]">
                  Account Title: <strong>Muhammad Bilal / JazzCash Only</strong>
                </div>
              </div>

              <button
                onClick={handleCopyAgent}
                className="px-3 py-1.5 bg-[#1E2340] border border-[#252B47] hover:border-[#F5A623] text-xs font-tech font-bold text-[#EEF0FF] rounded-lg flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2ECC71]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
          </div>

          {/* Preset Amounts */}
          <div>
            <label className="block text-xs font-tech font-bold uppercase text-[#7A84A8] mb-1.5">
              Select Deposit Amount (PKR)
            </label>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`py-2 rounded-lg text-xs font-tech font-bold transition-all ${
                    amount === amt
                      ? 'bg-[#F5A623] text-black shadow-sm'
                      : 'bg-[#161A2E] border border-[#252B47] text-[#EEF0FF] hover:border-[#7A84A8]'
                  }`}
                >
                  Rs {amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Or enter custom amount (e.g. 500)"
              min={70}
              className="w-full bg-[#161A2E] border border-[#252B47] text-sm text-[#EEF0FF] px-3.5 py-2.5 rounded-xl focus:border-[#F5A623] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-tech font-bold uppercase text-[#7A84A8] mb-1.5">
              JazzCash Transaction ID (TID)
            </label>
            <input
              type="text"
              value={tid}
              onChange={(e) => setTid(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
              placeholder="Payment SMS mein likha TID (e.g. 12345678901)"
              className="w-full bg-[#161A2E] border border-[#252B47] text-sm text-[#EEF0FF] px-3.5 py-2.5 rounded-xl focus:border-[#F5A623] focus:outline-none transition-colors font-mono"
            />
          </div>

          <div className="text-xs text-[#7A84A8] space-y-1 bg-[#0F1220] p-3 rounded-xl border border-[#252B47]">
            <div>💡 <strong>How it works:</strong></div>
            <p>1. Send payment to agent account above.</p>
            <p>2. Enter the Transaction ID (TID) from your payment SMS and send the request in-app.</p>
            <p>3. Balance is credited to your wallet in <strong>2-5 minutes</strong>!</p>
          </div>

          <button
            onClick={handleSendDepositRequest}
            disabled={sending}
            className="w-full py-3.5 bg-[#F5A623] text-black font-heading font-black text-base uppercase tracking-wider rounded-xl shadow-lg shadow-[#F5A623]/20 hover:brightness-110 active:scale-98 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>{sending ? 'SENDING...' : 'SEND DEPOSIT REQUEST'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
