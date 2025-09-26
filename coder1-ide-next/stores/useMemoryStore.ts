import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LearningEvent {
  id: string;
  timestamp: Date;
  type: 'pattern' | 'solution' | 'error_fix' | 'optimization';
  description: string;
  confidenceGain: number;
  timesSaved?: number;
}

interface MemoryStats {
  totalPatterns: number;
  successRate: number;
  timeSavedMinutes: number;
  sessionsConnected: number;
  aiIntelligenceLevel: number;
  missedOpportunities: number;
  learningEvents: LearningEvent[];
  lastSyncTime: Date;
}

interface MemoryStore extends MemoryStats {
  isPremium: boolean;
  trialEndsAt: Date | null;
  
  // Actions
  setPremiumStatus: (isPremium: boolean, trialEndsAt?: Date | null) => void;
  updateStats: (stats: Partial<MemoryStats>) => void;
  addLearningEvent: (event: Omit<LearningEvent, 'id' | 'timestamp'>) => void;
  incrementMissedOpportunities: () => void;
  calculateIntelligenceGrowth: () => number;
  getTimeSavedToday: () => number;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isPremium: false,
      trialEndsAt: null,
      totalPatterns: 374,
      successRate: 89,
      timeSavedMinutes: 0,
      sessionsConnected: 5,
      aiIntelligenceLevel: 1,
      missedOpportunities: 0,
      learningEvents: [],
      lastSyncTime: new Date(),

      // Actions
      setPremiumStatus: (isPremium, trialEndsAt = null) => {
        set({ isPremium, trialEndsAt });
      },

      updateStats: (stats) => {
        set((state) => ({ ...state, ...stats, lastSyncTime: new Date() }));
      },

      addLearningEvent: (event) => {
        const newEvent: LearningEvent = {
          id: `event_${Date.now()}`,
          timestamp: new Date(),
          ...event,
        };

        set((state) => ({
          learningEvents: [...state.learningEvents, newEvent].slice(-100), // Keep last 100
          totalPatterns: event.type === 'pattern' ? state.totalPatterns + 1 : state.totalPatterns,
          aiIntelligenceLevel: state.aiIntelligenceLevel + (event.confidenceGain * 0.01),
        }));
      },

      incrementMissedOpportunities: () => {
        set((state) => ({ missedOpportunities: state.missedOpportunities + 1 }));
      },

      calculateIntelligenceGrowth: () => {
        const state = get();
        const baselineIntelligence = 100;
        const currentIntelligence = baselineIntelligence + (state.totalPatterns * 0.24);
        const growthPercentage = ((currentIntelligence - baselineIntelligence) / baselineIntelligence) * 100;
        return Math.min(growthPercentage, 99); // Cap at 99%
      },

      getTimeSavedToday: () => {
        const state = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaysEvents = state.learningEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });

        return todaysEvents.reduce((total, event) => total + (event.timesSaved || 0), 0);
      },
    }),
    {
      name: 'memory-storage',
      partialize: (state) => ({
        isPremium: state.isPremium,
        trialEndsAt: state.trialEndsAt,
        totalPatterns: state.totalPatterns,
        successRate: state.successRate,
        timeSavedMinutes: state.timeSavedMinutes,
        sessionsConnected: state.sessionsConnected,
        aiIntelligenceLevel: state.aiIntelligenceLevel,
      }),
    }
  )
);