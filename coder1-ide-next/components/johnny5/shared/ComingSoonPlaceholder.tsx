'use client';
import React from 'react';

interface ComingSoonPlaceholderProps {
  featureName: string;
  description: string;
  icon?: React.ReactNode;
}

export function ComingSoonPlaceholder({ featureName, description, icon }: ComingSoonPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
      {icon && <div className="text-4xl mb-4 opacity-50">{icon}</div>}
      <div className="inline-flex items-center px-3 py-1 mb-3 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        Coming Soon
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{featureName}</h3>
      <p className="text-sm text-zinc-400 max-w-md">{description}</p>
    </div>
  );
}
