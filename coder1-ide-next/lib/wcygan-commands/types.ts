/**
 * TypeScript definitions for wcygan commands integration
 */

export interface WcyganCommand {
  id: string;
  name: string;           // e.g. "debug", "explain"
  slashCommand: string;   // e.g. "/debug", "/explain" 
  category: CommandCategory;
  description: string;
  template: string;       // Full markdown template content
  parameters: CommandParameter[];
  usage: string;          // Usage example
  tags: string[];         // Search tags
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: string;  // e.g. "5-10 minutes"
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'directory';
  required: boolean;
  description: string;
  default?: string;
  placeholder?: string;
}

export type CommandCategory = 
  | 'debugging'
  | 'documentation'
  | 'planning'
  | 'quality'
  | 'refactoring'
  | 'testing'
  | 'optimization'
  | 'security'
  | 'deployment'
  | 'architecture'
  | 'database'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'general';

export interface CommandLibrary {
  version: string;
  lastUpdated: string;
  commands: WcyganCommand[];
  categories: CategoryInfo[];
  stats: LibraryStats;
}

export interface CategoryInfo {
  id: CommandCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  commandCount: number;
}

export interface LibraryStats {
  totalCommands: number;
  categoriesCount: number;
  lastFetched: string;
  source: 'github' | 'cache' | 'local';
}

export interface CommandExecutionMode {
  type: 'template' | 'agent' | 'hybrid';
  agentName?: string;
  templateSubstitution?: Record<string, string>;
}

export interface CommandSuggestion {
  command: WcyganCommand;
  relevanceScore: number;
  reason: string;
  context: {
    fileType?: string;
    terminalOutput?: string;
    recentCommands?: string[];
    errorDetected?: boolean;
  };
}

export interface CommandExecutionResult {
  success: boolean;
  mode: CommandExecutionMode['type'];
  output?: string;
  error?: string;
  executionTime?: number;
  agentUsed?: string;
  templateProcessed?: boolean;
}

// Context detection patterns
export interface ContextPattern {
  pattern: RegExp;
  category: CommandCategory;
  suggestedCommands: string[];
  confidence: number;
}

// GitHub API types
export interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
  content?: string;
}

export interface GitHubRepository {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}