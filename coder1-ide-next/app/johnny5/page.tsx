'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Johnny5Panel from '@/components/johnny5/Johnny5Panel';

export default function Johnny5FullPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Navigation Header */}
      <header className="h-11 flex items-center px-4 border-b border-gray-800 bg-[#0a0a0a] shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to IDE
        </button>
        <div className="flex items-center gap-2 ml-4">
          <Image src="/johnny5-landing/johnny5-robot.png" alt="Johnny5" width={20} height={20} className="rounded-sm" />
          <span className="text-sm font-medium text-cyan-400">Johnny5 Platform</span>
        </div>
      </header>

      {/* Main Content — Johnny5 panel runs entirely within Coder1 */}
      <div className="flex-1 overflow-hidden">
        <Johnny5Panel className="h-full" />
      </div>
    </div>
  );
}
