'use client';

import React from 'react';
import { Lock } from 'lucide-react';

interface PaywallGateProps {
  featureName: string;
  isPaid: boolean;
  children: React.ReactNode;
}

export default function PaywallGate({ featureName, isPaid, children }: PaywallGateProps) {
  if (isPaid) {
    return <>{children}</>;
  }

  function handleUpgrade() {
    // Navigate to billing page if it exists, otherwise surface a message
    window.location.href = '/settings/billing';
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-secondary border border-border-default mb-4">
        <Lock size={20} className="text-text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-text-secondary mb-1">
        {featureName} requires a paid plan
      </h3>
      <p className="text-xs text-text-muted max-w-xs mb-4">
        Upgrade to Team to access goals, track progress across agent tasks, and stay organised.
      </p>
      <button
        onClick={handleUpgrade}
        className="px-4 py-1.5 rounded-md bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium border border-coder1-cyan/30 transition-colors"
      >
        Upgrade to Team
      </button>
    </div>
  );
}
