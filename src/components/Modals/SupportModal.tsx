import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { openSupportChat } from '../../supportChat';

// Pehle ye WhatsApp / ticket form kholta tha. Ab 'support' modal ki jagah seedha in-app Support Chat khulti hai.
export const SupportModal: React.FC = () => {
  const { activeModal, closeModal, currentUser, showToast } = useAuth();

  useEffect(() => {
    if (activeModal !== 'support') return;
    closeModal();
    if (currentUser) {
      openSupportChat();
    } else {
      showToast('Support chat ke liye pehle login karo.', 'info');
    }
  }, [activeModal]);

  return null;
};
