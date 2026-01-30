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
  Johnny5PRRequest,
  Johnny5TrendAlert,
  Johnny5Skill,
  Johnny5UserIntegration,
  Johnny5Settings,
  Johnny5SetupStatus,
  MoltbotConnectionStatus,
} from '@/types';

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
  
  // Mission Control
  tasks: Johnny5Task[];
  activityLog: Johnny5ActivityEntry[];
  tasksLoading: boolean;
  
  // Morning Brief
  morningBrief: Johnny5MorningBrief | null;
  briefHistory: Johnny5MorningBrief[];
  briefLoading: boolean;
  
  // Proactive Builder
  pendingPRs: Johnny5PRRequest[];
  
  // Trend Monitor
  trendAlerts: Johnny5TrendAlert[];
  
  // Self-Improvement
  skills: Johnny5Skill[];
  
  // Integrations
  connectedIntegrations: Johnny5UserIntegration[];
  
  // Settings
  settings: Johnny5Settings;
  setupStatus: Johnny5SetupStatus;

  // Moltbot connection state
  moltbotStatus: MoltbotConnectionStatus | null;

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
  // PR Actions
  // ================================================================================
  
  setPendingPRs: (prs: Johnny5PRRequest[]) => void;
  addPendingPR: (pr: Johnny5PRRequest) => void;
  updatePRStatus: (id: string, status: Johnny5PRRequest['status']) => void;
  
  // ================================================================================
  // Trend Actions
  // ================================================================================
  
  setTrendAlerts: (alerts: Johnny5TrendAlert[]) => void;
  addTrendAlert: (alert: Johnny5TrendAlert) => void;
  dismissTrendAlert: (id: string) => void;
  
  // ================================================================================
  // Skill Actions
  // ================================================================================
  
  setSkills: (skills: Johnny5Skill[]) => void;
  addSkill: (skill: Johnny5Skill) => void;
  toggleSkill: (id: string) => void;
  
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
  // Moltbot Actions
  // ================================================================================

  setMoltbotStatus: (status: MoltbotConnectionStatus | null) => void;

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
  
  // Mission Control
  tasks: [] as Johnny5Task[],
  activityLog: [] as Johnny5ActivityEntry[],
  tasksLoading: false,
  
  // Morning Brief
  morningBrief: null as Johnny5MorningBrief | null,
  briefHistory: [] as Johnny5MorningBrief[],
  briefLoading: false,
  
  // Proactive Builder
  pendingPRs: [] as Johnny5PRRequest[],
  
  // Trend Monitor
  trendAlerts: [] as Johnny5TrendAlert[],
  
  // Self-Improvement
  skills: [] as Johnny5Skill[],
  
  // Integrations
  connectedIntegrations: [] as Johnny5UserIntegration[],
  
  // Settings
  settings: initialSettings,
  setupStatus: initialSetupStatus,

  // Moltbot
  moltbotStatus: null as MoltbotConnectionStatus | null,
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
        // PR Actions
        // ================================================================================
        
        setPendingPRs: (prs) => set({ pendingPRs: prs }, false, 'setPendingPRs'),
        
        addPendingPR: (pr) => set(
          (state) => ({ pendingPRs: [{ ...pr, id: pr.id || generateId() }, ...state.pendingPRs] }),
          false,
          'addPendingPR'
        ),
        
        updatePRStatus: (id, status) => set(
          (state) => ({
            pendingPRs: state.pendingPRs.map(pr =>
              pr.id === id ? { ...pr, status } : pr
            )
          }),
          false,
          'updatePRStatus'
        ),
        
        // ================================================================================
        // Trend Actions
        // ================================================================================
        
        setTrendAlerts: (alerts) => set({ trendAlerts: alerts }, false, 'setTrendAlerts'),
        
        addTrendAlert: (alert) => set(
          (state) => ({
            trendAlerts: [{ ...alert, id: alert.id || generateId() }, ...state.trendAlerts]
          }),
          false,
          'addTrendAlert'
        ),
        
        dismissTrendAlert: (id) => set(
          (state) => ({
            trendAlerts: state.trendAlerts.map(a =>
              a.id === id ? { ...a, dismissed: true } : a
            )
          }),
          false,
          'dismissTrendAlert'
        ),
        
        // ================================================================================
        // Skill Actions
        // ================================================================================
        
        setSkills: (skills) => set({ skills }, false, 'setSkills'),
        
        addSkill: (skill) => set(
          (state) => ({ skills: [...state.skills, { ...skill, id: skill.id || generateId() }] }),
          false,
          'addSkill'
        ),
        
        toggleSkill: (id) => set(
          (state) => ({
            skills: state.skills.map(s =>
              s.id === id ? { ...s, enabled: !s.enabled } : s
            )
          }),
          false,
          'toggleSkill'
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
        // Moltbot Actions
        // ================================================================================

        setMoltbotStatus: (status) => set({ moltbotStatus: status }, false, 'setMoltbotStatus'),

        // ================================================================================
        // Utility Actions
        // ================================================================================

        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'coder1-johnny5-store',
        partialize: (state) => ({
          // Only persist essential state
          activeTab: state.activeTab,
          isCollapsed: state.isCollapsed,
          analyticsRange: state.analyticsRange,
          settings: state.settings,
          setupStatus: state.setupStatus,
          connectedIntegrations: state.connectedIntegrations,
          skills: state.skills,
        }),
      }
    ),
    {
      name: 'Johnny5 Store'
    }
  )
);

export default useJohnny5Store;
