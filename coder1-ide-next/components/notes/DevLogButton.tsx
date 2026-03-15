'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';

interface DevLogButtonProps {
  onNoteCreated: (path: string) => void;
}

export default function DevLogButton({ onNoteCreated }: DevLogButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const commands = useIDEStore.getState().terminal?.commands ?? [];
      const workingDir = useIDEStore.getState().terminal?.workingDirectory ?? '';

      const res = await fetch('/api/vault/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: commands.slice(-30), workingDir }),
      });

      if (res.ok) {
        const data = await res.json() as { path: string };
        onNoteCreated(data.path);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Create Daily Dev Log"
      className="p-1 rounded hover:bg-[#2a2a4e] text-[#9ca3af] hover:text-[#e2e8f0] transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span className="block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Calendar className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
