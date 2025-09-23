'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

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

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('coder1-bridge-setup-viewed', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative max-w-4xl w-full bg-bg-secondary border border-border-default rounded-lg shadow-2xl overflow-hidden">
        <div className="bg-bg-secondary border-b border-border-default px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🌉 Connect Claude Code to Coder1 IDE
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
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-lg font-bold text-red-400 text-center">
              ⚠️ IMPORTANT: DO NOT TYPE COMMANDS IN THE WEB TERMINAL! ⚠️
            </p>
            <p className="text-sm text-red-300 text-center mt-2">
              Please follow the instructions below and run commands on YOUR local computer
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-bg-primary rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">
                📍 Setup Instructions
              </h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">Step 1: Open YOUR Local Terminal</h3>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li>• <span className="text-yellow-400">Mac:</span> Press Cmd+Space, type "Terminal"</li>
                    <li>• <span className="text-yellow-400">Windows:</span> Press Win+R, type "cmd"</li>
                    <li>• <span className="text-yellow-400">Linux:</span> Press Ctrl+Alt+T</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">Step 2: Install Bridge (on YOUR computer)</h3>
                  <div className="bg-black rounded p-3 font-mono text-sm flex items-center justify-between group">
                    <div>
                      <span className="text-green-400">$</span> <span className="text-white select-all">curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-bg-secondary rounded hover:bg-bg-tertiary"
                      title="Copy command"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">Step 3: Connect Bridge (still on YOUR computer)</h3>
                  <div className="bg-black rounded p-3 font-mono text-sm flex items-center justify-between group">
                    <div>
                      <span className="text-green-400">$</span> <span className="text-white select-all">coder1-bridge start</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('coder1-bridge start')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-bg-secondary rounded hover:bg-bg-tertiary"
                      title="Copy command"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">Step 4: Enter the 6-digit code</h3>
                  <p className="text-sm text-gray-300">
                    Click the <span className="bg-blue-600 px-2 py-1 rounded text-white font-mono text-xs">Bridge</span> button 
                    in the menu bar to get your pairing code
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-bg-tertiary/30 border border-border-default rounded-lg p-4">
              <h3 className="font-semibold text-yellow-400 mb-2">💡 Pro Tips:</h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• The bridge runs on YOUR computer, not in this web terminal</li>
                <li>• Keep the bridge running in the background while using Coder1 IDE</li>
                <li>• The pairing code expires after 5 minutes for security</li>
                <li>• You can reconnect anytime by clicking the Bridge button</li>
              </ul>
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
    </div>
  );
}