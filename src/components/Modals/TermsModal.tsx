import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, ShieldCheck, Check } from 'lucide-react';

export const TermsModal: React.FC = () => {
  const { activeModal, closeModal } = useAuth();

  if (activeModal !== 'terms') return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="w-full sm:max-w-lg bg-[#0F1220] border-t sm:border border-[#F5A623]/30 sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-[#7A84A8] hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#F5A623]" />
            <h2 className="font-heading font-black text-2xl uppercase text-[#EEF0FF]">
              Terms &amp; Tournament Rules
            </h2>
          </div>

          <div className="text-xs text-[#7A84A8] space-y-3.5 leading-relaxed divide-y divide-[#252B47]">
            <div className="pt-2">
              <h3 className="font-heading font-bold text-sm text-[#F5A623] uppercase">1. Entry Fee &amp; Slot Confirmation</h3>
              <p>Players must deposit the required entry fee before the tournament lobby begins. Entry fees are non-refundable once the custom match room has started.</p>
            </div>

            <div className="pt-2">
              <h3 className="font-heading font-bold text-sm text-[#F5A623] uppercase">2. Prize Pool &amp; Kill Bonuses</h3>
              <p>Prizes are calculated and distributed based on final standings: 1st Rs 600, 2nd Rs 400, 3rd Rs 200, plus Rs 20 per confirmed kill. Balance is automatically credited within 24 hours after match completion.</p>
            </div>

            <div className="pt-2">
              <h3 className="font-heading font-bold text-sm text-[#F5A623] uppercase">3. Strict Fair Play &amp; Anti-Cheat</h3>
              <p>Hacking, third-party aimbots, script modding, or team collusion in solo tournaments will result in an immediate permanent ban and confiscation of all winnings.</p>
            </div>

            <div className="pt-2">
              <h3 className="font-heading font-bold text-sm text-[#F5A623] uppercase">4. Withdrawal Regulations</h3>
              <p>The minimum withdrawal is Rs 100. Payouts are executed via JazzCash or EasyPaisa within 24 hours.</p>
            </div>

            <div className="pt-2">
              <h3 className="font-heading font-bold text-sm text-[#F5A623] uppercase">5. Single UID Registration</h3>
              <p>Each player is entitled to one registered account with one verified Game UID. ClutchZone reserves the right to suspend duplicate accounts attempting fee abuse.</p>
            </div>

            <div className="pt-2">
              <h3 className="font-heading font-bold text-sm text-[#F5A623] uppercase">6. Match Disputes &amp; Screen Recordings</h3>
              <p>Any kill count dispute or match recording review must be submitted to WhatsApp support within 12 hours of match completion.</p>
            </div>
          </div>

          <div className="p-3 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl text-xs text-[#F5A623]">
            ⚠️ By registering on ClutchZone and entering tournaments, you agree to all fair play terms and conditions above.
          </div>

          <button
            onClick={closeModal}
            className="w-full py-3 bg-[#F5A623] text-black font-heading font-black text-base uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span>I UNDERSTAND &amp; ACCEPT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
