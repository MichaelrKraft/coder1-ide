import { create } from 'zustand';

export interface FileEdit {
  path: string;
  basename: string;
  directory: string;
  additions: number;
  deletions: number;
  operation: 'updated' | 'created' | 'deleted';
  lastEditedAt: number;
  editCount: number;
  hasStats: boolean;
}

interface FileEditsState {
  edits: FileEdit[];
  addOrMergeEdit: (edit: FileEdit) => void;
  clearEdits: () => void;
}

export const useFileEditsStore = create<FileEditsState>()((set) => ({
  edits: [],

  addOrMergeEdit: (edit: FileEdit) => {
    set((state) => {
      const existing = state.edits.findIndex((e) => e.path === edit.path);
      if (existing !== -1) {
        const prev = state.edits[existing];
        const updated: FileEdit = {
          ...prev,
          additions: prev.additions + edit.additions,
          deletions: prev.deletions + edit.deletions,
          operation: edit.operation, // latest operation wins
          lastEditedAt: edit.lastEditedAt,
          editCount: prev.editCount + 1,
          hasStats: prev.hasStats || edit.hasStats,
        };
        const newEdits = [...state.edits];
        newEdits[existing] = updated;
        return { edits: newEdits };
      }
      return { edits: [...state.edits, edit] };
    });
  },

  clearEdits: () => set({ edits: [] }),
}));
