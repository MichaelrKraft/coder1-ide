'use client';

import React from 'react';
import Image from 'next/image';

interface MCHeaderProps {
  onClose: () => void;
}

/**
 * Mission Control Header Component
 * Top bar with Coder1 logo on left, centered title, and back button on right
 */
export default function MCHeader({ onClose }: MCHeaderProps) {
  return (
    <div className="h-14 bg-bg-secondary border-b border-border-default flex items-center justify-between px-4 sm:px-6">
      {/* Coder1 Logo - positioned left */}
      <div className="flex items-center flex-shrink-0">
        <Image
          src="/Coder1-Logo-Sharp.svg"
          alt="Coder1"
          width={100}
          height={32}
          className="opacity-90 hover:opacity-100 transition-opacity w-20 sm:w-[100px]"
        />
      </div>

      {/* Centered Title - hidden on small screens */}
      <h1 className="hidden sm:block text-lg md:text-xl font-semibold text-text-primary">
        Mission Control
      </h1>

      {/* Back to IDE Button - positioned right */}
      <button
        onClick={onClose}
        className="flex-shrink-0 px-3 sm:px-4 py-2 bg-bg-primary text-coder1-cyan border border-coder1-cyan/30 rounded-lg
                   hover:bg-coder1-cyan/10 hover:border-coder1-cyan hover:shadow-glow-cyan
                   transition-all duration-200 font-medium text-sm sm:text-base"
        data-testid="mc-back-button"
      >
        <span className="sm:hidden">←</span>
        <span className="hidden sm:inline">← Back to IDE</span>
      </button>
    </div>
  );
}
