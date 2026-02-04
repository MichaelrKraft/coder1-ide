'use client';

import { CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function AlphaSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-10 animate-pulse" />

        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3 flex-nowrap whitespace-nowrap">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Welcome to</span>
          <Image
            src="/Coder1-Logo-Sharp.svg"
            alt="Coder1"
            width={160}
            height={44}
            className="inline-block relative top-1"
          />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Alpha! 🎉</span>
        </h1>

        <p className="text-xl text-gray-300 mb-8">
          Your free alpha access has started. Let's get coding!
        </p>

        <a
          href="/ide?invite=ALPHA2026"
          className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
        >
          Open IDE
        </a>

        <p className="mt-8 text-gray-400 text-sm">
          Need help? Email us at <a href="mailto:alpha@coder1.app" className="text-cyan-400 hover:underline">alpha@coder1.app</a>
        </p>
      </div>
    </div>
  );
}
