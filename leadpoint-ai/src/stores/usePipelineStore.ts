import { create } from "zustand";
import type { PipelineItem, PipelineStage, PipelineColumn } from "@/types";

interface PipelineState {
  items: PipelineItem[];
  columns: PipelineColumn[];
  isLoading: boolean;
  selectedItem: PipelineItem | null;

  // Actions
  setItems: (items: PipelineItem[]) => void;
  addItem: (item: PipelineItem) => void;
  updateItem: (id: string, updates: Partial<PipelineItem>) => void;
  removeItem: (id: string) => void;
  moveItem: (itemId: string, newStage: PipelineStage) => void;
  setLoading: (isLoading: boolean) => void;
  setSelectedItem: (item: PipelineItem | null) => void;
}

const STAGE_TITLES: Record<PipelineStage, string> = {
  discovered: "Discovered",
  researching: "Researching",
  contacted: "Contacted",
  negotiating: "Negotiating",
  contracted: "Contracted",
  active: "Active",
  completed: "Completed",
  declined: "Declined",
};

const STAGES: PipelineStage[] = [
  "discovered",
  "researching",
  "contacted",
  "negotiating",
  "contracted",
  "active",
  "completed",
  "declined",
];

function itemsToColumns(items: PipelineItem[]): PipelineColumn[] {
  return STAGES.map((stage) => ({
    id: stage,
    title: STAGE_TITLES[stage],
    items: items.filter((item) => item.stage === stage),
  }));
}

export const usePipelineStore = create<PipelineState>()((set, get) => ({
  items: [],
  columns: itemsToColumns([]),
  isLoading: true,
  selectedItem: null,

  setItems: (items) =>
    set({
      items,
      columns: itemsToColumns(items),
      isLoading: false,
    }),

  addItem: (item) => {
    const newItems = [...get().items, item];
    set({
      items: newItems,
      columns: itemsToColumns(newItems),
    });
  },

  updateItem: (id, updates) => {
    const newItems = get().items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    set({
      items: newItems,
      columns: itemsToColumns(newItems),
    });
  },

  removeItem: (id) => {
    const newItems = get().items.filter((item) => item.id !== id);
    set({
      items: newItems,
      columns: itemsToColumns(newItems),
    });
  },

  moveItem: (itemId, newStage) => {
    const newItems = get().items.map((item) =>
      item.id === itemId
        ? { ...item, stage: newStage, updated_at: new Date().toISOString() }
        : item
    );
    set({
      items: newItems,
      columns: itemsToColumns(newItems),
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setSelectedItem: (item) => set({ selectedItem: item }),
}));
