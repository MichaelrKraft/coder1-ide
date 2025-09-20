'use client';

import React from 'react';

export function WelcomeScreen() {
  return (
    <div className="flex items-center justify-center h-full bg-bg-primary p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            🌉 Connect Your Local Claude CLI
          </h1>
          
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-lg font-bold text-red-400 text-center">
              ⚠️ IMPORTANT: DO NOT TYPE COMMANDS IN THE WEB TERMINAL! ⚠️
            </p>
            <p className="text-sm text-red-300 text-center mt-2">
              The terminal below runs on the web server, not your computer
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-bg-primary rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">
                📍 Setup Instructions (Run on YOUR Computer)
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
                  <div className="bg-black rounded p-3 font-mono text-sm">
                    <span className="text-green-400">$</span> <span className="text-white">curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash</span>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">Step 3: Connect Bridge (still on YOUR computer)</h3>
                  <div className="bg-black rounded p-3 font-mono text-sm">
                    <span className="text-green-400">$</span> <span className="text-white">coder1-bridge start</span>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-green-400 mb-2">Step 4: Enter the 6-digit code</h3>
                  <p className="text-sm text-gray-300">
                    Click the <span className="bg-blue-600 px-2 py-1 rounded text-white">🌉 Connect Bridge</span> button 
                    in the status bar to get your code
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-bg-primary rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-purple-400">
                🎯 Understanding the Architecture
              </h2>
              
              <div className="bg-black rounded p-4 font-mono text-xs">
                <pre className="text-green-400">{`
YOUR COMPUTER                    INTERNET                    WEB SERVER
┌─────────────┐                                          ┌──────────────┐
│             │                                          │              │
│  Terminal   │                                          │  Web IDE     │
│  $ coder1-  │ ←──── Bridge Connection (WebSocket) ────→│  Terminal    │
│    bridge   │                                          │  $ claude    │
│    start    │                                          │  [works!]    │
│             │                                          │              │
│ Claude CLI  │ ←──── Commands sent to your CLI ────────│              │
│ Installed   │                                          │              │
│   Here      │ ────── Output sent back to browser ─────→│              │
└─────────────┘                                          └──────────────┘
                `}</pre>
              </div>
              
              <p className="text-sm text-gray-300 mt-4">
                The bridge connects your local Claude CLI to this web IDE, allowing you to use
                Claude commands in the browser terminal while the actual execution happens on your computer.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-400 mb-2">💡 Alternative: Run Everything Locally</h3>
              <div className="bg-black rounded p-3 font-mono text-xs space-y-1">
                <div><span className="text-green-400">$</span> <span className="text-white">git clone https://github.com/MichaelrKraft/coder1-ide</span></div>
                <div><span className="text-green-400">$</span> <span className="text-white">cd coder1-ide/coder1-ide-next</span></div>
                <div><span className="text-green-400">$</span> <span className="text-white">npm install && npm run dev</span></div>
                <div className="text-gray-400"># Open http://localhost:3001</div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">📚 Prerequisites</h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Claude Code CLI: <a href="https://claude.ai/download" target="_blank" className="text-blue-400 hover:underline">https://claude.ai/download</a></li>
                <li>• Node.js 18+: <a href="https://nodejs.org" target="_blank" className="text-blue-400 hover:underline">https://nodejs.org</a></li>
                <li>• A Claude Code subscription ($20/month for unlimited usage)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}