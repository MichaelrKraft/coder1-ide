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
        className="glass-button flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
          border: `1px solid rgba(0, 217, 255, 0.6)`,
          boxShadow: '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3), 0 4px 15px -3px rgba(0, 217, 255, 0.15), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          position: 'relative' as const,
          overflow: 'hidden',
          animation: 'borderGlow 2s ease-in-out infinite',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.8)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(251, 146, 60, 0.6), 0 0 30px rgba(251, 146, 60, 0.4), 0 8px 25px -5px rgba(251, 146, 60, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.backdropFilter = 'blur(6px)';
          (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(6px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.6)';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3), 0 4px 15px -3px rgba(0, 217, 255, 0.15), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.backdropFilter = 'blur(4px)';
          (e.currentTarget.style as any).WebkitBackdropFilter = 'blur(4px)';
        }}
        title="Connect Bridge - Link your local Claude CLI to the web IDE"
      >
        <span>Bridge</span>
      </button>

      {/* Coder1 Styled Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div 
            className="relative bg-bg-secondary border border-border-default rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 0 40px rgba(0, 217, 255, 0.2), 0 20px 80px rgba(0, 0, 0, 0.8)',
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
              style={{
                fontSize: '24px',
                lineHeight: '1',
              }}
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Connect Claude Code to Coder1 IDE
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Run this command on your computer to connect
            </p>
          
          {!bridgeConnected ? (
            <div className="space-y-5">
              <div className="text-center">
                <div 
                  className="text-7xl font-mono font-bold mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 0 30px rgba(0, 217, 255, 0.5)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {pairingCode || '------'}
                </div>
                <p className="text-sm text-text-muted">
                  This code expires in 5 minutes
                </p>
              </div>
              
              <div className="bg-bg-primary border border-border-default rounded-lg p-4">
                <p className="text-sm font-semibold mb-3 text-text-primary">Run on your computer:</p>
                <div 
                  className="bg-black rounded-md p-3 font-mono text-sm"
                  style={{
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <span className="text-green-400">$</span> <span className="text-white">coder1-bridge start</span>
                </div>
                <p className="text-xs text-text-muted mt-3">
                  Then enter the code above when prompted
                </p>
              </div>

              <div className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-default">
                <p className="font-semibold mb-2 text-sm text-text-secondary">Don't have the bridge installed?</p>
                <div 
                  className="bg-bg-primary rounded p-2 font-mono text-xs overflow-x-auto"
                  style={{
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <span className="text-gray-400">curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div 
                className="text-6xl mb-4"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.5))',
                }}
              >
                ✅
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Bridge Connected!
              </h3>
              <p className="text-sm text-text-secondary mt-2">
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