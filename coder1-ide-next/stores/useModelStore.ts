/**
 * Model Selection Store
 * 
 * Manages Claude model selection across the application.
 * Persists user's model choice to localStorage and provides
 * synchronization across components.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModelState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  getModelDisplayName: () => string;
}

// Valid Claude models, GLM model, and Gemini model (as of February 2026)
const VALID_MODELS = [
  'claude-sonnet-4-6',         // Sonnet 4.6 - Fast & Capable (Default)
  'claude-opus-4-6',           // Opus 4.6 - Most Capable
  'claude-sonnet-4-5-20250929',
  'claude-haiku-3-5-20241022',
  'glm-4.6',                   // GLM 4.6 (overflow capacity)
  'gemini-2.5-flash-lite'
] as const;

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Migration map for old model IDs to current ones
const MODEL_MIGRATIONS: Record<string, string> = {
  'claude-opus-4-1-20250805': 'claude-opus-4-6',  // Opus 4.1 → Opus 4.6
  'claude-opus-4-5-20251101': 'claude-opus-4-6',  // Opus 4.5 → Opus 4.6
  'glm-4-flash': 'glm-4.6',      // Old Flash → GLM 4.6
  'glm-4-air': 'glm-4.6',        // Old Air → GLM 4.6
  'glm-4-plus': 'glm-4.6',       // Old Plus → GLM 4.6
  'glm-4-0520': 'glm-4.6',       // Old date version → GLM 4.6
  'glm-4.5': 'glm-4.6',          // Deprecated GLM 4.5 → GLM 4.6
  'glm-4.5-air': 'glm-4.6',      // Deprecated GLM 4.5 Air → GLM 4.6
  'gemini-2.5-flash': 'gemini-2.5-flash-lite',  // Deprecated Flash → Flash-Lite
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-6'  // Sonnet 4.5 → Sonnet 4.6
};

// Migrate old model ID to new one if needed
function migrateModel(model: string): string {
  if (MODEL_MIGRATIONS[model]) {
    console.log(`🔄 [MODEL STORE] Migrating model: ${model} → ${MODEL_MIGRATIONS[model]}`);
    return MODEL_MIGRATIONS[model];
  }
  return model;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: DEFAULT_MODEL,
      
      setSelectedModel: (model: string) => {
        // Validate model string
        if (!VALID_MODELS.includes(model as any)) {
          console.warn(`⚠️ [MODEL STORE] Invalid model selected: ${model}, using default`);
          set({ selectedModel: DEFAULT_MODEL });
          return;
        }
        
        console.log(`✅ [MODEL STORE] Model updated to: ${model}`);
        set({ selectedModel: model });
      },
      
      getModelDisplayName: () => {
        const model = get().selectedModel;

        // Map internal model names to user-friendly display names
        if (model === 'claude-sonnet-4-6') return 'Sonnet 4.6';
        if (model === 'claude-opus-4-6') return 'Opus 4.6';
        if (model.includes('sonnet-4-5')) return 'Sonnet 4.5';
        if (model.includes('haiku')) return 'Haiku 3.5';
        
        // GLM model
        if (model === 'glm-4.6') return 'GLM 4.6';
        
        // Gemini model
        if (model === 'gemini-2.5-flash-lite') return 'Gemini 2.5 Flash-Lite';
        
        return 'Unknown Model';
      }
    }),
    {
      name: 'coder1-model-selection',
      version: 8,  // VERSION 8 - Sonnet 4.6 as default (Feb 2026)
      
      // MIGRATION FUNCTION - Runs regardless of version
      migrate: (persistedState: any, version: number) => {
        console.log(`🔄 [MODEL STORE] MIGRATE FUNCTION CALLED - persisted version: ${version}, code version: 8`);
        console.log(`🔄 [MODEL STORE] Persisted state:`, persistedState);

        // NUCLEAR OPTION: Clear old localStorage completely
        if (typeof window !== 'undefined') {
          const oldData = localStorage.getItem('coder1-model-selection');
          console.log(`🔄 [MODEL STORE] Old localStorage data:`, oldData);

          // Force clear and set new state
          localStorage.removeItem('coder1-model-selection');
          console.log(`🧹 [MODEL STORE] Cleared old localStorage`);
        }

        // Return fresh state with Sonnet 4.6 as default
        const freshState = {
          state: { selectedModel: DEFAULT_MODEL },
          version: 8
        };
        console.log(`✅ [MODEL STORE] Migration complete - returning:`, freshState);
        return freshState;
      },
      
      // Migrate and validate on rehydration
      onRehydrateStorage: (state) => {
        console.log(`🔄 [MODEL STORE] onRehydrateStorage CALLED`);
        
        // CRITICAL FIX: Don't call useModelStore methods during initialization
        // Just modify the state object directly
        if (state) {
          console.log(`🔄 [MODEL STORE] Rehydrated state:`, state);
          console.log(`🔄 [MODEL STORE] Version 8 migration: Forcing reset to ${DEFAULT_MODEL}`);
          state.selectedModel = DEFAULT_MODEL;
          console.log(`✅ [MODEL STORE] Reset complete - model set to ${DEFAULT_MODEL}`);
        } else {
          console.log(`⚠️ [MODEL STORE] No state to rehydrate, will use defaults`);
        }
      }
    }
  )
);

// Cross-tab synchronization - listen for storage changes in other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'coder1-model-selection' && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue);
        if (newState?.state?.selectedModel) {
          console.log('📡 [MODEL STORE] Syncing model from other tab:', newState.state.selectedModel);
          useModelStore.setState({ selectedModel: newState.state.selectedModel });
        }
      } catch (error) {
        console.error('❌ [MODEL STORE] Failed to sync model from storage event:', error);
      }
    }
  });
}
