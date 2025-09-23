'use client';

import React from 'react';

/**
 * ResetSetupButton - For development/testing
 * Clears the bridge setup viewed flag to show WelcomeScreen again
 */
export function ResetSetupButton() {
  const handleReset = () => {
    localStorage.removeItem('coder1-bridge-setup-viewed');
    localStorage.removeItem('coder1-tour-status');
    localStorage.removeItem('coder1-tour-timestamp');
    alert('Setup flags cleared! Refresh the page to see the welcome screen again.');
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <button
      onClick={handleReset}
      className="px-3 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 rounded transition-colors"
      title="Reset setup flags (dev only)"
    >
      Reset Setup
    </button>
  );
}