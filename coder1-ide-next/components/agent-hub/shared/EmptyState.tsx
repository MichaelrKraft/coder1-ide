'use client';

import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-text-muted mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-text-secondary mb-1">{title}</h3>
      <p className="text-xs text-text-muted max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-1.5 rounded-md bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium border border-coder1-cyan/30 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
