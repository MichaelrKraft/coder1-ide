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
    <div className="h-14 bg-bg-secondary border-b border-border-default flex items-center px-6 relative">
      {/* Coder1 Logo - positioned left */}
      <div className="flex items-center">
        <Image
          src="/Coder1-Logo-Sharp.svg"
          alt="Coder1"
          width={100}
          height={32}
          className="opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Centered Title */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <h1 className="text-xl font-semibold text-text-primary">
          Mission Control
        </h1>
      </div>

      {/* Back to IDE Button - positioned right */}
      <button
        onClick={onClose}
        className="ml-auto px-4 py-2 bg-bg-primary text-coder1-cyan border border-coder1-cyan/30 rounded-lg
                   hover:bg-coder1-cyan/10 hover:border-coder1-cyan hover:shadow-glow-cyan
                   transition-all duration-200 font-medium"
        data-testid="mc-back-button"
      >
        ← Back to IDE
      </button>
    </div>
  );
}
