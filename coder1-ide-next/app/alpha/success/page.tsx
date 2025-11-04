'use client';

import { CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function AlphaSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-8 animate-pulse" />
        
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Welcome to Coder1 Alpha! 🎉
        </h1>
        
        <p className="text-xl text-gray-300 mb-8">
          Your 30-day free trial has started. Download the bridge to get coding!
        </p>
        
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 mb-8">
          <h2 className="text-2xl font-bold mb-6">Next Steps:</h2>
          <ol className="text-left space-y-4 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center font-bold">1</span>
              <span>Download the Coder1 Bridge for your operating system</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center font-bold">2</span>
              <span>Install and run the bridge application</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center font-bold">3</span>
              <span>Visit the IDE and start your first coding session</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center font-bold">4</span>
              <span>Your trial ends in 30 days - we'll send a reminder email</span>
            </li>
          </ol>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <a 
            href="/alpha"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
          >
            Download Bridge
          </a>
          <a 
            href="/ide"
            className="px-8 py-4 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
          >
            Open IDE
          </a>
        </div>
        
        <p className="mt-8 text-gray-400 text-sm">
          Need help? Email us at <a href="mailto:alpha@coder1.app" className="text-cyan-400 hover:underline">alpha@coder1.app</a>
        </p>
      </div>
    </div>
  );
}
