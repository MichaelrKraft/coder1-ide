'use client';

import { useMemo } from 'react';
import {
  VideoTrack,
  useParticipantInfo,
  useIsSpeaking,
} from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';

interface VoiceParticipantTileProps {
  participant: Participant;
  isLocal: boolean;
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: 'w-16 h-16',
  medium: 'w-24 h-24',
  large: 'w-full h-full',
};

export default function VoiceParticipantTile({
  participant,
  isLocal,
  size = 'medium',
}: VoiceParticipantTileProps) {
  const { name, identity } = useParticipantInfo({ participant });
  const isSpeaking = useIsSpeaking(participant);

  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const isCameraEnabled = cameraPublication?.isSubscribed && !cameraPublication?.isMuted;

  const micPublication = participant.getTrackPublication(Track.Source.Microphone);
  const isMicMuted = !micPublication || micPublication.isMuted;

  const displayName = useMemo(() => {
    const raw = name || identity || '?';
    return raw.length > 12 ? raw.slice(0, 12) + '...' : raw;
  }, [name, identity]);

  const initial = useMemo(
    () => (name || identity || '?').charAt(0).toUpperCase(),
    [name, identity],
  );

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${sizeClasses[size]} ${
        isSpeaking ? 'ring-2 ring-green-400' : ''
      }`}
    >
      {/* Video or Avatar */}
      {isCameraEnabled && cameraPublication ? (
        <VideoTrack
          trackRef={{
            participant,
            publication: cameraPublication,
            source: Track.Source.Camera,
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-zinc-700">
          <div className="relative flex items-center justify-center">
            {isSpeaking && (
              <span className="absolute inset-0 w-10 h-10 -m-1 rounded-full border-2 border-green-400 animate-ping opacity-40" />
            )}
            <span className="text-white text-lg font-semibold">{initial}</span>
          </div>
        </div>
      )}

      {/* "You" badge */}
      {isLocal && (
        <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded">
          You
        </span>
      )}

      {/* Name label */}
      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded truncate max-w-[calc(100%-2rem)]">
        {displayName}
      </span>

      {/* Mic muted icon */}
      {isMicMuted && (
        <span className="absolute bottom-1 right-1 text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </span>
      )}
    </div>
  );
}
