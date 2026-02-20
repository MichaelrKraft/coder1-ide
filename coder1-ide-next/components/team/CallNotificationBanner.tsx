'use client';

import { useEffect } from 'react';
import { useVoiceCallStore } from '@/stores/useVoiceCallStore';

interface CallNotificationBannerProps {
  teamId: string;
}

export default function CallNotificationBanner({ teamId }: CallNotificationBannerProps) {
  const {
    teamCallActive,
    teamCallParticipantCount,
    callStatus,
    joinCall,
    setTeamCallState,
  } = useVoiceCallStore();

  useEffect(() => {
    let sock: any = null;

    const setup = async () => {
      try {
        const { getSocket } = await import('@/lib/socket');
        sock = await getSocket();
        sock.emit('team:call:status', { teamId });
        sock.on(
          'team:call:update',
          (data: { teamId: string; active: boolean; participantCount: number; participants: string[] }) => {
            if (data.teamId === teamId) {
              setTeamCallState(data.active, data.participantCount, data.participants);
            }
          },
        );
      } catch (err) {
        console.warn('Socket connection failed for call banner:', err);
      }
    };

    setup();

    return () => {
      sock?.off('team:call:update');
    };
  }, [teamId, setTeamCallState]);

  if (!teamCallActive || callStatus !== 'idle') return null;

  return (
    <div className="mx-3 mb-3 p-2.5 bg-green-900/20 border border-green-800/30 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm text-zinc-300">
          {teamCallParticipantCount} teammate{teamCallParticipantCount !== 1 ? 's' : ''} on a call
        </span>
      </div>
      <button
        onClick={() => joinCall(teamId)}
        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md transition-colors"
      >
        Join
      </button>
    </div>
  );
}
