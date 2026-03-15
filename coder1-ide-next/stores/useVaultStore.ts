'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface VaultStore {
  // Navigation
  activeNotePath: string | null;
  activeFolderPath: string | null;
  noteHistory: string[];
  noteHistoryIndex: number;

  // UI
  isSearchOpen: boolean;
  searchQuery: string;
  recentNotes: string[]; // last 20 paths

  // Actions
  openNote: (path: string) => void;
  setActiveFolder: (path: string | null) => void;
  goBack: () => void;
  goForward: () => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  addToRecent: (path: string) => void;
}

export const useVaultStore = create<VaultStore>()(
  devtools(
    (set, get) => ({
      activeNotePath: null,
      activeFolderPath: null,
      noteHistory: [],
      noteHistoryIndex: -1,
      isSearchOpen: false,
      searchQuery: '',
      recentNotes: [],

      openNote: (path) => {
        const { noteHistory, noteHistoryIndex } = get();
        // Truncate forward history when navigating to a new note
        const newHistory = [...noteHistory.slice(0, noteHistoryIndex + 1), path];
        set({
          activeNotePath: path,
          noteHistory: newHistory.slice(-50), // cap at 50
          noteHistoryIndex: Math.min(newHistory.length - 1, 49),
        });
        get().addToRecent(path);
      },

      setActiveFolder: (path) => set({ activeFolderPath: path }),

      goBack: () => {
        const { noteHistory, noteHistoryIndex } = get();
        if (noteHistoryIndex > 0) {
          const newIndex = noteHistoryIndex - 1;
          set({ noteHistoryIndex: newIndex, activeNotePath: noteHistory[newIndex] });
        }
      },

      goForward: () => {
        const { noteHistory, noteHistoryIndex } = get();
        if (noteHistoryIndex < noteHistory.length - 1) {
          const newIndex = noteHistoryIndex + 1;
          set({ noteHistoryIndex: newIndex, activeNotePath: noteHistory[newIndex] });
        }
      },

      setSearchOpen: (open) => set({ isSearchOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      addToRecent: (path) => {
        const { recentNotes } = get();
        const filtered = recentNotes.filter((p) => p !== path);
        set({ recentNotes: [path, ...filtered].slice(0, 20) });
      },
    }),
    { name: 'vault-store' }
  )
);
