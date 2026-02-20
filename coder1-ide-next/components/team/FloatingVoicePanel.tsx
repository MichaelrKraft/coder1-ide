'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useVoiceCallStore } from '@/stores/useVoiceCallStore';
import { useTeamStore } from '@/stores/useTeamStore';

// Dynamic import with SSR disabled — LiveKit uses browser APIs (RTCPeerConnection, MediaStream)
const LiveKitRoom = dynamic(
  () => import('@livekit/components-react').then((m) => m.LiveKitRoom),
  { ssr: false }
);

// Inner component that uses LiveKit hooks (must be inside LiveKitRoom)
const FloatingVoiceInner = dynamic(
  () => import('./FloatingVoiceInner'),
  { ssr: false }
);

export default function FloatingVoicePanel() {
  const {
    callStatus,
    errorMessage,
    livekitToken,
    livekitUrl,
    roomName,
    panelMode,
    leaveCall,
    setCallStatus,
    setPanelMode,
  } = useVoiceCallStore();

  const syncTeam = useTeamStore((s) => s.syncTeam);

  // Emit Socket.IO join/leave events
  const handleConnected = useCallback(async () => {
    setCallStatus('connected');
    try {
      const { getSocket } = await import('@/lib/socket');
      const sock = await getSocket();
      sock.emit('team:call:join', {
        teamId: syncTeam?.id,
        userId: 'self', // Will be set by server from socket context
        username: 'Me',
      });
    } catch (err) {
      console.warn('Failed to emit call join:', err);
    }
  }, [syncTeam?.id, setCallStatus]);

  const handleDisconnected = useCallback(async () => {
    try {
      const { getSocket } = await import('@/lib/socket');
      const sock = await getSocket();
      sock.emit('team:call:leave', {
        teamId: syncTeam?.id,
        userId: 'self',
      });
    } catch (err) {
      // Best effort
    }
    leaveCall();
  }, [syncTeam?.id, leaveCall]);

  const handleError = useCallback(
    (error: Error) => {
      console.error('LiveKit error:', error);
      setCallStatus('error', error.message);
    },
    [setCallStatus]
  );

  // Don't render anything if hidden or no token
  if (panelMode === 'hidden' || !livekitToken || !livekitUrl) {
    return null;
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-[1350] shadow-2xl rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-900"
      style={{
        width: panelMode === 'pill' ? 280 : 320,
        height: panelMode === 'pill' ? 48 : 280,
        transition: 'width 200ms ease, height 200ms ease',
      }}
    >
      {/* Connecting state */}
      {callStatus === 'connecting' && (
        <div className="flex items-center justify-center h-full gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Connecting...</span>
        </div>
      )}

      {/* Error state */}
      {callStatus === 'error' && (
        <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
          <span className="text-sm text-red-400">{errorMessage || 'Connection failed'}</span>
          <button
            onClick={leaveCall}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active call — LiveKit room */}
      {(callStatus === 'connected' || (callStatus === 'connecting' && livekitToken)) && (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={livekitToken}
          connect={true}
          audio={true}
          video={false}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
          onError={handleError}
        >
          <FloatingVoiceInner panelMode={panelMode} setPanelMode={setPanelMode} leaveCall={handleDisconnected} />
        </LiveKitRoom>
      )}
    </div>
  );
}
