'use client';

import { ArrowLeft, BookOpen, Terminal, Zap, Shield, Cloud, Code, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function DocumentationPage() {
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
              <p className="text-sm text-gray-400 ml-2">Documentation • Alpha Version 1.0</p>
            </div>
            
            <Link 
              href="/alpha"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Alpha
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Getting Started with Coder1
            </h1>
            <p className="text-xl text-gray-300">
              Everything you need to know about the Bridge architecture and Claude integration
            </p>
          </div>

          {/* Quick Start */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <Terminal className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Quick Start</h2>
              </div>
              
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">1</span>
                  <div>
                    <p className="font-semibold">Download the Bridge</p>
                    <p className="text-gray-400 text-sm">Get the Bridge executable for your OS from /alpha</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">2</span>
                  <div>
                    <p className="font-semibold">Run Bridge Locally</p>
                    <p className="text-gray-400 text-sm">Execute: ./coder1-bridge (make it executable first)</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">3</span>
                  <div>
                    <p className="font-semibold">Open Coder1 IDE</p>
                    <p className="text-gray-400 text-sm">Navigate to /ide and start coding with Claude</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Key Features</h2>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Code className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Full Monaco Editor</p>
                    <p className="text-gray-400 text-sm">VSCode editing experience in your browser</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Cloud className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Cloud Terminal</p>
                    <p className="text-gray-400 text-sm">Full bash environment with npm, git, and more</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Complete Privacy</p>
                    <p className="text-gray-400 text-sm">Claude runs locally, no data sent to cloud</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Session Persistence</p>
                    <p className="text-gray-400 text-sm">Claude remembers context across sessions</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              How the Bridge Works
            </h2>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The Coder1 Bridge creates a secure tunnel between your local Claude CLI and our cloud IDE. 
                This revolutionary architecture gives you the full power of Claude without any API costs.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Terminal className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">Local Claude CLI</h3>
                  <p className="text-sm text-gray-400">Runs on your machine with your subscription</p>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">Coder1 Bridge</h3>
                  <p className="text-sm text-gray-400">Secure tunnel between local and cloud</p>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Cloud className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">Cloud IDE</h3>
                  <p className="text-sm text-gray-400">Professional web-based development environment</p>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mt-8 mb-4 text-cyan-400">Benefits</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>Zero API Costs:</strong> Uses your existing Claude Code subscription</li>
                <li>• <strong>Complete Privacy:</strong> All AI processing happens on your local machine</li>
                <li>• <strong>Enterprise Security:</strong> No sensitive code leaves your infrastructure</li>
                <li>• <strong>Persistent Memory:</strong> Claude remembers your entire development context</li>
                <li>• <strong>Seamless Integration:</strong> Works with your existing development workflow</li>
              </ul>
              
              <h3 className="text-xl font-bold mt-8 mb-4 text-cyan-400">Requirements</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Claude Code CLI installed locally (get from claude.ai/code)</li>
                <li>• Active Claude Code PRO or MAX subscription</li>
                <li>• Alpha invite code (check your email)</li>
                <li>• macOS, Windows, or Linux operating system</li>
              </ul>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Common Issues</h2>
            
            <div className="space-y-4">
              <details className="group">
                <summary className="cursor-pointer font-semibold text-cyan-400 hover:text-cyan-300">
                  Bridge won't connect to IDE
                </summary>
                <div className="mt-2 pl-4 text-gray-300">
                  <p>Make sure both services are running:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Bridge executable is running locally</li>
                    <li>You're logged into Claude CLI</li>
                    <li>IDE is open at /ide</li>
                    <li>Check firewall settings</li>
                  </ul>
                </div>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer font-semibold text-cyan-400 hover:text-cyan-300">
                  Terminal says "claude: command not found"
                </summary>
                <div className="mt-2 pl-4 text-gray-300">
                  <p>This is expected! Claude CLI runs locally, not on the server. You need to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Download and run the Bridge on your local machine</li>
                    <li>The Bridge connects your local Claude to the web IDE</li>
                    <li>Once connected, Claude commands work seamlessly</li>
                  </ul>
                </div>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer font-semibold text-cyan-400 hover:text-cyan-300">
                  Permission denied when running Bridge
                </summary>
                <div className="mt-2 pl-4 text-gray-300">
                  <p>Make the Bridge executable first:</p>
                  <code className="block mt-2 p-2 bg-gray-900 rounded text-sm">
                    chmod +x coder1-bridge-[your-os]
                  </code>
                </div>
              </details>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-400">
            <p>Need more help? Contact us at alpha@coder1.app</p>
            <p className="mt-2">Coder1 Alpha v1.0.0 • Built with ❤️ for the future of coding</p>
          </div>
        </div>
      </div>
    </div>
  );
}