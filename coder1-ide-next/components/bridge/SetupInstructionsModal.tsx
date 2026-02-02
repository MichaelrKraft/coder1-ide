'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Cable } from 'lucide-react';
import '@/components/terminal/Terminal.css';

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
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy Code');
  const [isProduction, setIsProduction] = useState(true);
  const [userOS, setUserOS] = useState<'mac' | 'windows' | 'linux'>('mac');
  const [bridgeConnected, setBridgeConnected] = useState(false);
  
  // Detect if running on localhost or production
  // 🎯 FIX (Jan 13, 2026): More robust localhost detection
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' ||
                          hostname === '127.0.0.1' ||
                          hostname.startsWith('192.168.') ||
                          hostname.startsWith('10.') ||
                          hostname.endsWith('.local');
      setIsProduction(!isLocalhost);

      // Detect user's OS
      const platform = window.navigator.platform.toLowerCase();
      const userAgent = window.navigator.userAgent.toLowerCase();

      if (platform.includes('mac') || userAgent.includes('mac')) {
        setUserOS('mac');
      } else if (platform.includes('win') || userAgent.includes('win')) {
        setUserOS('windows');
      } else {
        setUserOS('linux');
      }
    }
  }, []);

  // Poll for bridge connection status when pairing code is displayed
  // Auto-close modals when bridge connects successfully
  useEffect(() => {
    if (!showCodeModal || !pairingCode) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/bridge/status?userId=${userId}`);
        const data = await response.json();

        if (data.connected) {
          setBridgeConnected(true);
          // Show success briefly, then close both modals
          setTimeout(() => {
            setShowCodeModal(false);
            setPairingCode(null);
            setBridgeConnected(false);
            onClose(); // Close the main instructions modal
          }, 1500);
        }
      } catch (error) {
        console.error('Failed to check bridge status:', error);
      }
    };

    // Start polling every 2 seconds
    const interval = setInterval(checkConnection, 2000);
    // Also check immediately
    checkConnection();

    // Stop polling after 5 minutes (code expires)
    const timeout = setTimeout(() => clearInterval(interval), 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [showCodeModal, pairingCode, onClose]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('coder1-bridge-setup-viewed', 'true');
    }
    onClose();
  };

  const handleGetBridgeCode = async () => {
    setIsLoadingCode(true);
    try {
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId);
      }

      const response = await fetch(`/api/bridge/generate-code?userId=${userId}`);
      const data = await response.json();
      
      if (data.code) {
        setPairingCode(data.code);
        setShowCodeModal(true);
      }
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
      alert('Failed to generate pairing code. Please try again.');
    } finally {
      setIsLoadingCode(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative max-w-4xl w-full bg-bg-secondary border-2 border-orange-500 rounded-lg shadow-[0_0_30px_rgba(249,115,22,0.6)] overflow-hidden">
        <div className="bg-bg-secondary border-b border-border-default px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🌉 4 Steps to Connect your Claude Code
          </h1>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            title="Close (ESC)"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {/* What is the Bridge */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 mb-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">🌉 What is the Bridge?</h3>
            <p className="text-sm text-gray-300 mb-3">
              The Bridge is a small program that connects this web IDE to <strong className="text-white">your computer</strong>. 
              Think of it like remote desktop—you control your local files from your browser.
            </p>
            <div className="bg-bg-secondary/50 rounded p-3 mb-3">
              <div className="text-xs font-mono text-gray-400 flex items-center justify-center gap-2">
                <span className="text-cyan-400">🌐 Browser IDE</span>
                <span>⟷</span>
                <span className="text-green-400">🌉 Bridge</span>
                <span>⟷</span>
                <span className="text-blue-400">💻 Your Computer</span>
              </div>
            </div>
            <details className="text-xs">
              <summary className="text-blue-300 cursor-pointer hover:text-blue-200 mb-2">🔒 Is it safe?</summary>
              <ul className="space-y-1 text-gray-400 pl-4">
                <li>✅ Your code stays on <strong>your computer</strong> (never uploaded)</li>
                <li>✅ Encrypted connection (same security as online banking)</li>
                <li>✅ You control when it runs (start/stop anytime)</li>
                <li>✅ Open source (you can inspect the code)</li>
              </ul>
            </details>
          </div>

          {/* Important Notice */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-purple-300 text-center">
              💡 Use <strong>Your Mac/PC Terminal</strong> (not the web terminal above)
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              The bridge must run on your actual computer to access your files
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-bg-primary rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">
                📍 1-Minute Setup (Recommended)
              </h2>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">
                    <span className="text-white bg-blue-600 rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">1</span>
                    Open Terminal on Your Computer
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">Not the web terminal above—your actual {userOS === 'mac' ? 'Mac' : userOS === 'windows' ? 'PC' : 'computer'} terminal</p>
                  <div className="text-sm text-gray-300">
                    {userOS === 'mac' && (
                      <p>• <span className="text-cyan-400 font-semibold">Mac:</span> Cmd+Space → type "Terminal" → Enter</p>
                    )}
                    {userOS === 'windows' && (
                      <div>
                        <p>• <span className="text-cyan-400 font-semibold">Windows:</span> Win+X → PowerShell or Terminal</p>
                        <p className="text-xs text-yellow-400 ml-4 mt-1">💡 WSL2 recommended — <a href="https://coder1.ai/install-bridge-windows.md" target="_blank" className="underline hover:text-yellow-300">see Windows guide</a></p>
                      </div>
                    )}
                    {userOS === 'linux' && (
                      <p>• <span className="text-cyan-400 font-semibold">Linux:</span> Ctrl+Alt+T</p>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">
                    <span className="text-white bg-blue-600 rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">2</span>
                    Install the Bridge
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">Copy-paste this into your terminal:</p>
                  <div className="bg-black rounded p-3 font-mono text-sm flex items-center justify-between group">
                    <div className="flex-1 overflow-x-auto">
                      <span className="text-green-400">$</span> <span className="text-white select-all">curl -sL https://coder1.ai/install-bridge.sh | bash -s -- --auto-start</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('curl -sL https://coder1.ai/install-bridge.sh | bash -s -- --auto-start');
                      }}
                      className="ml-2 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded font-semibold whitespace-nowrap"
                      title="Copy command"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">⏱️ ~30 seconds • Auto-starts the bridge after installation</p>
                </div>

                {/* Step 3 */}
                <div className="border-l-4 border-cyan-500 pl-4 bg-cyan-500/5 rounded-r p-3">
                  <h3 className="font-semibold text-cyan-300 mb-2">
                    <span className="text-white bg-cyan-600 rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">3</span>
                    Click Bridge Button
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Get your secure 6-digit pairing code:
                  </p>
                  <button
                    onClick={handleGetBridgeCode}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                    disabled={isLoadingCode}
                  >
                    <Cable className="w-4 h-4" />
                    <span>{isLoadingCode ? 'Generating Code...' : 'Get Pairing Code'}</span>
                  </button>
                </div>

                {/* Step 4 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">
                    <span className="text-white bg-blue-600 rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">4</span>
                    Enter Code
                  </h3>
                  <p className="text-sm text-gray-300">
                    Paste the 6-digit code when prompted in your terminal
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    ⚡ You'll see: <code className="bg-bg-tertiary px-1 rounded text-cyan-300">Enter 6-digit pairing code:</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-bg-tertiary/30 border border-border-default rounded-lg p-4">
              <h3 className="font-semibold text-yellow-400 mb-3">✨ Good to Know:</h3>
              <div className="grid gap-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-green-400 mt-0.5">✅</span>
                  <p className="text-gray-300">
                    <strong className="text-white">Pairing codes expire in 5 minutes</strong> for security. Just get a new one if it expires!
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-400 mt-0.5">✅</span>
                  <p className="text-gray-300">
                    <strong className="text-white">Keep the bridge running</strong> in the background while coding (don't close that terminal window)
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-400 mt-0.5">✅</span>
                  <p className="text-gray-300">
                    <strong className="text-white">You can stop anytime</strong> with Ctrl+C in the terminal running the bridge
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 mt-0.5">💡</span>
                  <p className="text-gray-300">
                    <strong className="text-white">Reconnect easily</strong> — Just click the Bridge button in the status bar anytime
                  </p>
                </div>
              </div>
            </div>
          </div>

          {showDontShowAgain && (
            <div className="mt-6 flex items-center gap-2 p-4 bg-bg-tertiary/20 rounded-lg">
              <input
                type="checkbox"
                id="dont-show-setup"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-border-default bg-bg-secondary text-coder1-cyan focus:ring-1 focus:ring-coder1-cyan"
              />
              <label htmlFor="dont-show-setup" className="text-sm text-text-muted cursor-pointer select-none hover:text-text-secondary">
                I've completed the setup, don't show this again
              </label>
            </div>
          )}
        </div>
      </div>
      
      {/* Pairing Code Sub-Modal */}
      {showCodeModal && pairingCode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !bridgeConnected && setShowCodeModal(false)}
          />
          <div className={`relative max-w-md w-full bg-bg-secondary rounded-lg p-6 shadow-2xl border ${bridgeConnected ? 'border-green-500/50' : 'border-cyan-500/50'}`}>
            {!bridgeConnected && (
              <button
                onClick={() => setShowCodeModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}

            {bridgeConnected ? (
              // Success state - bridge connected!
              <div className="text-center py-4">
                <div className="text-6xl mb-4 animate-bounce">
                  ✅
                </div>
                <h2 className="text-2xl font-bold mb-2 text-green-400">
                  Bridge Connected!
                </h2>
                <p className="text-sm text-gray-300">
                  Closing automatically...
                </p>
              </div>
            ) : (
              // Normal pairing code display
              <>
                <h2 className="text-xl font-bold mb-4 text-cyan-400">
                  Your Bridge Pairing Code
                </h2>

                <div className="text-center mb-4">
                  <div className="text-4xl font-mono font-bold text-cyan-300 mb-2 select-all">
                    {pairingCode}
                  </div>
                  <p className="text-sm text-gray-400">
                    Enter this code in your terminal when prompted by <span className="font-mono bg-bg-tertiary px-1 rounded">coder1-bridge start</span>
                  </p>
                </div>

                <div className="text-xs text-gray-500 text-center mb-3">
                  ⏱️ Code expires in 5 minutes • Waiting for connection...
                </div>

                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pairingCode);
                      setCopyButtonText('✅ Copied!');
                      setTimeout(() => setCopyButtonText('📋 Copy Code'), 2000);
                    } catch (err) {
                      console.error('Failed to copy:', err);
                      // Fallback: Try to select the text
                      const codeElement = document.querySelector('.select-all');
                      if (codeElement) {
                        const range = document.createRange();
                        range.selectNode(codeElement);
                        window.getSelection()?.removeAllRanges();
                        window.getSelection()?.addRange(range);
                        try {
                          document.execCommand('copy');
                          setCopyButtonText('✅ Copied!');
                          setTimeout(() => setCopyButtonText('📋 Copy Code'), 2000);
                        } catch (fallbackErr) {
                          alert('Please manually select and copy the code above');
                        }
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-md font-semibold text-sm transition-colors"
                >
                  {copyButtonText}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}