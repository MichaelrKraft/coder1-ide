'use client';

import React, { useState, useEffect } from 'react';

export function BridgeConnectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);

  const generatePairingCode = async () => {
    setIsLoading(true);
    try {
      // Generate a user ID (in production, use actual user auth)
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId);
      }

      const response = await fetch(`/api/bridge/generate-code?userId=${userId}`);
      const data = await response.json();
      
      if (data.code) {
        setPairingCode(data.code);
        setIsOpen(true);
        
        // Start checking for connection
        checkBridgeConnection(userId);
      }
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBridgeConnection = (userId: string) => {
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
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to check bridge status:', error);
      }
    }, 2000);

    // Stop checking after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <>
      <button
        onClick={generatePairingCode}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 disabled:opacity-50 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
      >
        {isLoading ? 'Generating...' : '🌉 Connect Bridge'}
      </button>

      {/* Simple Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold mb-2">Connect Your Claude CLI</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Run this command on your computer to connect
            </p>
          
          {!bridgeConnected ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-6xl font-mono font-bold text-blue-600 mb-4">
                  {pairingCode || '------'}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  This code expires in 5 minutes
                </p>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Run on your computer:</p>
                <code className="block bg-black text-green-400 p-2 rounded text-sm">
                  coder1-bridge start
                </code>
                <p className="text-xs text-gray-600 mt-2">
                  Then enter the code above when prompted
                </p>
              </div>

              <div className="text-xs text-gray-500">
                <p className="font-semibold mb-1">Don't have the bridge installed?</p>
                <code className="block bg-gray-200 p-2 rounded text-xs mb-2">
                  curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
                </code>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-green-600">Bridge Connected!</h3>
              <p className="text-sm text-gray-600 mt-2">
                You can now use Claude commands in the terminal
              </p>
            </div>
          )}
          </div>
        </div>
      )}
    </>
  );
}