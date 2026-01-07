/**
 * MCP Manager Type Definitions
 *
 * Types for Model Context Protocol server management in Coder1 IDE
 */

// ============================================================================
// Core MCP Server Types
// ============================================================================

export type MCPServerCategory = 'filesystem' | 'code' | 'web' | 'ai' | 'database' | 'custom';
export type MCPServerStatus = 'connected' | 'disconnected' | 'error' | 'unknown';

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPServer {
  name: string;
  enabled: boolean;
  category: MCPServerCategory;
  config: MCPServerConfig;
  toolCount?: number;
  description?: string;
  estimatedTokens?: number;
}

export interface MCPServerWithStatus extends MCPServer {
  status: MCPServerStatus;
  lastCheck?: number;
  responseTime?: number;
  errorMessage?: string;
  version?: string;
  capabilities?: string[];
}

// ============================================================================
// Config File Types (for .claude.json)
// ============================================================================

export interface ClaudeConfigMCPServers {
  [serverName: string]: MCPServerConfig;
}

export interface ClaudeConfig {
  mcpServers?: ClaudeConfigMCPServers;
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  settings?: Record<string, unknown>;
}

// ============================================================================
// Token Analysis Types
// ============================================================================

export interface TokenEstimate {
  serverName: string;
  baseTokens: number;
  toolTokens: number;
  totalTokens: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface TokenUsage {
  totalEstimated: number;
  byServer: TokenEstimate[];
  byCategory: Record<MCPServerCategory, number>;
  contextWindowSize: number;
  usagePercentage: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface OptimizationSuggestion {
  id: string;
  type: 'disable' | 'enable' | 'replace' | 'configure';
  serverName: string;
  reason: string;
  impact: {
    tokensSaved: number;
    percentageSaved: number;
  };
  priority: 'high' | 'medium' | 'low';
  autoApplicable: boolean;
}

// ============================================================================
// Profile Types
// ============================================================================

export interface MCPProfile {
  id: string;
  name: string;
  description?: string;
  servers: Record<string, boolean>; // serverName -> enabled
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  tags?: string[];
}

export interface MCPProfilesFile {
  version: string;
  profiles: MCPProfile[];
  activeProfileId?: string;
}

// ============================================================================
// Backup Types
// ============================================================================

export interface MCPBackup {
  id: string;
  timestamp: string;
  configSnapshot: ClaudeConfig;
  reason: string;
  autoCreated: boolean;
}

export interface MCPBackupsFile {
  version: string;
  backups: MCPBackup[];
  maxBackups: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface MCPListResponse {
  servers: MCPServerWithStatus[];
  totalCount: number;
  enabledCount: number;
}

export interface MCPToggleRequest {
  serverName: string;
  enabled: boolean;
}

export interface MCPToggleResponse {
  success: boolean;
  server: MCPServerWithStatus;
  backupId?: string;
}

export interface MCPAnalyzeResponse {
  usage: TokenUsage;
  suggestions: OptimizationSuggestion[];
  analysisTimestamp: string;
}

export interface MCPProfileListResponse {
  profiles: MCPProfile[];
  activeProfileId?: string;
}

export interface MCPProfileApplyRequest {
  profileId: string;
}

export interface MCPProfileApplyResponse {
  success: boolean;
  appliedProfile: MCPProfile;
  changedServers: string[];
  backupId: string;
}

export interface MCPProfileCreateRequest {
  name: string;
  description?: string;
  servers?: Record<string, boolean>;
  tags?: string[];
}

export interface MCPOptimizeRequest {
  taskContext?: string;
  maxTokens?: number;
  preserveServers?: string[];
}

export interface MCPOptimizeResponse {
  suggestions: OptimizationSuggestion[];
  currentUsage: TokenUsage;
  projectedUsage: TokenUsage;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export type MCPWebSocketEventType =
  | 'mcp:list'
  | 'mcp:list:success'
  | 'mcp:list:error'
  | 'mcp:toggle'
  | 'mcp:toggle:success'
  | 'mcp:toggle:error'
  | 'mcp:analyze'
  | 'mcp:analyze:success'
  | 'mcp:analyze:error'
  | 'mcp:profile:list'
  | 'mcp:profile:list:success'
  | 'mcp:profile:apply'
  | 'mcp:profile:apply:success'
  | 'mcp:profile:create'
  | 'mcp:profile:create:success'
  | 'mcp:profile:delete'
  | 'mcp:profile:delete:success'
  | 'mcp:optimize'
  | 'mcp:optimize:success'
  | 'mcp:status:update';

export interface MCPWebSocketMessage<T = unknown> {
  type: MCPWebSocketEventType;
  payload: T;
  timestamp?: string;
  requestId?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export type MCPFilterTab = 'all' | 'enabled' | 'disabled';

export interface MCPManagerState {
  servers: MCPServerWithStatus[];
  profiles: MCPProfile[];
  activeProfileId?: string;
  usage: TokenUsage | null;
  suggestions: OptimizationSuggestion[];
  isLoading: boolean;
  error: string | null;
  filterTab: MCPFilterTab;
  searchQuery: string;
  selectedServers: Set<string>;
  isOverlayOpen: boolean;
  isOptimizing: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const TOKEN_ESTIMATES: Record<MCPServerCategory, { base: number; perTool: number }> = {
  filesystem: { base: 2000, perTool: 500 },
  code: { base: 3000, perTool: 800 },
  web: { base: 4000, perTool: 1000 },
  ai: { base: 5000, perTool: 1200 },
  database: { base: 3500, perTool: 700 },
  custom: { base: 2500, perTool: 600 },
};

export const DEFAULT_CONTEXT_WINDOW = 200000; // Claude's context window
export const USAGE_WARNING_THRESHOLD = 0.7; // 70%
export const USAGE_CRITICAL_THRESHOLD = 0.9; // 90%

export const KNOWN_MCP_SERVERS: Record<string, { category: MCPServerCategory; description: string; defaultToolCount: number }> = {
  'filesystem': {
    category: 'filesystem',
    description: 'File system operations (read, write, search)',
    defaultToolCount: 12,
  },
  'git': {
    category: 'code',
    description: 'Git version control operations',
    defaultToolCount: 15,
  },
  'browser-use': {
    category: 'web',
    description: 'Browser automation and web interactions',
    defaultToolCount: 20,
  },
  'firecrawl': {
    category: 'web',
    description: 'Web scraping and content extraction',
    defaultToolCount: 8,
  },
  'coder1-intelligence': {
    category: 'ai',
    description: 'Coder1 repository analysis and intelligence',
    defaultToolCount: 10,
  },
  'sequential-thinking': {
    category: 'ai',
    description: 'Step-by-step reasoning and problem solving',
    defaultToolCount: 1,
  },
  'context7-mcp': {
    category: 'code',
    description: 'Library documentation and code examples',
    defaultToolCount: 2,
  },
  'playwright': {
    category: 'web',
    description: 'Browser testing and automation',
    defaultToolCount: 25,
  },
  'reddit': {
    category: 'web',
    description: 'Reddit content fetching',
    defaultToolCount: 2,
  },
};
