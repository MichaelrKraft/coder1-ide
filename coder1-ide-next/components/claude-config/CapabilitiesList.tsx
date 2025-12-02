'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface CapabilitiesListProps {
  capabilities: string[];
}

export function CapabilitiesList({ capabilities }: CapabilitiesListProps) {
  if (capabilities.length === 0) {
    return (
      <p className="text-sm text-gray-400">No capabilities listed</p>
    );
  }

  return (
    <ul className="space-y-2">
      {capabilities.map((capability, index) => (
        <li
          key={index}
          className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
        >
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <Check className="w-3 h-3 text-blue-400" />
          </div>
          <span className="text-sm text-gray-300">{capability}</span>
        </li>
      ))}
    </ul>
  );
}
