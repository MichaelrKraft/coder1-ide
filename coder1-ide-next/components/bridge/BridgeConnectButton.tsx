'use client';

import React, { useState, useEffect } from 'react';

export function BridgeConnectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string>('');

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

  const copyToClipboard = async (text: string, commandType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandType);
      setTimeout(() => setCopiedCommand(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
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

      {/* Professional Coder1 Setup Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.98) 0%, rgba(25, 25, 25, 0.98) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 0 60px rgba(0, 217, 255, 0.15), 0 30px 100px rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/10"
              style={{
                color: 'rgba(156, 163, 175, 0.8)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 
                  className="text-2xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  🌉 Connect Claude Code to Coder1 IDE
                </h2>
                
                {/* Enhanced Warning Section */}
                <div 
                  className="mb-6 p-3 rounded-lg border-l-4 transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(251, 191, 36, 0.08) 100%)',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    borderLeft: '4px solid rgba(251, 146, 60, 0.8)',
                    boxShadow: '0 0 20px rgba(251, 146, 60, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-5 h-5 flex items-center justify-center rounded-full text-xs"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%)',
                      }}
                    >
                      ⚠️
                    </div>
                    <h3 className="font-bold text-base text-orange-300">
                      IMPORTANT: DO NOT TYPE COMMANDS IN THE WEB TERMINAL!
                    </h3>
                  </div>
                  <p className="text-orange-200 text-xs leading-relaxed ml-7">
                    Please follow the instructions below and run commands on YOUR local computer
                  </p>
                </div>
              </div>

              {!bridgeConnected ? (
                <div className="space-y-5">
                  {/* Setup Instructions */}
                  <div>
                    <h3 
                      className="flex items-center gap-2 text-lg font-bold mb-4"
                      style={{
                        background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      📍 Setup Instructions
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Step 1 */}
                      <div 
                        className="p-4 rounded-lg border transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                          border: '1px solid rgba(0, 217, 255, 0.2)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                              color: 'white',
                            }}
                          >
                            1
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-cyan-300 mb-1 text-sm">Open YOUR Local Terminal</h4>
                            <div className="space-y-1 text-xs text-gray-300">
                              <p>• <strong>Mac:</strong> Press Cmd+Space, type "Terminal"</p>
                              <p>• <strong>Windows:</strong> Press Win+R, type "cmd"</p>
                              <p>• <strong>Linux:</strong> Press Ctrl+Alt+T</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div 
                        className="p-4 rounded-lg border transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                          border: '1px solid rgba(0, 217, 255, 0.2)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                              color: 'white',
                            }}
                          >
                            2
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-cyan-300 mb-2 text-sm">Install Bridge (on YOUR computer)</h4>
                            <div 
                              className="relative group cursor-pointer"
                              onClick={() => copyToClipboard('curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash', 'install')}
                            >
                              <div 
                                className="bg-black rounded-lg p-3 font-mono text-xs border transition-all duration-200"
                                style={{
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 10px rgba(34, 197, 94, 0.1)',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400">$</span>
                                    <span className="text-white">curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash</span>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {copiedCommand === 'install' ? (
                                      <span className="text-green-400 text-xs">✓ Copied!</span>
                                    ) : (
                                      <span className="text-cyan-400 text-xs">Click to copy</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div 
                        className="p-4 rounded-lg border transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                          border: '1px solid rgba(0, 217, 255, 0.2)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                              color: 'white',
                            }}
                          >
                            3
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-cyan-300 mb-2 text-sm">Connect Bridge (still on YOUR computer)</h4>
                            <div 
                              className="relative group cursor-pointer"
                              onClick={() => copyToClipboard('coder1-bridge start', 'connect')}
                            >
                              <div 
                                className="bg-black rounded-lg p-3 font-mono text-xs border transition-all duration-200"
                                style={{
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 10px rgba(34, 197, 94, 0.1)',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400">$</span>
                                    <span className="text-white">coder1-bridge start</span>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {copiedCommand === 'connect' ? (
                                      <span className="text-green-400 text-xs">✓ Copied!</span>
                                    ) : (
                                      <span className="text-cyan-400 text-xs">Click to copy</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div 
                        className="p-4 rounded-lg border transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                          border: '1px solid rgba(0, 217, 255, 0.2)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                              color: 'white',
                            }}
                          >
                            4
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-cyan-300 mb-2 text-sm">Enter the 6-digit code</h4>
                            <div className="text-center">
                              <div 
                                className="text-4xl font-mono font-bold mb-2 inline-block px-4 py-2 rounded-lg cursor-pointer group"
                                style={{
                                  background: 'linear-gradient(135deg, #00D9FF 0%, #3b82f6 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                  textShadow: '0 0 30px rgba(0, 217, 255, 0.5)',
                                  letterSpacing: '0.15em',
                                  border: '2px solid rgba(0, 217, 255, 0.3)',
                                  boxShadow: '0 0 20px rgba(0, 217, 255, 0.15), inset 0 0 20px rgba(0, 217, 255, 0.03)',
                                }}
                                onClick={() => copyToClipboard(pairingCode || '------', 'code')}
                                title="Click to copy code"
                              >
                                {pairingCode || '------'}
                              </div>
                              {copiedCommand === 'code' && (
                                <div className="text-green-400 text-xs mb-1">✓ Code Copied!</div>
                              )}
                              <p className="text-xs text-gray-400">
                                Click to copy • Expires in 5 minutes
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pro Tips Section */}
                  <div 
                    className="border border-gray-600 rounded-lg overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.05) 0%, rgba(107, 114, 128, 0.05) 100%)',
                    }}
                  >
                    <button
                      onClick={() => setShowProTips(!showProTips)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
                    >
                      <h4 className="font-bold text-yellow-400 flex items-center gap-2 text-sm">
                        💡 Pro Tips
                      </h4>
                      <svg 
                        className={`w-4 h-4 text-yellow-400 transition-transform duration-200 ${showProTips ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showProTips && (
                      <div className="px-4 pb-3 space-y-2 text-xs text-gray-300 border-t border-gray-600">
                        <div className="pt-3">
                          <p className="mb-1">• The bridge runs on YOUR computer, not in this web terminal</p>
                          <p className="mb-1">• Keep the bridge running in the background while using Coder1 IDE</p>
                          <p className="mb-1">• The pairing code expires after 5 minutes for security</p>
                          <p>• You can reconnect anytime by clicking the Bridge button</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div 
                    className="text-6xl mb-4 animate-bounce"
                    style={{
                      filter: 'drop-shadow(0 0 30px rgba(34, 197, 94, 0.6))',
                    }}
                  >
                    ✅
                  </div>
                  <h3 
                    className="text-2xl font-bold mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Bridge Connected Successfully!
                  </h3>
                  <p className="text-gray-300 text-sm">
                    You can now use Claude commands in the terminal
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}