/**
 * Mission Control Store (Zustand)
 * Centralized state management for Mission Control functionality
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MCModuleId, BrowserSession, Artifact } from '@/types';

// ================================================================================
// Mission Control Store Interface
// ================================================================================

// Dashboard modes for Agent Dashboard
export type DashboardMode = 'setup' | 'monitoring' | 'results';

interface MissionControlStore {
  // Active module state
  activeModule: MCModuleId;

  // Browser automation state
  browserSession: BrowserSession | null;

  // Artifacts state
  artifacts: Artifact[];

  // Details panel state
  detailsContent: React.ReactNode | null;

  // Mission Control visibility
  isOpen: boolean;

  // Agent Dashboard state
  dashboardMode: DashboardMode;
  activeAgents: any[];
  explorationResults: any[];

  // ================================================================================
  // Module Actions
  // ================================================================================

  setActiveModule: (module: MCModuleId) => void;

  // ================================================================================
  // Browser Session Actions
  // ================================================================================

  setBrowserSession: (session: BrowserSession | null) => void;

  // ================================================================================
  // Artifacts Actions
  // ================================================================================

  setArtifacts: (artifacts: Artifact[]) => void;
  addArtifact: (artifact: Artifact) => void;
  removeArtifact: (id: string) => void;
  clearArtifacts: () => void;

  // ================================================================================
  // Details Panel Actions
  // ================================================================================

  setDetailsContent: (content: React.ReactNode | null) => void;

  // ================================================================================
  // Visibility Actions
  // ================================================================================

  open: () => void;
  close: () => void;
  toggle: () => void;

  // ================================================================================
  // Agent Dashboard Actions
  // ================================================================================

  setDashboardMode: (mode: DashboardMode) => void;
  setActiveAgents: (agents: any[]) => void;
  setExplorationResults: (results: any[]) => void;
  startMonitoring: (agents: any[]) => void;
  completeExploration: (results: any[]) => void;

  // ================================================================================
  // Utility Actions
  // ================================================================================

  reset: () => void;
}

// ================================================================================
// Initial State
// ================================================================================

const initialState = {
  activeModule: 'agents' as MCModuleId,  // Agents is PRIMARY module
  browserSession: null as BrowserSession | null,
  artifacts: [] as Artifact[],
  detailsContent: null as React.ReactNode | null,
  isOpen: false,
  // Agent Dashboard state
  dashboardMode: 'setup' as DashboardMode,
  activeAgents: [] as any[],
  explorationResults: [] as any[],
};

// ================================================================================
// Store Implementation
// ================================================================================

export const useMissionControlStore = create<MissionControlStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // ================================================================================
      // Module Actions
      // ================================================================================

      setActiveModule: (module) =>
        set({ activeModule: module }, false, `setActiveModule:${module}`),

      // ================================================================================
      // Browser Session Actions
      // ================================================================================

      setBrowserSession: (session) =>
        set({ browserSession: session }, false, 'setBrowserSession'),

      // ================================================================================
      // Artifacts Actions
      // ================================================================================

      setArtifacts: (artifacts) =>
        set({ artifacts }, false, 'setArtifacts'),

      addArtifact: (artifact) =>
        set((state) => ({
          artifacts: [...state.artifacts, artifact]
        }), false, 'addArtifact'),

      removeArtifact: (id) =>
        set((state) => ({
          artifacts: state.artifacts.filter(a => a.id !== id)
        }), false, `removeArtifact:${id}`),

      clearArtifacts: () =>
        set({ artifacts: [] }, false, 'clearArtifacts'),

      // ================================================================================
      // Details Panel Actions
      // ================================================================================

      setDetailsContent: (content) =>
        set({ detailsContent: content }, false, 'setDetailsContent'),

      // ================================================================================
      // Visibility Actions
      // ================================================================================

      open: () =>
        set({ isOpen: true }, false, 'open'),

      close: () =>
        set({ isOpen: false }, false, 'close'),

      toggle: () =>
        set((state) => ({ isOpen: !state.isOpen }), false, 'toggle'),

      // ================================================================================
      // Agent Dashboard Actions
      // ================================================================================

      setDashboardMode: (mode) =>
        set({ dashboardMode: mode }, false, `setDashboardMode:${mode}`),

      setActiveAgents: (agents) =>
        set({ activeAgents: agents }, false, 'setActiveAgents'),

      setExplorationResults: (results) =>
        set({ explorationResults: results }, false, 'setExplorationResults'),

      startMonitoring: (agents) =>
        set({
          dashboardMode: 'monitoring',
          activeAgents: agents
        }, false, 'startMonitoring'),

      completeExploration: (results) =>
        set({
          dashboardMode: 'results',
          explorationResults: results
        }, false, 'completeExploration'),

      // ================================================================================
      // Utility Actions
      // ================================================================================

      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'Mission Control Store'
    }
  )
);
