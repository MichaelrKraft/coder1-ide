'use client';

import React, { useState } from 'react';

interface WelcomeScreenProps {
  onDismiss?: () => void;
  onBridgeClick?: () => void;
}

export function WelcomeScreen({ onDismiss, onBridgeClick }: WelcomeScreenProps = {}) {
  const [pairingCode] = useState(() => 
    Math.floor(100000 + Math.random() * 900000).toString()
  );
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
                  <h3 className="text-sm font-semibold text-green-400 mb-1">Step 2: Install Bridge (on YOUR computer)</h3>
                  <div className="bg-black rounded p-2 font-mono text-xs">
                    <span className="text-green-400">$</span> <span className="text-white">curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash</span>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-3">
                  <h3 className="text-sm font-semibold text-green-400 mb-1">Step 3: Connect Bridge (still on YOUR computer)</h3>
                  <div className="bg-black rounded p-2 font-mono text-xs">
                    <span className="text-green-400">$</span> <span className="text-white">coder1-bridge start</span>
                  </div>
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
              {onBridgeClick && (
                <button
                  onClick={onBridgeClick}
                  className="px-6 py-2.5 bg-bg-secondary border border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all duration-200 font-semibold text-sm shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                  title="Get your pairing code to connect Claude Code CLI"
                >
                  Bridge
                </button>
              )}
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
    </div>
  );
}