'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BridgeSetupContent } from './BridgeSetupContent';

interface SetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showDontShowAgain?: boolean;
}

export function SetupInstructionsModal({
  isOpen,
  onClose,
  showDontShowAgain = false
}: SetupInstructionsModalProps) {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Generate pairing code on mount
  useEffect(() => {
    if (isOpen && !pairingCode) {
      generatePairingCode();
    }
  }, [isOpen, pairingCode]);

  // Poll for bridge connection
  useEffect(() => {
    if (!pairingCode) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/bridge/status?userId=${userId}`);
        const data = await response.json();

        if (data.connected) {
          setBridgeConnected(true);
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to check bridge status:', error);
      }
    };

    const interval = setInterval(checkConnection, 2000);
    checkConnection();

    const timeout = setTimeout(() => clearInterval(interval), 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pairingCode]);

  const generatePairingCode = async () => {
    try {
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId);
      }

      const response = await fetch(`/api/bridge/generate-code?userId=${userId}`);
      const data = await response.json();

      if (data.code) {
        setPairingCode(data.code);
      }
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('coder1-bridge-setup-viewed', 'true');
    }
    setPairingCode(null);
    setBridgeConnected(false);
    onClose();
  };

  const handleDontShowAgainChange = (checked: boolean) => {
    setDontShowAgain(checked);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative max-w-md w-full rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(25, 25, 25, 0.98) 100%)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="pt-6 pb-2 text-center">
          <h2
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Connect to Coder1
          </h2>
        </div>

        {/* Content */}
        <BridgeSetupContent
          pairingCode={pairingCode}
          onRefreshCode={generatePairingCode}
          onClose={handleClose}
          bridgeConnected={bridgeConnected}
          showDontShowAgain={showDontShowAgain}
          onDontShowAgainChange={handleDontShowAgainChange}
        />
      </div>
    </div>
  );
}