'use client';

import React, { useState, useEffect } from 'react';

interface WelcomeScreenProps {
  onDismiss?: () => void;
  onBridgeClick?: () => void;
}

export function WelcomeScreen({ onDismiss, onBridgeClick }: WelcomeScreenProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProduction, setIsProduction] = useState(true);
  
  // Detect if running on localhost or production
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsProduction(!window.location.hostname.includes('localhost'));
    }
  }, []);
  
  const handleBridgeClick = async () => {
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
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center h-full bg-bg-primary p-4">
      <div className="max-w-3xl w-full">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🌉 Connect Claude Code to Coder1 IDE
          </h1>
          
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
            <p className="text-base font-bold text-red-400 text-center">
              ⚠️ IMPORTANT: DO NOT TYPE COMMANDS IN THE WEB TERMINAL! ⚠️
            </p>
            <p className="text-xs text-red-300 text-center mt-1">
              Please follow the Instructions below and run commands on your local computer
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-bg-primary rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-blue-400">
                📍 Setup Instructions
              </h2>
              
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3">
                  <h3 className="text-sm font-semibold text-green-400 mb-1">Step 1: Open YOUR Local Terminal</h3>
                  <ul className="text-xs space-y-0.5 text-gray-300">
                    <li>• <span className="text-yellow-400">Mac:</span> Press Cmd+Space, type "Terminal"</li>
                    <li>• <span className="text-yellow-400">Windows:</span> Press Win+R, type "cmd"</li>
                    <li>• <span className="text-yellow-400">Linux:</span> Press Ctrl+Alt+T</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-500 pl-3">
                  <h3 className="text-sm font-semibold text-green-400 mb-1">Step 2: Install Bridge (one-time setup)</h3>
                  <div className="bg-black rounded p-2 font-mono text-xs">
                    <span className="text-green-400">$</span> <span className="text-white">
                      curl -sL {isProduction ? 'https://coder1-ide.onrender.com' : 'http://localhost:3001'}/install-bridge.sh | bash
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">This installs the bridge tool that connects your Claude CLI to the IDE</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-3">
                  <h3 className="text-sm font-semibold text-green-400 mb-1">Step 3: Start Bridge (keep it running)</h3>
                  <div className="bg-black rounded p-2 font-mono text-xs">
                    <span className="text-green-400">$</span> <span className="text-white">
                      coder1-bridge start{isProduction ? ' &' : ' --dev'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {isProduction 
                      ? '💡 Pro tip: Use & to run in background for seamless experience' 
                      : 'Note: --dev flag connects to localhost:3001'}
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-3">
                  <h3 className="text-sm font-semibold text-green-400 mb-1">Step 4: Enter the 6-digit code</h3>
                  <p className="text-xs text-gray-300">
                    Click the Bridge Button Below to get your pairing code
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons with uniform glowing style */}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={handleBridgeClick}
                disabled={isLoading}
                className="px-6 py-2.5 bg-bg-secondary border border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all duration-200 font-semibold text-sm shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                title="Get your pairing code to connect Claude Code CLI"
              >
                {isLoading ? 'Loading...' : 'Bridge'}
              </button>
              {onDismiss && (
                <>
                  <button
                    onClick={onDismiss}
                    className="px-6 py-2.5 bg-bg-secondary border border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all duration-200 text-sm shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                    title="Skip setup for now and explore the IDE"
                  >
                    Skip Setup
                  </button>
                  <button
                    onClick={onDismiss}
                    className="px-6 py-2.5 bg-bg-secondary border border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all duration-200 font-semibold text-sm shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                    title="I've completed the setup - continue to IDE"
                  >
                    I've Completed Setup →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Simple Bridge Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setIsModalOpen(false)} 
          />
          <div className="relative max-w-md w-full bg-bg-secondary rounded-lg p-6 shadow-2xl border border-cyan-500/50">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold mb-4 text-cyan-400">
              Bridge Connection Code
            </h2>
            
            <div className="text-center mb-4">
              <div className="text-4xl font-mono font-bold text-cyan-300 mb-2">
                {pairingCode}
              </div>
              <p className="text-sm text-gray-400">
                Enter this code in your terminal after running: coder1-bridge start
              </p>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              This code expires in 5 minutes
            </div>
            
            {isProduction && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400 font-semibold mb-1">🎯 Seamless Experience</p>
                <p className="text-xs text-gray-400">
                  Once connected, the bridge stays active in the background. 
                  You can close this window and return anytime without re-pairing!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}