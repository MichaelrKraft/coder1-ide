'use client';

import { useState, useEffect } from 'react';
import { Download, Terminal, Zap, CheckCircle, AlertCircle, ExternalLink, BookOpen } from 'lucide-react';
import Image from 'next/image';

export default function AlphaPage() {
  const [selectedOS, setSelectedOS] = useState<'windows' | 'macos' | 'linux'>('macos');
  const [downloadStats, setDownloadStats] = useState({ bridges: 847, activeUsers: 156 });

  // Auto-detect OS
  useEffect(() => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) setSelectedOS('windows');
    else if (userAgent.includes('Linux')) setSelectedOS('linux');
    else setSelectedOS('macos');
  }, []);

  const downloads = {
    windows: {
      name: 'Windows (x64)',
      file: 'coder1-bridge-win.exe',
      size: '28.3 MB',
      icon: '🪟'
    },
    macos: {
      name: 'macOS (Intel/Apple)',
      file: 'coder1-bridge-macos',
      size: '29.1 MB', 
      icon: '🍎'
    },
    linux: {
      name: 'Linux (x64)',
      file: 'coder1-bridge-linux',
      size: '28.7 MB',
      icon: '🐧'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex flex-col items-start">
              <Image 
                src="/Coder1-Logo-Sharp.svg" 
                alt="Coder1 Logo" 
                width={120} 
                height={120}
                className="mb-1"
              />
              <p className="text-sm text-gray-400 ml-2">Private Alpha Program</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400">{downloadStats.bridges}</p>
                <p className="text-xs text-gray-400">Bridges Downloaded</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">{downloadStats.activeUsers}</p>
                <p className="text-xs text-gray-400">Active Alpha Users</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Private Alpha - Invitation Only
            </div>
            
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Welcome to Coder1
            </h1>
            <p className="text-2xl text-gray-300 mb-4">
              The first web IDE where Claude never forgets your context
            </p>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Connect your local Claude CLI to our web IDE for the ultimate AI-powered development experience. 
              No API costs, complete privacy, enterprise security.
            </p>
          </div>

          {/* Prerequisites */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              Before You Start
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-900/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Requirements
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Claude Code CLI</strong> - Get it from{' '}
                      <a 
                        href="https://claude.ai/code" 
                        target="_blank" 
                        className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                      >
                        claude.ai/code <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Claude Code Subscription</strong> - PRO or MAX plan required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Alpha Invite Code</strong> - Check your email invitation</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-900/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-amber-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  What You Get
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>Professional web IDE with full Monaco editor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>Native Claude integration with persistent memory</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>Zero ongoing costs - uses your existing subscription</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>Complete privacy - all AI processing on your machine</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold mb-8 text-center">Download Coder1 Bridge</h2>
            
            {/* OS Selection */}
            <div className="flex justify-center gap-4 mb-8">
              {Object.entries(downloads).map(([os, info]) => (
                <button
                  key={os}
                  onClick={() => setSelectedOS(os as any)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedOS === os
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-2">{info.icon}</span>
                  {info.name}
                </button>
              ))}
            </div>

            {/* Download Card */}
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-6 border border-gray-600">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{downloads[selectedOS].icon}</div>
                  <div>
                    <h3 className="text-xl font-bold">{downloads[selectedOS].name}</h3>
                    <p className="text-gray-400">Size: {downloads[selectedOS].size}</p>
                  </div>
                </div>
                
                <a 
                  href={`/api/bridge/download/${downloads[selectedOS].file}`}
                  className="block w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Bridge
                  </div>
                </a>
                
                <p className="text-center text-gray-400 text-sm mt-3">
                  v1.0.0-alpha.1 • Released today
                </p>
              </div>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="mt-12 bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Terminal className="w-6 h-6 text-cyan-400" />
              Quick Start
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-cyan-400">1. Install Bridge</h3>
                {selectedOS === 'windows' ? (
                  <div className="space-y-2">
                    <p className="text-gray-300">Download and run the installer:</p>
                    <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-cyan-300">
                      coder1-bridge-win.exe
                    </div>
                  </div>
                ) : selectedOS === 'macos' ? (
                  <div className="space-y-2">
                    <p className="text-gray-300">Make executable and run:</p>
                    <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-cyan-300">
                      chmod +x coder1-bridge-macos<br />
                      ./coder1-bridge-macos
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-300">Make executable and run:</p>
                    <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-cyan-300">
                      chmod +x coder1-bridge-linux<br />
                      ./coder1-bridge-linux
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 text-cyan-400">2. Connect to IDE</h3>
                <p className="text-gray-300 mb-2">Open your web browser and visit:</p>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-cyan-300">
                  https://coder1.app/ide
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Alpha Testing Notes</h4>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Bridge connects automatically when both services are running</li>
                    <li>• Your Claude CLI commands execute locally for complete privacy</li>
                    <li>• Sessions persist across browser refreshes and reconnections</li>
                    <li>• Report any issues to our Discord or email support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-6">Need Help?</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="https://discord.gg/coder1" 
                target="_blank"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                Discord Community <ExternalLink className="w-4 h-4" />
              </a>
              <a 
                href="mailto:alpha@coder1.app" 
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                Email Support <ExternalLink className="w-4 h-4" />
              </a>
              <button 
                onClick={() => window.open('/documentation', '_blank')}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}