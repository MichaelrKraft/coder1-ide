'use client';

import React from 'react';

interface TestEnvironmentLinkProps {
  variant?: 'button' | 'badge' | 'inline';
  className?: string;
}

const TestEnvironmentLink: React.FC<TestEnvironmentLinkProps> = ({ 
  variant = 'button', 
  className = '' 
}) => {
  const handleClick = () => {
    window.open('/test-enhanced-agents', '_blank', 'noopener,noreferrer');
  };

  if (variant === 'badge') {
    return (
      <button
        onClick={handleClick}
        className={`px-3 py-1 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium hover:bg-blue-900/30 transition-colors flex items-center gap-1 ${className}`}
      >
        🧪 Test Safely First
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className={`text-blue-400 hover:text-blue-300 underline decoration-dotted underline-offset-2 text-sm ${className}`}
      >
        test environment
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ${className}`}
    >
      🧪 Try in Test Environment
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </button>
  );
};

export default TestEnvironmentLink;