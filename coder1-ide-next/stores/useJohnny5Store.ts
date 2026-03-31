/**
 * Johnny5 AI Employee Store (Zustand)
 * Centralized state management for the autonomous AI assistant dashboard
 * 
 * Johnny5 is Coder1's autonomous AI employee that:
 * - Works proactively while you sleep
 * - Creates PRs, builds features, monitors trends
 * - Provides visibility into AI operations
 * - Addresses security concerns (prompt injection, audit trails)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Johnny5Tab,
  Johnny5Status,
  Johnny5SessionSummary,
  Johnny5ReplaySession,
  Johnny5Analytics,
  Johnny5AnalyticsRange,
  Johnny5ContextComposition,
  Johnny5SecurityState,
  Johnny5Task,
  Johnny5ActivityEntry,
  Johnny5MorningBrief,
  Johnny5UserIntegration,
  Johnny5Settings,
  Johnny5SetupStatus,
  J5ConnectionStatus,
  CrewMemberStatus,
  CrewActivityEntry,
  Johnny5ChatMessage,
} from '@/types';
import type { J5Tip } from '@/services/johnny5/tip-engine';

// ================================================================================
// Johnny5 Store Interface
// ================================================================================

interface Johnny5Store {
  // ================================================================================
  // State
  // ================================================================================
  
  // View state
  activeTab: Johnny5Tab;
  status: Johnny5Status;
  isCollapsed: boolean;
  
  // Session Intelligence
  sessions: Johnny5SessionSummary[];
  selectedSessionId: string | null;
  searchQuery: string;
  sessionsLoading: boolean;
  
  // Reasoning Replay
  replaySession: Johnny5ReplaySession | null;
  
  // Analytics
  analytics: Johnny5Analytics | null;
  analyticsRange: Johnny5AnalyticsRange;
  analyticsLoading: boolean;
  
  // Context
  contextComposition: Johnny5ContextComposition | null;
  contextLoading: boolean;
  
  // Security (KEY DIFFERENTIATOR)
  security: Johnny5SecurityState;
  securityLoading: boolean;

  // Mission Control
  tasks: Johnny5Task[];
  activityLog: Johnny5ActivityEntry[];
  tasksLoading: boolean;
  
  // Morning Brief
  morningBrief: Johnny5MorningBrief | null;
  briefHistory: Johnny5MorningBrief[];
  briefLoading: boolean;

  // Integrations
  connectedIntegrations: Johnny5UserIntegration[];
  
  // Settings
  settings: Johnny5Settings;
  setupStatus: Johnny5SetupStatus;

  // J5 connection state
  j5Status: J5ConnectionStatus | null;

  // Crew state
  activeCrewMember: string | null;
  crewStatus: Record<string, CrewMemberStatus>;
  crewActivityFeed: CrewActivityEntry[];
  showCrewPanel: boolean;

  // Chat state
  chatMessages: Johnny5ChatMessage[];
  chatSessionId: string | null;

  // Proactive Tips state
  activeTips: J5Tip[];
  dismissedTips: Record<string, number>;  // tipId -> dismissal timestamp

  // ================================================================================
  // View Actions
  // ================================================================================
  
  setActiveTab: (tab: Johnny5Tab) => void;
  setStatus: (status: Johnny5Status) => void;
  toggleCollapsed: () => void;
  
  // ================================================================================
  // Session Actions
  // ================================================================================
  
  setSessions: (sessions: Johnny5SessionSummary[]) => void;
  addSession: (session: Johnny5SessionSummary) => void;
  selectSession: (sessionId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSessionsLoading: (loading: boolean) => void;
  
  // ================================================================================
  // Replay Actions
  // ================================================================================
  
  setReplaySession: (session: Johnny5ReplaySession | null) => void;
  setReplayPosition: (position: number) => void;
  setReplayPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 4) => void;
  
  // ================================================================================
  // Analytics Actions
  // ================================================================================
  
  setAnalytics: (analytics: Johnny5Analytics | null) => void;
  setAnalyticsRange: (range: Johnny5AnalyticsRange) => void;
  setAnalyticsLoading: (loading: boolean) => void;
  
  // ================================================================================
  // Context Actions
  // ================================================================================
  
  setContextComposition: (composition: Johnny5ContextComposition | null) => void;
  setContextLoading: (loading: boolean) => void;
  
  // ================================================================================
  // Security Actions (KEY DIFFERENTIATOR)
  // ================================================================================
  
  updateSecurityScore: (score: number) => void;
  addSecurityWarning: (warning: Johnny5SecurityState['warnings'][0]) => void;
  dismissSecurityWarning: (id: string) => void;
  addAuditEntry: (entry: Johnny5SecurityState['auditLog'][0]) => void;
  addPromptInjectionAlert: (alert: Johnny5SecurityState['promptInjectionAlerts'][0]) => void;
  updatePermission: (id: string, status: 'allowed' | 'blocked' | 'risky') => void;
  setSecurity: (security: Partial<Johnny5SecurityState>) => void;
  setSecurityLoading: (loading: boolean) => void;

  // ================================================================================
  // Mission Control Actions
  // ================================================================================
  
  setTasks: (tasks: Johnny5Task[]) => void;
  addTask: (task: Johnny5Task) => void;
  updateTaskStatus: (id: string, status: Johnny5Task['status']) => void;
  addActivityEntry: (entry: Johnny5ActivityEntry) => void;
  setTasksLoading: (loading: boolean) => void;
  
  // ================================================================================
  // Morning Brief Actions
  // ================================================================================
  
  setMorningBrief: (brief: Johnny5MorningBrief | null) => void;
  setBriefHistory: (history: Johnny5MorningBrief[]) => void;
  setBriefLoading: (loading: boolean) => void;
  dismissBriefItem: (briefId: string, itemId: string) => void;
  
  // ================================================================================
  // Integration Actions
  // ================================================================================
  
  setConnectedIntegrations: (integrations: Johnny5UserIntegration[]) => void;
  addIntegration: (integration: Johnny5UserIntegration) => void;
  removeIntegration: (integrationId: string) => void;
  
  // ================================================================================
  // Settings Actions
  // ================================================================================
  
  updateSettings: (settings: Partial<Johnny5Settings>) => void;
  setSetupStatus: (status: Johnny5SetupStatus) => void;
  completeSetupStep: (step: string) => void;

  // ================================================================================
  // Chat Actions
  // ================================================================================

  addChatMessage: (message: Johnny5ChatMessage) => void;
  updateChatMessage: (id: string, updates: Partial<Johnny5ChatMessage>) => void;
  clearChat: () => void;
  setChatSessionId: (sessionId: string | null) => void;
  markWelcomeAnimationPlayed: () => void;

  // ================================================================================
  // Tip Actions
  // ================================================================================

  setActiveTips: (tips: J5Tip[]) => void;
  dismissTip: (tipId: string) => void;
  clearExpiredDismissals: () => void;

  // ================================================================================
  // J5 Actions
  // ================================================================================

  setJ5Status: (status: J5ConnectionStatus | null) => void;

  // ================================================================================
  // Crew Actions
  // ================================================================================

  setActiveCrewMember: (memberId: string | null) => void;
  setCrewStatus: (memberId: string, status: CrewMemberStatus) => void;
  addCrewActivity: (entry: Omit<CrewActivityEntry, 'id'>) => void;
  clearCrewActivityFeed: () => void;
  setShowCrewPanel: (show: boolean) => void;
  getActiveCrewCount: () => number;

  // ================================================================================
  // Utility Actions
  // ================================================================================
  
  reset: () => void;
}

// ================================================================================
// Initial State
// ================================================================================

const initialSecurityState: Johnny5SecurityState = {
  score: 85,
  scoreStatus: 'good',
  warnings: [],
  permissions: [
    { id: 'file_read', name: 'File Read', type: 'file_read', scope: '~/projects/*', status: 'allowed', grantedAt: new Date() },
    { id: 'file_write', name: 'File Write', type: 'file_write', scope: '~/projects/*', status: 'allowed', grantedAt: new Date() },
    { id: 'terminal_exec', name: 'Terminal Execute', type: 'terminal_exec', scope: '*', status: 'risky', grantedAt: new Date() },
    { id: 'network', name: 'Network Requests', type: 'network', scope: '*', status: 'blocked', grantedAt: new Date() },
    { id: 'system', name: 'System Commands', type: 'system', scope: '*', status: 'blocked', grantedAt: new Date() },
  ],
  auditLog: [],
  promptInjectionAlerts: [],
};

const initialSettings: Johnny5Settings = {
  proactivityLevel: 'medium',
  autoActionsAllowed: false,
  askBeforeExternalActions: true,
  logAllActions: true,
  promptInjectionDetection: true,
  blockSuspiciousInputs: true,
  auditLogRetentionDays: 30,
  apiKeyEncryption: true,
  sessionHistoryDays: 90,
  analyticsDataDays: 30,
  showTerminalObservations: false, // Disabled by default - no observation boxes in chat
  morningBrief: {
    deliveryTime: '07:00',
    includeWeather: true,
    weatherLocation: '',
    competitorsToWatch: [],
    trendsToMonitor: [],
    notificationMethod: 'panel',
  },
  trendMonitor: {
    xAccounts: [],
    xKeywords: [],
    githubRepos: [],
    hackerNewsKeywords: [],
    competitorWebsites: [],
    industryNewsRss: [],
    customWebhooks: [],
  },
};

const initialSetupStatus: Johnny5SetupStatus = {
  isComplete: false,
  currentStep: 0,
  totalSteps: 5,
  completedSteps: [],
};

const initialState = {
  // View state
  activeTab: 'chat' as Johnny5Tab,
  status: 'idle' as Johnny5Status,
  isCollapsed: false,
  
  // Session Intelligence
  sessions: [] as Johnny5SessionSummary[],
  selectedSessionId: null as string | null,
  searchQuery: '',
  sessionsLoading: false,
  
  // Reasoning Replay
  replaySession: null as Johnny5ReplaySession | null,
  
  // Analytics
  analytics: null as Johnny5Analytics | null,
  analyticsRange: '24h' as Johnny5AnalyticsRange,
  analyticsLoading: false,
  
  // Context
  contextComposition: null as Johnny5ContextComposition | null,
  contextLoading: false,
  
  // Security
  security: initialSecurityState,
  securityLoading: false,

  // Mission Control
  tasks: [] as Johnny5Task[],
  activityLog: [] as Johnny5ActivityEntry[],
  tasksLoading: false,
  
  // Morning Brief
  morningBrief: null as Johnny5MorningBrief | null,
  briefHistory: [] as Johnny5MorningBrief[],
  briefLoading: false,

  // Integrations
  connectedIntegrations: [] as Johnny5UserIntegration[],
  
  // Settings
  settings: initialSettings,
  setupStatus: initialSetupStatus,

  // J5 - default to fallback active since chat works via Claude API
  j5Status: {
    connected: false,
    fallbackActive: true, // Chat works via direct Claude API by default
    reconnectAttempts: 0,
    lastConnected: null,
    error: null,
  } as J5ConnectionStatus,

  // Crew state
  activeCrewMember: null as string | null,
  crewStatus: {} as Record<string, CrewMemberStatus>,
  crewActivityFeed: [] as CrewActivityEntry[],
  showCrewPanel: false,

  // Chat state
  chatMessages: [{
    id: 'welcome',
    role: 'assistant' as const,
    content: "Hi, I'm Johnny5, your always on AI assistant and I'm ready to make your life easier. What can I do for you?",
    timestamp: new Date(),
    animationPlayed: false,
  }] as Johnny5ChatMessage[],
  chatSessionId: null as string | null,

  // Proactive Tips
  activeTips: [] as J5Tip[],
  dismissedTips: {} as Record<string, number>,
};

// ================================================================================
// Utility Functions
// ================================================================================

const generateId = () => `j5_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const calculateSecurityStatus = (score: number): 'good' | 'warning' | 'critical' => {
  if (score >= 76) return 'good';
  if (score >= 51) return 'warning';
  return 'critical';
};

// ================================================================================
// Store Implementation
// ================================================================================

export const useJohnny5Store = create<Johnny5Store>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // ================================================================================
        // View Actions
        // ================================================================================
        
        setActiveTab: (tab) => set({ activeTab: tab }, false, 'setActiveTab'),
        
        setStatus: (status) => set({ status }, false, 'setStatus'),
        
        toggleCollapsed: () => set(
          (state) => ({ isCollapsed: !state.isCollapsed }),
          false,
          'toggleCollapsed'
        ),
        
        // ================================================================================
        // Session Actions
        // ================================================================================
        
        setSessions: (sessions) => set({ sessions }, false, 'setSessions'),
        
        addSession: (session) => set(
          (state) => ({ sessions: [session, ...state.sessions] }),
          false,
          'addSession'
        ),
        
        selectSession: (sessionId) => set({ selectedSessionId: sessionId }, false, 'selectSession'),
        
        setSearchQuery: (query) => set({ searchQuery: query }, false, 'setSearchQuery'),
        
        setSessionsLoading: (loading) => set({ sessionsLoading: loading }, false, 'setSessionsLoading'),
        
        // ================================================================================
        // Replay Actions
        // ================================================================================
        
        setReplaySession: (session) => set({ replaySession: session }, false, 'setReplaySession'),
        
        setReplayPosition: (position) => set(
          (state) => ({
            replaySession: state.replaySession 
              ? { ...state.replaySession, currentPosition: position }
              : null
          }),
          false,
          'setReplayPosition'
        ),
        
        setReplayPlaying: (playing) => set(
          (state) => ({
            replaySession: state.replaySession
              ? { ...state.replaySession, isPlaying: playing }
              : null
          }),
          false,
          'setReplayPlaying'
        ),
        
        setPlaybackSpeed: (speed) => set(
          (state) => ({
            replaySession: state.replaySession
              ? { ...state.replaySession, playbackSpeed: speed }
              : null
          }),
          false,
          'setPlaybackSpeed'
        ),
        
        // ================================================================================
        // Analytics Actions
        // ================================================================================
        
        setAnalytics: (analytics) => set({ analytics }, false, 'setAnalytics'),
        
        setAnalyticsRange: (range) => set({ analyticsRange: range }, false, 'setAnalyticsRange'),
        
        setAnalyticsLoading: (loading) => set({ analyticsLoading: loading }, false, 'setAnalyticsLoading'),
        
        // ================================================================================
        // Context Actions
        // ================================================================================
        
        setContextComposition: (composition) => set({ contextComposition: composition }, false, 'setContextComposition'),
        
        setContextLoading: (loading) => set({ contextLoading: loading }, false, 'setContextLoading'),
        
        // ================================================================================
        // Security Actions (KEY DIFFERENTIATOR)
        // ================================================================================
        
        updateSecurityScore: (score) => set(
          (state) => ({
            security: {
              ...state.security,
              score,
              scoreStatus: calculateSecurityStatus(score),
            }
          }),
          false,
          'updateSecurityScore'
        ),
        
        addSecurityWarning: (warning) => set(
          (state) => ({
            security: {
              ...state.security,
              warnings: [{ ...warning, id: warning.id || generateId() }, ...state.security.warnings],
            }
          }),
          false,
          'addSecurityWarning'
        ),
        
        dismissSecurityWarning: (id) => set(
          (state) => ({
            security: {
              ...state.security,
              warnings: state.security.warnings.map(w =>
                w.id === id ? { ...w, dismissed: true } : w
              ),
            }
          }),
          false,
          'dismissSecurityWarning'
        ),
        
        addAuditEntry: (entry) => set(
          (state) => ({
            security: {
              ...state.security,
              auditLog: [{ ...entry, id: entry.id || generateId() }, ...state.security.auditLog.slice(0, 999)],
            }
          }),
          false,
          'addAuditEntry'
        ),
        
        addPromptInjectionAlert: (alert) => set(
          (state) => ({
            security: {
              ...state.security,
              promptInjectionAlerts: [
                { ...alert, id: alert.id || generateId() },
                ...state.security.promptInjectionAlerts
              ],
            }
          }),
          false,
          'addPromptInjectionAlert'
        ),
        
        updatePermission: (id, status) => set(
          (state) => ({
            security: {
              ...state.security,
              permissions: state.security.permissions.map(p =>
                p.id === id ? { ...p, status } : p
              ),
            }
          }),
          false,
          'updatePermission'
        ),

        setSecurity: (security) => set(
          (state) => ({
            security: {
              ...state.security,
              ...security,
            }
          }),
          false,
          'setSecurity'
        ),

        setSecurityLoading: (loading) => set(
          { securityLoading: loading },
          false,
          'setSecurityLoading'
        ),

        // ================================================================================
        // Mission Control Actions
        // ================================================================================
        
        setTasks: (tasks) => set({ tasks }, false, 'setTasks'),
        
        addTask: (task) => set(
          (state) => ({ tasks: [{ ...task, id: task.id || generateId() }, ...state.tasks] }),
          false,
          'addTask'
        ),
        
        updateTaskStatus: (id, status) => set(
          (state) => ({
            tasks: state.tasks.map(t =>
              t.id === id ? { ...t, status, ...(status === 'completed' ? { completedAt: new Date() } : {}) } : t
            )
          }),
          false,
          'updateTaskStatus'
        ),
        
        addActivityEntry: (entry) => set(
          (state) => ({
            activityLog: [{ ...entry, id: entry.id || generateId() }, ...state.activityLog.slice(0, 199)]
          }),
          false,
          'addActivityEntry'
        ),
        
        setTasksLoading: (loading) => set({ tasksLoading: loading }, false, 'setTasksLoading'),
        
        // ================================================================================
        // Morning Brief Actions
        // ================================================================================
        
        setMorningBrief: (brief) => set({ morningBrief: brief }, false, 'setMorningBrief'),
        
        setBriefHistory: (history) => set({ briefHistory: history }, false, 'setBriefHistory'),
        
        setBriefLoading: (loading) => set({ briefLoading: loading }, false, 'setBriefLoading'),
        
        dismissBriefItem: (briefId, itemId) => set(
          (state) => {
            if (!state.morningBrief || state.morningBrief.id !== briefId) return state;
            return {
              morningBrief: {
                ...state.morningBrief,
                needsAttention: state.morningBrief.needsAttention.filter(i => i.id !== itemId),
              }
            };
          },
          false,
          'dismissBriefItem'
        ),
        
        // ================================================================================
        // Integration Actions
        // ================================================================================
        
        setConnectedIntegrations: (integrations) => set({ connectedIntegrations: integrations }, false, 'setConnectedIntegrations'),
        
        addIntegration: (integration) => set(
          (state) => ({ connectedIntegrations: [...state.connectedIntegrations, integration] }),
          false,
          'addIntegration'
        ),
        
        removeIntegration: (integrationId) => set(
          (state) => ({
            connectedIntegrations: state.connectedIntegrations.filter(i => i.integrationId !== integrationId)
          }),
          false,
          'removeIntegration'
        ),
        
        // ================================================================================
        // Settings Actions
        // ================================================================================
        
        updateSettings: (newSettings) => set(
          (state) => ({ settings: { ...state.settings, ...newSettings } }),
          false,
          'updateSettings'
        ),
        
        setSetupStatus: (status) => set({ setupStatus: status }, false, 'setSetupStatus'),
        
        completeSetupStep: (step) => set(
          (state) => ({
            setupStatus: {
              ...state.setupStatus,
              completedSteps: [...state.setupStatus.completedSteps, step],
              currentStep: state.setupStatus.currentStep + 1,
              isComplete: state.setupStatus.currentStep + 1 >= state.setupStatus.totalSteps,
            }
          }),
          false,
          'completeSetupStep'
        ),

        // ================================================================================
        // Chat Actions
        // ================================================================================

        addChatMessage: (message) => set(
          (state) => ({
            chatMessages: [...state.chatMessages, message]
          }),
          false,
          'addChatMessage'
        ),

        updateChatMessage: (id, updates) => set(
          (state) => ({
            chatMessages: state.chatMessages.map(msg =>
              msg.id === id ? { ...msg, ...updates } : msg
            )
          }),
          false,
          'updateChatMessage'
        ),

        clearChat: () => {
          // Emit session complete event before clearing (for cross-session memory)
          const state = get();
          if (typeof window !== 'undefined' && state.chatMessages.length > 1) {
            // Build a summary from the conversation
            const userMessages = state.chatMessages.filter(m => m.role === 'user');
            const assistantMessages = state.chatMessages.filter(m => m.role === 'assistant');
            const summary = userMessages.slice(0, 3).map(m => m.content.slice(0, 100)).join(' | ');

            window.dispatchEvent(new CustomEvent('johnny5:sessionComplete', {
              detail: {
                sessionId: state.chatSessionId,
                sessionName: `Session ${new Date().toLocaleDateString()}`,
                summary: summary || 'Chat session',
                filesModified: [],  // Could be populated from terminal activity
                errorPatterns: [],
                accomplishments: [],
                tokensUsed: 0,
                duration: Math.round((Date.now() - (state.chatMessages[0]?.timestamp?.getTime() || Date.now())) / 60000),
              }
            }));
            console.log('[Johnny5Store] Emitted johnny5:sessionComplete event');
          }

          // Clear the chat display but keep the same session (preserves unified session continuity)
          set({
            chatMessages: [{
              id: `welcome-${Date.now()}`,
              role: 'assistant' as const,
              content: "Hi, I'm Johnny5, your always on AI assistant and I'm ready to make your life easier. What can I do for you?",
              timestamp: new Date(),
              animationPlayed: false,
            }],
            // Note: chatSessionId intentionally NOT reset — keeping the unified main session
          }, false, 'clearChat');
        },

        setChatSessionId: (sessionId) => set({ chatSessionId: sessionId }, false, 'setChatSessionId'),

        markWelcomeAnimationPlayed: () => set(
          (state) => ({
            chatMessages: state.chatMessages.map(msg =>
              msg.id.startsWith('welcome') ? { ...msg, animationPlayed: true } : msg
            )
          }),
          false,
          'markWelcomeAnimationPlayed'
        ),

        // ================================================================================
        // Tip Actions
        // ================================================================================

        setActiveTips: (tips) => set({ activeTips: tips }, false, 'setActiveTips'),

        dismissTip: (tipId) => set(
          (state) => {
            const newDismissed = { ...state.dismissedTips, [tipId]: Date.now() };
            // Also persist to localStorage for tip-engine to read
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('coder1-j5-dismissed-tips', JSON.stringify(newDismissed));
              } catch { /* ignore */ }
            }
            return {
              dismissedTips: newDismissed,
              activeTips: state.activeTips.filter(t => t.id !== tipId),
            };
          },
          false,
          'dismissTip'
        ),

        clearExpiredDismissals: () => set(
          (state) => {
            const now = Date.now();
            const DAY_MS = 86400000;
            const cleaned: Record<string, number> = {};
            for (const [id, ts] of Object.entries(state.dismissedTips)) {
              if (now - ts < DAY_MS) {
                cleaned[id] = ts;
              }
            }
            return { dismissedTips: cleaned };
          },
          false,
          'clearExpiredDismissals'
        ),

        // ================================================================================
        // J5 Actions
        // ================================================================================

        setJ5Status: (status) => set({ j5Status: status }, false, 'setJ5Status'),

        // ================================================================================
        // Crew Actions
        // ================================================================================

        setActiveCrewMember: (memberId) => set({ activeCrewMember: memberId }, false, 'setActiveCrewMember'),

        setCrewStatus: (memberId, status) => set(
          (state) => ({
            crewStatus: { ...state.crewStatus, [memberId]: status }
          }),
          false,
          'setCrewStatus'
        ),

        addCrewActivity: (entry) => set(
          (state) => ({
            crewActivityFeed: [
              { ...entry, id: generateId() },
              ...state.crewActivityFeed.slice(0, 99) // Keep last 100 entries
            ]
          }),
          false,
          'addCrewActivity'
        ),

        clearCrewActivityFeed: () => set({ crewActivityFeed: [] }, false, 'clearCrewActivityFeed'),

        setShowCrewPanel: (show) => set({ showCrewPanel: show }, false, 'setShowCrewPanel'),

        getActiveCrewCount: () => {
          const state = get();
          return Object.values(state.crewStatus).filter(s => s === 'working').length;
        },

        // ================================================================================
        // Utility Actions
        // ================================================================================

        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'coder1-johnny5-store',
        partialize: (state) => ({
          // Only persist essential state
          isCollapsed: state.isCollapsed,
          analyticsRange: state.analyticsRange,
          settings: state.settings,
          setupStatus: state.setupStatus,
          connectedIntegrations: state.connectedIntegrations,
          chatSessionId: state.chatSessionId, // Persist so DB history survives page reloads
          dismissedTips: state.dismissedTips, // Persist tip dismissals across page reloads
        }),
      }
    ),
    {
      name: 'Johnny5 Store'
    }
  )
);

export default useJohnny5Store;
