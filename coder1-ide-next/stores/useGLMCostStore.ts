import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/lib/logger';

export interface GLMUsageSession {
  id: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
}

interface GLMCostState {
  totalTokens: number;
  totalCost: number;
  sessionTokens: number;
  sessionCost: number;
  usageHistory: GLMUsageSession[];
  
  addUsage: (tokens: number, model: string, cost?: number) => void;
  resetSession: () => void;
  resetTotal: () => void;
  getSessionSummary: () => string;
  getTotalSummary: () => string;
}

export const useGLMCostStore = create<GLMCostState>()(
  persist(
    (set, get) => ({
      totalTokens: 0,
      totalCost: 0,
      sessionTokens: 0,
      sessionCost: 0,
      usageHistory: [],
      
      addUsage: (tokens: number, model: string = 'glm-4-flash', cost?: number) => {
        const costPerToken = cost !== undefined 
          ? cost / tokens 
          : (model === 'glm-4-flash' ? 0.10 / 1_000_000 :
             model === 'glm-4-air' ? 1.00 / 1_000_000 :
             model === 'glm-4-plus' ? 50.00 / 1_000_000 :
             0.10 / 1_000_000);
        
        const calculatedCost = cost !== undefined ? cost : tokens * costPerToken;
        
        const newSession: GLMUsageSession = {
          id: `session-${Date.now()}`,
          model,
          tokens,
          cost: calculatedCost,
          timestamp: new Date()
        };
        
        set({
          totalTokens: get().totalTokens + tokens,
          totalCost: get().totalCost + calculatedCost,
          sessionTokens: get().sessionTokens + tokens,
          sessionCost: get().sessionCost + calculatedCost,
          usageHistory: [...get().usageHistory, newSession]
        });
        
        logger.info(`💰 GLM Usage: +${tokens} tokens ($${calculatedCost.toFixed(6)}) | Session: $${(get().sessionCost + calculatedCost).toFixed(6)} | Total: $${(get().totalCost + calculatedCost).toFixed(6)}`);
      },
      
      resetSession: () => {
        logger.info('🔄 Resetting GLM session costs');
        set({ sessionTokens: 0, sessionCost: 0 });
      },
      
      resetTotal: () => {
        logger.info('🧹 Resetting all GLM costs and history');
        set({ 
          totalTokens: 0, 
          totalCost: 0, 
          sessionTokens: 0, 
          sessionCost: 0,
          usageHistory: []
        });
      },
      
      getSessionSummary: () => {
        const { sessionTokens, sessionCost } = get();
        return `Session: ${sessionTokens.toLocaleString()} tokens, $${sessionCost.toFixed(4)}`;
      },
      
      getTotalSummary: () => {
        const { totalTokens, totalCost } = get();
        return `Total: ${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(4)}`;
      }
    }),
    { 
      name: 'glm-cost-tracking',
      version: 1,
      
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate GLM cost store:', error);
          useGLMCostStore.setState({ 
            totalTokens: 0, 
            totalCost: 0, 
            sessionTokens: 0, 
            sessionCost: 0,
            usageHistory: []
          });
        }
      }
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'glm-cost-tracking' && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue);
        if (newState?.state) {
          logger.debug('📡 Syncing GLM costs from other tab');
          useGLMCostStore.setState(newState.state);
        }
      } catch (error) {
        logger.error('Failed to sync GLM costs from storage event:', error);
      }
    }
  });
}
