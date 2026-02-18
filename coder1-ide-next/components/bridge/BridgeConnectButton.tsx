'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { BridgeSetupContent } from './BridgeSetupContent';

interface BridgeConnectButtonProps {
  /** External control: when true, modal is open */
  isOpen?: boolean;
  /** External control: called when modal should close */
  onClose?: () => void;
  /** Hide the button, only render the modal (for use in StatusBar) */
  modalOnly?: boolean;
}

export function BridgeConnectButton({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  modalOnly = false
}: BridgeConnectButtonProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const authUser = useAuthStore((s) => s.user);

  // Use external control if provided, otherwise use internal state
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const setIsOpen = isControlled
    ? (open: boolean) => { if (!open && externalOnClose) externalOnClose(); }
    : setInternalIsOpen;

  const checkBridgeConnection = useCallback((userId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bridge/status?userId=${userId}`);
        const data = await response.json();

        if (data.connected) {
          setBridgeConnected(true);
          clearInterval(interval);
          setTimeout(() => {
            setIsOpen(false);
            setPairingCode('');
            setBridgeConnected(false);
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to check bridge status:', error);
      }
    }, 2000);

    // Stop checking after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);

    return interval;
  }, [setIsOpen]);

  const generatePairingCode = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = authUser?.id || localStorage.getItem('userId') || `user_${Date.now()}`;
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId);
      }

      const response = await fetch(`/api/bridge/generate-code?userId=${userId}`);
      const data = await response.json();

      if (data.code) {
        setPairingCode(data.code);
        setIsOpen(true);
        checkBridgeConnection(userId);
      }
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id, checkBridgeConnection, setIsOpen]);

  // Listen for openBridgeModal event
  useEffect(() => {
    const handleOpenBridgeModal = () => generatePairingCode();
    window.addEventListener('openBridgeModal', handleOpenBridgeModal);
    (window as any).openBridgeModal = handleOpenBridgeModal;

    return () => {
      window.removeEventListener('openBridgeModal', handleOpenBridgeModal);
      delete (window as any).openBridgeModal;
    };
  }, [generatePairingCode]);

  // Auto-generate pairing code when externally opened
  useEffect(() => {
    if (isControlled && externalIsOpen && !pairingCode && !isLoading) {
      generatePairingCode();
    }
  }, [isControlled, externalIsOpen, pairingCode, isLoading, generatePairingCode]);

  const handleClose = () => {
    setIsOpen(false);
    setPairingCode('');
    setBridgeConnected(false);
  };

  return (
    <>
      {/* Button (unless modal-only mode) */}
      {!modalOnly && (
        <button
          onClick={generatePairingCode}
          disabled={isLoading}
          className="glass-button flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
            border: '1px solid rgba(0, 217, 255, 0.6)',
            boxShadow: '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3)',
          }}
          title="Connect Bridge"
        >
          <span>Bridge</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
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
            />
          </div>
        </div>
      )}
    </>
  );
}