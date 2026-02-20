'use client';

import { useState, useEffect } from 'react';
import {
  useRoomContext,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { useVoiceCallStore } from '@/stores/useVoiceCallStore';
import VoiceParticipantTile from './VoiceParticipantTile';
import '@livekit/components-styles';

interface FloatingVoiceInnerProps {
  panelMode: 'hidden' | 'pill' | 'expanded';
  setPanelMode: (mode: 'hidden' | 'pill' | 'expanded') => void;
  leaveCall: () => void;
}

export default function FloatingVoiceInner({
  panelMode,
  setPanelMode,
  leaveCall,
}: FloatingVoiceInnerProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const { isLocalMuted, isLocalCameraOff, toggleMute, toggleCamera } = useVoiceCallStore();

  const [isReconnecting, setIsReconnecting] = useState(false);

  // Listen for reconnection events on the Room instance
  useEffect(() => {
    const onReconnecting = () => setIsReconnecting(true);
    const onReconnected = () => setIsReconnecting(false);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
    };
  }, [room]);

  // Sync local mute state to LiveKit
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isLocalMuted);
    }
  }, [isLocalMuted, localParticipant]);

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(!isLocalCameraOff);
    }
  }, [isLocalCameraOff, localParticipant]);

  const remoteParticipants = participants.filter((p) => !p.isLocal);

  // Pill mode — compact bar
  if (panelMode === 'pill') {
    return (
      <div className="flex items-center h-full px-3 gap-2">
        {/* Participant avatars */}
        <div className="flex -space-x-1.5 flex-1 min-w-0">
          {participants.slice(0, 4).map((p) => (
            <div
              key={p.identity}
              className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center flex-shrink-0"
            >
              <span className="text-white text-[10px] font-medium">
                {(p.name || p.identity || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
          {participants.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-zinc-600 border-2 border-zinc-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px]">+{participants.length - 4}</span>
            </div>
          )}
        </div>

        {/* Mute indicator */}
        <button
          onClick={toggleMute}
          className={`p-1 rounded ${isLocalMuted ? 'text-red-400' : 'text-green-400'}`}
          title={isLocalMuted ? 'Unmute' : 'Mute'}
        >
          {isLocalMuted ? (
            <MicOffIcon className="w-4 h-4" />
          ) : (
            <MicOnIcon className="w-4 h-4" />
          )}
        </button>

        {/* Expand button */}
        <button
          onClick={() => setPanelMode('expanded')}
          className="p-1 text-zinc-400 hover:text-zinc-200"
          title="Expand"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expanded mode — video grid + controls
  return (
    <div className="flex flex-col h-full">
      {/* Reconnecting banner */}
      {isReconnecting && (
        <div className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs text-center">
          Reconnecting...
        </div>
      )}

      {/* Participant grid */}
      <div className="flex-1 p-2 overflow-hidden">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-zinc-500">
            Waiting for others...
          </div>
        ) : participants.length === 1 ? (
          <VoiceParticipantTile
            participant={participants[0]}
            isLocal={participants[0].isLocal}
            size="large"
          />
        ) : (
          <div className="grid grid-cols-2 gap-1.5 h-full">
            {participants.slice(0, 4).map((p) => (
              <VoiceParticipantTile
                key={p.identity}
                participant={p}
                isLocal={p.isLocal}
                size="medium"
              />
            ))}
          </div>
        )}
        {participants.length > 4 && (
          <div className="text-center text-xs text-zinc-500 mt-1">
            +{participants.length - 4} more in call
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-zinc-700/50">
        {/* Mic toggle */}
        <button
          onClick={toggleMute}
          className={`p-2 rounded-full transition-colors ${
            isLocalMuted
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
          }`}
          title={isLocalMuted ? 'Unmute' : 'Mute'}
        >
          {isLocalMuted ? <MicOffIcon className="w-4 h-4" /> : <MicOnIcon className="w-4 h-4" />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={`p-2 rounded-full transition-colors ${
            isLocalCameraOff
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
              : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
          }`}
          title={isLocalCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isLocalCameraOff ? (
            <CameraOffIcon className="w-4 h-4" />
          ) : (
            <CameraOnIcon className="w-4 h-4" />
          )}
        </button>

        {/* Minimize to pill */}
        <button
          onClick={() => setPanelMode('pill')}
          className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-400"
          title="Minimize"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {/* Leave call */}
        <button
          onClick={leaveCall}
          className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white"
          title="Leave call"
        >
          <PhoneOffIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Simple SVG icons — no external icon library dependency
function MicOnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.5-.36 2.18" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CameraOnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CameraOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}
