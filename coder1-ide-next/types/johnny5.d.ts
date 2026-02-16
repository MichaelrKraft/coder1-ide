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
export type Johnny5Tab = 'chat' | 'sessions' | 'reasoning' | 'analytics' | 'context' | 'security' | 'mission-control' | 'morning-brief';
export type Johnny5Status = 'idle' | 'working' | 'sleeping' | 'error';
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
    duration?: number;
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
export interface Johnny5ReplayStep {
    id: string;
    timestamp: Date;
    type: 'thinking' | 'tool_call' | 'response' | 'decision';
    thinking?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: Record<string, unknown>;
    duration: number;
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
export type Johnny5AnalyticsRange = '24h' | '7d' | '30d';
export interface Johnny5Analytics {
    range: Johnny5AnalyticsRange;
    tokenUsage: Johnny5TokenUsage[];
    burnRate: number;
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
    successRate: number;
    averageSessionDuration: number;
    tasksCompleted: number;
    prsCreated: number;
}
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
export interface Johnny5SecurityState {
    score: number;
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
    scope: string;
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
export type Johnny5TaskStatus = 'queued' | 'in_progress' | 'review' | 'completed' | 'failed';
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
    duration?: number;
    result?: {
        prUrl?: string;
        reportPath?: string;
        skillName?: string;
        error?: string;
        summary?: string;
    };
    reasoning: string;
    triggeredBy: Johnny5TaskTrigger;
    scheduledAt?: Date;
    deliverAt?: Date;
    retryCount?: number;
    maxRetries?: number;
    lastError?: string;
}
export interface Johnny5ActivityEntry {
    id: string;
    timestamp: Date;
    type: 'started' | 'completed' | 'failed' | 'created' | 'blocked';
    taskId: string;
    description: string;
}
export interface Johnny5MorningBrief {
    id: string;
    date: Date;
    weather?: {
        temperature: number;
        condition: string;
        location: string;
    };
    builtOvernight: Johnny5BriefItem[];
    researchCompleted: Johnny5BriefItem[];
    trendsSpotted: Johnny5BriefItem[];
    needsAttention: Johnny5BriefItem[];
    summary: string;
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
    deliveryTime: string;
    includeWeather: boolean;
    weatherLocation: string;
    competitorsToWatch: string[];
    trendsToMonitor: string[];
    notificationMethod: 'panel' | 'email' | 'slack';
}
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
    opportunity: string;
    url?: string;
}
export interface Johnny5BuilderRules {
    maxPRsPerDay: number;
    maxFilesPerPR: number;
    maxLinesChanged: number;
    requireTestsPass: boolean;
    forbidden: string[];
    required: string[];
}
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
export interface Johnny5Skill {
    id: string;
    name: string;
    description: string;
    trigger: 'scheduled' | 'event' | 'manual' | 'trend';
    createdBy: 'system' | 'user' | 'self_improvement';
    createdAt: Date;
    lastUsed?: Date;
    usageCount: number;
    successRate: number;
    code?: string;
    dependencies: string[];
    enabled: boolean;
}
export interface Johnny5SelfImprovement {
    suggestedSkills: Johnny5Skill[];
    learnedPatterns: Johnny5LearnedPattern[];
    userPreferences: Record<string, unknown>;
}
export interface Johnny5LearnedPattern {
    id: string;
    pattern: string;
    examples: string[];
    confidence: number;
    lastSeen: Date;
}
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
    accessToken: string;
    refreshToken?: string;
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
export interface Johnny5Settings {
    proactivityLevel: 'low' | 'medium' | 'high';
    autoActionsAllowed: boolean;
    askBeforeExternalActions: boolean;
    logAllActions: boolean;
    promptInjectionDetection: boolean;
    blockSuspiciousInputs: boolean;
    auditLogRetentionDays: number;
    apiKeyEncryption: boolean;
    sessionHistoryDays: number;
    analyticsDataDays: number;
    morningBrief: Johnny5MorningBriefSettings;
    trendMonitor: Johnny5TrendMonitorConfig;
}
export interface Johnny5SetupStatus {
    isComplete: boolean;
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
}
export interface Johnny5State {
    activeTab: Johnny5Tab;
    status: Johnny5Status;
    sessions: Johnny5SessionSummary[];
    selectedSessionId: string | null;
    searchQuery: string;
    replaySession: Johnny5ReplaySession | null;
    analytics: Johnny5Analytics | null;
    analyticsRange: Johnny5AnalyticsRange;
    contextComposition: Johnny5ContextComposition | null;
    security: Johnny5SecurityState;
    tasks: Johnny5Task[];
    activityLog: Johnny5ActivityEntry[];
    morningBrief: Johnny5MorningBrief | null;
    briefHistory: Johnny5MorningBrief[];
    pendingPRs: Johnny5PRRequest[];
    trendAlerts: Johnny5TrendAlert[];
    skills: Johnny5Skill[];
    connectedIntegrations: Johnny5UserIntegration[];
    settings: Johnny5Settings;
    setupStatus: Johnny5SetupStatus;
}
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
export interface MoltbotConfig {
    gatewayUrl: string;
    enabled: boolean;
    reconnectInterval: number;
    maxRetries: number;
    connectionTimeout: number;
    fallbackToDirect: boolean;
}
export interface MoltbotConnectionStatus {
    connected: boolean;
    gatewayUrl: string | null;
    lastPingAt: Date | null;
    lastPongAt: Date | null;
    reconnectAttempts: number;
    error: string | null;
    fallbackActive: boolean;
}
export interface MoltbotMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    toolCalls?: MoltbotToolCall[];
    thinking?: string;
    tokenUsage?: {
        input: number;
        output: number;
    };
}
export interface MoltbotToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
    output?: string;
    status: 'pending' | 'running' | 'complete' | 'error';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}
export interface MoltbotSession {
    id: string;
    name?: string;
    createdAt: Date;
    lastActivityAt: Date;
    messages: MoltbotMessage[];
    context: Record<string, unknown>;
    tokenCount: number;
    status: 'active' | 'idle' | 'completed' | 'error';
}
export interface MoltbotResponse {
    text: string;
    toolCalls?: MoltbotToolCall[];
    thinking?: string;
    sessionId: string;
    messageId: string;
    tokenUsage?: {
        input: number;
        output: number;
    };
}
export interface MoltbotSkill {
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
export interface MoltbotGatewayEvent {
    type: 'message' | 'session_update' | 'session_list' | 'tool_call' | 'error' | 'ping' | 'pong';
    payload: unknown;
    timestamp: Date;
    sessionId?: string;
}
