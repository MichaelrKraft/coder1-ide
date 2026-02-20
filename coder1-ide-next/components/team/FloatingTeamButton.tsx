'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useTeamStore } from '@/stores/useTeamStore';

export default function FloatingTeamButton() {
  const { syncTeam, syncStatus, onlineMembers } = useTeamStore();

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('openTeamPanel'));
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-2 right-4 z-50 w-14 h-14 rounded-full bg-coder1-cyan/20 border border-coder1-cyan/50 hover:bg-coder1-cyan/30 hover:border-coder1-cyan hover:shadow-glow-cyan transition-all duration-200 flex items-center justify-center group"
      title={syncTeam ? `Team: ${syncTeam.name}` : 'Create or join a team'}
    >
      <Users className="w-6 h-6 text-coder1-cyan group-hover:scale-110 transition-transform" />

      {/* Online count badge */}
      {syncTeam && onlineMembers.length > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
          {onlineMembers.length}
        </span>
      )}

      {/* Sync status indicator */}
      {syncTeam && (
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-primary ${
          syncStatus.isSyncing ? 'bg-coder1-cyan animate-pulse' :
          syncStatus.isConnected ? 'bg-green-400' : 'bg-yellow-400'
        }`} />
      )}
    </button>
  );
}
