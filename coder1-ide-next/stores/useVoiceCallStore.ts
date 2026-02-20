'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ================================================================================
// Types
// ================================================================================

interface VoiceCallState {
  // Call connection state
  callStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;

  // LiveKit connection data (NOT persisted)
  livekitToken: string | null;
  livekitUrl: string | null;
  roomName: string | null;

  // Local media state
  isLocalMuted: boolean;
  isLocalCameraOff: boolean;

  // Panel UI state
  panelMode: 'hidden' | 'pill' | 'expanded';
  panelPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  // Team call presence (from Socket.IO)
  teamCallActive: boolean;
  teamCallParticipantCount: number;
  teamCallParticipants: string[];

  // Actions
  joinCall: (teamId: string) => Promise<void>;
  leaveCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setPanelMode: (mode: 'hidden' | 'pill' | 'expanded') => void;
  setPanelPosition: (pos: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => void;
  setTeamCallState: (active: boolean, count: number, participants: string[]) => void;
  setCallStatus: (status: 'idle' | 'connecting' | 'connected' | 'error', error?: string) => void;
  setLivekitData: (token: string, url: string, roomName: string) => void;
}

// ================================================================================
// Store Implementation
// ================================================================================

export const useVoiceCallStore = create<VoiceCallState>()(
  persist(
    (set) => ({
      // Default values
      callStatus: 'idle',
      errorMessage: null,
      livekitToken: null,
      livekitUrl: null,
      roomName: null,
      isLocalMuted: false,
      isLocalCameraOff: true,
      panelMode: 'hidden',
      panelPosition: 'bottom-right',
      teamCallActive: false,
      teamCallParticipantCount: 0,
      teamCallParticipants: [],

      // Actions
      joinCall: async (teamId: string) => {
        set({ callStatus: 'connecting', errorMessage: null });
        try {
          const response = await fetch(`/api/team/${teamId}/voice/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to get voice token');
          }
          set({
            livekitToken: data.token,
            livekitUrl: data.serverUrl,
            roomName: data.roomName,
            panelMode: 'expanded',
          });
        } catch (error) {
          set({
            callStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Failed to join call',
          });
        }
      },

      leaveCall: () => set({
        callStatus: 'idle',
        errorMessage: null,
        livekitToken: null,
        livekitUrl: null,
        roomName: null,
        panelMode: 'hidden',
      }),

      toggleMute: () => set((state) => ({ isLocalMuted: !state.isLocalMuted })),

      toggleCamera: () => set((state) => ({ isLocalCameraOff: !state.isLocalCameraOff })),

      setPanelMode: (mode) => set({ panelMode: mode }),

      setPanelPosition: (pos) => set({ panelPosition: pos }),

      setTeamCallState: (active, count, participants) => set({
        teamCallActive: active,
        teamCallParticipantCount: count,
        teamCallParticipants: participants,
      }),

      setCallStatus: (status, error) => set({
        callStatus: status,
        errorMessage: error ?? null,
      }),

      setLivekitData: (token, url, roomName) => set({
        livekitToken: token,
        livekitUrl: url,
        roomName: roomName,
      }),
    }),
    {
      name: 'coder1-voice-call',
      partialize: (state) => ({
        panelPosition: state.panelPosition,
        isLocalCameraOff: state.isLocalCameraOff,
      }),
    }
  )
);
