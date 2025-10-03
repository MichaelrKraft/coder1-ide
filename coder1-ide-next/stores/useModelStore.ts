/**
 * Model Selection Store
 * 
 * Manages Claude model selection across the application.
 * Persists user's model choice to localStorage and provides
 * synchronization across components.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/lib/logger';

interface ModelState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  getModelDisplayName: () => string;
}

// Valid Claude models (as of January 2025)
const VALID_MODELS = [
  'claude-sonnet-4-5-20250929',
  'claude-opus-4-1-20250805',
  'claude-haiku-3-5-20241022'
] as const;

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: DEFAULT_MODEL,
      
      setSelectedModel: (model: string) => {
        // Validate model string
        if (!VALID_MODELS.includes(model as any)) {
          logger.warn(`⚠️ Invalid model selected: ${model}, using default`);
          set({ selectedModel: DEFAULT_MODEL });
          return;
        }
        
        logger.info(`✅ Model updated to: ${model}`);
        set({ selectedModel: model });
      },
      
      getModelDisplayName: () => {
        const model = get().selectedModel;
        
        // Map internal model names to user-friendly display names
        if (model.includes('opus')) return 'Opus 4.1';
        if (model.includes('sonnet-4-5')) return 'Sonnet 4.5';
        if (model.includes('haiku')) return 'Haiku 3.5';
        
        return 'Unknown Model';
      }
    }),
    { 
      name: 'coder1-model-selection',
      version: 1,
      
      // Handle rehydration errors gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate model store:', error);
          // Reset to default on error
          useModelStore.setState({ selectedModel: DEFAULT_MODEL });
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
          logger.debug('📡 Syncing model from other tab:', newState.state.selectedModel);
          useModelStore.setState({ selectedModel: newState.state.selectedModel });
        }
      } catch (error) {
        logger.error('Failed to sync model from storage event:', error);
      }
    }
  });
}
