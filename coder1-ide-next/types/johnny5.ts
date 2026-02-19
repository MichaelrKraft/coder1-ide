/**
 * Johnny5 Type Definitions
 * Types for the autonomous AI employee dashboard and services
 * 
 * Johnny5 is Coder1's autonomous AI employee that:
 * - Works proactively while you sleep
 * - Creates PRs, builds features, monitors trends
 * - Provides visibility into AI operations
 * - Addresses security concerns (prompt injection, audit trails)
 */

// ================================================================================
// Chat Types
// ================================================================================

export interface Johnny5ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  toolCalls?: Johnny5ChatToolCall[];
  thinking?: string;
  reasoningSteps?: string[];
  animationPlayed?: boolean;
}

export interface Johnny5ChatToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

// ================================================================================
// Core Johnny5 Types
// ================================================================================

export type Johnny5Tab =
  | 'chat'
  | 'sessions'
  | 'reasoning'
  | 'analytics'
  | 'context'
  | 'security'
  | 'mission-control'
  | 'morning-brief'
  | 'skills'
  | 'second-brain';

export type Johnny5Status = 'idle' | 'working' | 'sleeping' | 'error';

// ================================================================================
// Session Intelligence Types
// ================================================================================

export interface Johnny5SessionSummary {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'error';
  toolCalls: number;
  filesModified: string[];
  tokensUsed: number;
  thinkingLevel: 'low' | 'medium' | 'high';
  duration?: number; // in minutes
}

export interface Johnny5SessionDetail extends Johnny5SessionSummary {
  steps: Johnny5ReplayStep[];
  fileChanges: Johnny5FileChange[];
  errors: Johnny5Error[];
  reasoning: string;
}

export interface Johnny5FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  timestamp: Date;
}

export interface Johnny5Error {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  resolved: boolean;
}

// ================================================================================
// Reasoning Replay Types
// ================================================================================

export interface Johnny5ReplayStep {
  id: string;
  timestamp: Date;
  type: 'thinking' | 'tool_call' | 'response' | 'decision';
  thinking?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  duration: number; // milliseconds
  outcome: 'success' | 'error' | 'skipped';
}

export interface Johnny5ReplaySession {
  sessionId: string;
  steps: Johnny5ReplayStep[];
  totalDuration: number;
  currentPosition: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 4;
}

// ================================================================================
// Analytics Types
// ================================================================================

export type Johnny5AnalyticsRange = '24h' | '7d' | '30d';

export interface Johnny5Analytics {
  range: Johnny5AnalyticsRange;
  tokenUsage: Johnny5TokenUsage[];
  burnRate: number; // tokens per hour
  burnRateTrend: 'up' | 'down' | 'stable';
  efficiency: Johnny5EfficiencyMetrics;
}

export interface Johnny5TokenUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface Johnny5EfficiencyMetrics {
  tokensPerSession: number;
  successRate: number; // 0-100
  averageSessionDuration: number; // minutes
  tasksCompleted: number;
  prsCreated: number;
}

// ================================================================================
// Context Visualizer Types
// ================================================================================

export interface Johnny5ContextComposition {
  total: number;
  limit: number;
  usagePercentage: number;
  breakdown: {
    system: number;
    conversation: number;
    files: Johnny5FileContext[];
    tools: number;
  };
}

export interface Johnny5FileContext {
  path: string;
  tokens: number;
  addedAt: Date;
}

// ================================================================================
// Security Types (KEY DIFFERENTIATOR)
// ================================================================================

export interface Johnny5SecurityState {
  score: number; // 0-100
  scoreStatus: 'good' | 'warning' | 'critical';
  warnings: Johnny5SecurityWarning[];
  permissions: Johnny5Permission[];
  auditLog: Johnny5AuditEntry[];
  promptInjectionAlerts: Johnny5PromptInjectionAlert[];
}

export interface Johnny5SecurityWarning {
  id: string;
  type: 'api_key_exposed' | 'untrusted_source' | 'permission_escalation' | 'suspicious_activity';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  dismissed: boolean;
  source?: string;
}

export interface Johnny5Permission {
  id: string;
  name: string;
  type: 'file_read' | 'file_write' | 'terminal_exec' | 'network' | 'system';
  scope: string; // e.g., "~/projects/*"
  status: 'allowed' | 'blocked' | 'risky';
  grantedAt: Date;
}

export interface Johnny5AuditEntry {
  id: string;
  timestamp: Date;
  action: 'file_read' | 'file_write' | 'command_exec' | 'api_call' | 'pr_created' | 'blocked';
  target: string;
  source: 'user' | 'ai' | 'external' | 'scheduled';
  reasoning?: string;
  risk: 'low' | 'medium' | 'high';
  blocked: boolean;
  blockReason?: string;
  sessionId?: string;
}

export interface Johnny5PromptInjectionAlert {
  id: string;
  timestamp: Date;
  pattern: string;
  text: string;
  source: 'email' | 'file' | 'terminal' | 'api' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  blocked: boolean;
  actionTaken: string;
}

// ================================================================================
// Crew Types (Johnny5 Crew Feature)
// ================================================================================

export type CrewMemberStatus = 'idle' | 'working' | 'completed';

export interface CrewMember {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  promptPrefix: string;
  exampleTasks: string[];
}

export interface CrewActivityEntry {
  id: string;
  crewMember: string;
  action: 'started' | 'completed' | 'error';
  message: string;
  timestamp: Date;
}

export interface CrewState {
  members: CrewMember[];
  activeCrewMember: string | null;
  crewStatus: Record<string, CrewMemberStatus>;
  activityFeed: CrewActivityEntry[];
}

// ================================================================================
// Mission Control Types (Task Tracking)
// ================================================================================

export type Johnny5TaskStatus =
  | 'inbox'
  | 'queued'
  | 'in_progress'
  | 'review'
  | 'blocked'
  | 'completed'
  | 'failed';
export type Johnny5TaskType = 'build' | 'research' | 'monitor' | 'fix' | 'create_pr' | 'skill' | 'trend';
export type Johnny5TaskTrigger = 'user' | 'schedule' | 'trend' | 'self_improvement' | 'conversation';

export interface Johnny5Task {
  id: string;
  title: string;
  description: string;
  status: Johnny5TaskStatus;
  type: Johnny5TaskType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  result?: {
    prUrl?: string;
    reportPath?: string;
    skillName?: string;
    error?: string;
    summary?: string;
  };
  reasoning: string;
  triggeredBy: Johnny5TaskTrigger;
  assignedCrewMember?: string;
  blockReason?: string;
  parallelCrewMembers?: string[];
}

export interface Johnny5ActivityEntry {
  id: string;
  timestamp: Date;
  type: 'started' | 'completed' | 'failed' | 'created' | 'blocked';
  taskId: string;
  description: string;
}

// ================================================================================
// Morning Brief Types
// ================================================================================

export interface Johnny5MorningBrief {
  id: string;
  date: Date;
  weather?: {
    temperature: number | null;
    condition: string | null;
    location: string;
  };
  builtOvernight: Johnny5BriefItem[];
  researchCompleted: Johnny5BriefItem[];
  trendsSpotted: Johnny5BriefItem[];
  needsAttention: Johnny5BriefItem[];
  learnings?: Johnny5BriefItem[];         // Recent facts + patterns
  livingFileChanges?: Johnny5BriefItem[]; // Living file changes
  summary: string;
  stats?: {
    tokensUsed: number;
    tasksCompleted: number;
    sessionsActive: number;
  };
}

export interface Johnny5BriefItem {
  id: string;
  title: string;
  description: string;
  link?: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: string;
}

export interface Johnny5MorningBriefSettings {
  deliveryTime: string; // "07:00"
  includeWeather: boolean;
  weatherLocation: string;
  competitorsToWatch: string[];
  trendsToMonitor: string[];
  notificationMethod: 'panel' | 'email' | 'slack';
}

// ================================================================================
// Proactive Builder Types (Auto-PR System)
// ================================================================================

export interface Johnny5PRRequest {
  id: string;
  title: string;
  description: string;
  branch: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  createdAt: Date;
  files: string[];
  linesChanged: number;
  testsPass: boolean;
  reasoning: string;
  opportunity: string; // What triggered this
  url?: string;
}

// ================================================================================
// Trend Monitor Types
// ================================================================================

export interface Johnny5TrendAlert {
  id: string;
  timestamp: Date;
  source: 'x' | 'github' | 'hackernews' | 'competitor' | 'custom';
  title: string;
  description: string;
  url?: string;
  relevance: 'low' | 'medium' | 'high';
  opportunity?: string;
  dismissed: boolean;
}

export interface Johnny5TrendMonitorConfig {
  xAccounts: string[];
  xKeywords: string[];
  githubRepos: string[];
  hackerNewsKeywords: string[];
  competitorWebsites: string[];
  industryNewsRss: string[];
  customWebhooks: string[];
}

// ================================================================================
// Self-Improvement Engine Types
// ================================================================================

export interface Johnny5Skill {
  id: string;
  name: string;
  description: string;
  trigger: 'scheduled' | 'event' | 'manual' | 'trend' | 'agent';
  createdBy: 'system' | 'user' | 'self_improvement';
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  successRate: number; // 0-100
  code?: string;
  dependencies: string[];
  enabled: boolean;
  source?: 'local' | 'clawhub';
  clawhubSlug?: string;
  securityScore?: 'safe' | 'warning' | 'dangerous';
  compatibility?: SkillCompatibility;
  category?: SkillCategory;
}

// ================================================================================
// Skill Feedback & Versioning Types
// ================================================================================

export interface SkillFeedback {
  id: string;
  skillId: string;
  rating: number;
  feedbackText?: string;
  executionContext?: string;
  createdAt: Date;
  applied: boolean;
}

export interface SkillVersion {
  id: string;
  skillId: string;
  version: number;
  skillMdContent: string;
  changeSummary?: string;
  feedbackId?: string;
  createdAt: Date;
}

// ================================================================================
// Integration Types
// ================================================================================

export interface Johnny5Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'email' | 'storage' | 'communication' | 'developer';
  capabilities: Johnny5Capability[];
  defaultPermissions: Johnny5IntegrationPermission[];
  oauthConfig?: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
}

export interface Johnny5UserIntegration {
  integrationId: string;
  userId: string;
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  enabledPermissions: string[];
  connectedAt: Date;
  lastUsedAt?: Date;
  status: 'connected' | 'expired' | 'error';
}

export type Johnny5Capability = 'read' | 'write' | 'delete' | 'search' | 'notify' | 'admin';

export interface Johnny5IntegrationPermission {
  capability: Johnny5Capability;
  defaultEnabled: boolean;
  requiresConfirmation: boolean;
  description: string;
}

// ================================================================================
// Settings Types
// ================================================================================

export interface Johnny5Settings {
  // AI Behavior
  proactivityLevel: 'low' | 'medium' | 'high';
  autoActionsAllowed: boolean;
  askBeforeExternalActions: boolean;
  logAllActions: boolean;

  // Security
  promptInjectionDetection: boolean;
  blockSuspiciousInputs: boolean;
  auditLogRetentionDays: number;
  apiKeyEncryption: boolean;

  // Data & Privacy
  sessionHistoryDays: number;
  analyticsDataDays: number;

  // Chat Display
  showTerminalObservations: boolean; // Show terminal observation boxes in Johnny5 chat

  // Morning Brief
  morningBrief: Johnny5MorningBriefSettings;

  // Trend Monitor
  trendMonitor: Johnny5TrendMonitorConfig;
}

export interface Johnny5SetupStatus {
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
}

// ================================================================================
// Store Types (for Zustand)
// ================================================================================

export interface Johnny5State {
  // View state
  activeTab: Johnny5Tab;
  status: Johnny5Status;
  
  // Session Intelligence
  sessions: Johnny5SessionSummary[];
  selectedSessionId: string | null;
  searchQuery: string;
  
  // Reasoning Replay
  replaySession: Johnny5ReplaySession | null;
  
  // Analytics
  analytics: Johnny5Analytics | null;
  analyticsRange: Johnny5AnalyticsRange;
  
  // Context
  contextComposition: Johnny5ContextComposition | null;
  
  // Security (KEY DIFFERENTIATOR)
  security: Johnny5SecurityState;
  
  // Mission Control
  tasks: Johnny5Task[];
  activityLog: Johnny5ActivityEntry[];
  
  // Morning Brief
  morningBrief: Johnny5MorningBrief | null;
  briefHistory: Johnny5MorningBrief[];

  // Integrations
  connectedIntegrations: Johnny5UserIntegration[];
  
  // Settings
  settings: Johnny5Settings;
  setupStatus: Johnny5SetupStatus;
}

// ================================================================================
// API Response Types
// ================================================================================

export interface Johnny5APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface Johnny5PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ================================================================================
// J5 Integration Types
// ================================================================================
// Types for connecting Johnny5 Dashboard to J5 daemon
// J5 provides 24/7 autonomous capabilities, session persistence, and skills

export interface J5Config {
  gatewayUrl: string;
  enabled: boolean;
  reconnectInterval: number;
  maxRetries: number;
  connectionTimeout: number;
  fallbackToDirect: boolean;
}

export interface J5ConnectionStatus {
  connected: boolean;
  gatewayUrl: string | null;
  lastPingAt: Date | null;
  lastPongAt: Date | null;
  reconnectAttempts: number;
  error: string | null;
  fallbackActive: boolean;
}

export interface J5Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: J5ToolCall[];
  thinking?: string;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface J5ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface J5Session {
  id: string;
  name?: string;
  createdAt: Date;
  lastActivityAt: Date;
  messages: J5Message[];
  context: Record<string, unknown>;
  tokenCount: number;
  status: 'active' | 'idle' | 'completed' | 'error';
}

export interface J5Response {
  text: string;
  toolCalls?: J5ToolCall[];
  thinking?: string;
  sessionId: string;
  messageId: string;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface J5Skill {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
  enabled: boolean;
  source: 'local' | 'molthub';
}

export interface J5GatewayEvent {
  type: 'message' | 'session_update' | 'session_list' | 'tool_call' | 'error' | 'ping' | 'pong';
  payload: unknown;
  timestamp: Date;
  sessionId?: string;
}

// ================================================================================
// Skills Store Types (ClawHub Integration)
// ================================================================================

export type SkillCategory =
  | 'productivity'
  | 'research'
  | 'monitoring'
  | 'communication'
  | 'development'
  | 'agents'
  | 'clawhub';

export type SkillCompatibility = 'high' | 'medium' | 'low';

export interface ClawHubSkillSummary {
  slug: string;
  displayName: string;
  summary: string;
  version: string;
  downloads: number;
  stars: number;
  updatedAt: string;
  score: number;
}

export interface ClawHubSkillDetail extends ClawHubSkillSummary {
  owner: { handle: string; displayName: string; image: string };
  tags: string[];
  files: { path: string; sha256: string; size: number }[];
  createdAt: string;
}

export interface ClawHubSearchResponse {
  results: ClawHubSkillSummary[];
  hasMore: boolean;
  cursor?: string;
}

// ================================================================================
// Skill Security Types
// ================================================================================

export interface SkillSecurityFinding {
  severity: 'info' | 'warning' | 'danger';
  pattern: string;
  description: string;
  line?: number;
}

export interface SkillSecurityReport {
  skillId: string;
  score: 'safe' | 'warning' | 'dangerous';
  findings: SkillSecurityFinding[];
  scannedAt: Date;
}
