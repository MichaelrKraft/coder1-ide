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
    <div className="flex items-start justify-center h-full bg-bg-primary p-2 pt-4">
      <div className="max-w-xl w-full">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-3 shadow-xl">
          <h1 className="text-lg font-bold mb-2 text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Connect Claude Code
          </h1>
          
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-1 mb-2">
            <p className="text-xs font-bold text-red-400 text-center">
              ⚠️ DO NOT TYPE IN WEB TERMINAL!
            </p>
          </div>

          <div className="space-y-1">
            <div className="bg-bg-primary rounded p-1">
              <h2 className="text-xs font-semibold mb-1 text-blue-400">
                📍 Setup Steps
              </h2>
              
              <div className="space-y-0.5 text-xs">
                <div>
                  <span className="text-green-400 font-medium">1. Open Terminal</span>
                  <span className="text-gray-300 ml-1">→ Cmd+Space, type "Terminal"</span>
                </div>
                
                <div>
                  <span className="text-green-400 font-medium">2. Install Bridge</span>
                  <span className="text-gray-300 ml-1">→ Copy-paste both lines (password required)</span>
                  <div className="bg-black rounded p-1 font-mono text-[10px] space-y-0.5">
                    <div>
                      <span className="text-green-400">$</span> <span className="text-white">
                        curl -sL {isProduction ? 'https://coder1.ai' : 'http://localhost:3001'}/install-bridge.sh -o /tmp/install.sh
                      </span>
                    </div>
                    <div>
                      <span className="text-green-400">$</span> <span className="text-white">
                        sudo bash /tmp/install.sh
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-yellow-400 mt-0.5">
                    💡 Enter your Mac password when asked
                  </p>
                </div>
                
                <div>
                  <span className="text-green-400 font-medium">3. Start Bridge</span>
                  <div className="bg-black rounded p-1 font-mono text-xs">
                    <span className="text-green-400">$</span> <span className="text-white">
                      coder1-bridge start{isProduction ? '' : ' --dev'}
                    </span>
                  </div>
                  {!isProduction && (
                    <p className="text-xs text-yellow-400 mt-1">
                      💡 <strong>--dev flag required</strong> for localhost
                    </p>
                  )}
                </div>
                
                <div>
                  <span className="text-green-400 font-medium">4. Enter Code</span>
                  <span className="text-gray-300 ml-1">→ Click Bridge button below, paste 6-digit code in terminal</span>
                </div>
              </div>
            </div>

            {/* Optional: Advanced Setup - Collapsible */}
            <div className="mt-2 border-t border-border-default pt-2">
              <details className="group">
                <summary className="text-xs text-gray-400 hover:text-cyan-400 cursor-pointer flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Advanced: Overflow Backend Setup (Optional)
                </summary>
                <div className="mt-2 p-2 bg-bg-primary rounded text-xs space-y-1">
                  <p className="text-gray-300">
                    <strong className="text-cyan-400">💡 For Power Users:</strong> If you frequently hit Claude rate limits, 
                    you can configure GLM 4.6 as an overflow backend ($0.10/M tokens).
                  </p>
                  <div className="text-gray-400 space-y-0.5">
                    <p>📖 <strong>See:</strong> Help → GLM 4.6 Setup Guide for full instructions</p>
                    <p>🔗 Sign up at <a href="https://z.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">z.ai</a> to get started</p>
                  </div>
                </div>
              </details>
            </div>

            {/* Action buttons - more compact */}
            <div className="flex gap-2 justify-center mt-2">
              <button
                onClick={handleBridgeClick}
                disabled={isLoading}
                className="px-4 py-2 bg-bg-secondary border border-cyan-500 text-cyan-400 rounded-md hover:bg-cyan-500/10 transition-all duration-200 font-semibold text-sm shadow-[0_0_15px_rgba(0,217,255,0.2)]"
                title="Get your pairing code to connect Claude Code CLI"
              >
                {isLoading ? 'Loading...' : 'Bridge'}
              </button>
              {onDismiss && (
                <>
                  <button
                    onClick={onDismiss}
                    className="px-4 py-2 bg-bg-secondary border border-gray-500 text-gray-400 rounded-md hover:bg-gray-500/10 transition-all duration-200 text-sm"
                    title="Skip setup for now and explore the IDE"
                  >
                    Skip
                  </button>
                  <button
                    onClick={onDismiss}
                    className="px-4 py-2 bg-cyan-500 text-black rounded-md hover:bg-cyan-400 transition-all duration-200 font-semibold text-sm"
                    title="I've completed the setup - continue to IDE"
                  >
                    Continue →
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