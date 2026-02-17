'use client';

import { create } from 'zustand';

interface SharedTerminalInfo {
  sessionId: string;
  userId: string;
  username: string;
  cols: number;
  rows: number;
}

interface SpectatorState {
  // Sharing state (am I sharing MY terminal?)
  isSharingTerminal: boolean;
  sharingSessionId: string | null;
  spectatorCount: number;

  // Spectating state (am I watching SOMEONE ELSE's terminal?)
  isSpectating: boolean;
  spectatingSessionId: string | null;
  spectatingUsername: string | null;

  // Team-wide list of all shared terminals
  sharedTerminals: SharedTerminalInfo[];

  // Actions
  startSharing: (sessionId: string) => void;
  stopSharing: () => void;
  startSpectating: (sessionId: string, username: string) => void;
  stopSpectating: () => void;
  setSharedTerminals: (terminals: SharedTerminalInfo[]) => void;
  addSharedTerminal: (terminal: SharedTerminalInfo) => void;
  removeSharedTerminal: (sessionId: string) => void;
  setSpectatorCount: (count: number) => void;
}

export const useSpectatorStore = create<SpectatorState>()((set) => ({
  isSharingTerminal: false,
  sharingSessionId: null,
  spectatorCount: 0,
  isSpectating: false,
  spectatingSessionId: null,
  spectatingUsername: null,
  sharedTerminals: [],

  startSharing: (sessionId) => set({ isSharingTerminal: true, sharingSessionId: sessionId }),
  stopSharing: () => set({ isSharingTerminal: false, sharingSessionId: null, spectatorCount: 0 }),
  startSpectating: (sessionId, username) => set({ isSpectating: true, spectatingSessionId: sessionId, spectatingUsername: username }),
  stopSpectating: () => set({ isSpectating: false, spectatingSessionId: null, spectatingUsername: null }),
  setSharedTerminals: (terminals) => set({ sharedTerminals: terminals }),
  addSharedTerminal: (terminal) => set((state) => ({
    sharedTerminals: state.sharedTerminals.some(t => t.sessionId === terminal.sessionId)
      ? state.sharedTerminals
      : [...state.sharedTerminals, terminal]
  })),
  removeSharedTerminal: (sessionId) => set((state) => ({
    sharedTerminals: state.sharedTerminals.filter(t => t.sessionId !== sessionId)
  })),
  setSpectatorCount: (count) => set({ spectatorCount: count }),
}));
