'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="py-12 bg-gray-900/50 border-t border-gray-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/Coder1-Logo-Sharp.svg"
              alt="Coder1"
              width={150}
              height={48}
              className="h-12 w-auto opacity-80"
            />
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">The AI-First IDE</span>
          </div>

          <div className="flex items-center gap-8 text-gray-400">
            <Link href="/ide" className="hover:text-white transition-colors">IDE</Link>
            <Link href="/teams" className="hover:text-white transition-colors">Teams</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/documentation" className="hover:text-white transition-colors">Docs</Link>
          </div>

          <div className="text-gray-500 text-sm">
            © 2026 Coder1. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
