/**
 * Type definitions for Claude Config feature
 * Phase 1 - Core types for templates, configs, and AI generation
 */

export type ConfigType = 'agent' | 'hook' | 'skill' | 'command' | 'mcp' | 'template';
export type ConfigLocation = 'local' | 'global';
export type ConfigCategory = 
  | 'Development' 
  | 'Quality Assurance' 
  | 'Documentation' 
  | 'Git Workflow' 
  | 'Error Handling' 
  | 'File Management' 
  | 'Code Quality' 
  | 'Version Control' 
  | 'Problem Solving' 
  | 'Utilities' 
  | 'Learning';

export interface ClaudeConfig {
  id: string;
  type: ConfigType;
  name: string;
  description: string;
  content: string;
  location: ConfigLocation;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ConfigMetadata;
}

export interface ConfigMetadata {
  permissions?: Permission[];
  estimatedCost?: number;
  category?: ConfigCategory;
  tags?: string[];
  icon?: string;
  capabilities?: string[];
}

export type Permission = 'read' | 'write' | 'execute' | 'network' | 'filesystem';

export interface ConfigTemplate {
  id: string;
  type: ConfigType;
  category: ConfigCategory;
  name: string;
  description: string;
  file: string;
  tags: string[];
  estimatedCost: number;
  permissions: Permission[];
  capabilities: string[];
  icon: string;
}

export interface TemplatesData {
  version: string;
  templates: ConfigTemplate[];
  categories: TemplateCategory[];
  metadata: {
    totalTemplates: number;
    lastUpdated: string;
    version: string;
    author: string;
    license: string;
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface ConfigPreview {
  template: ConfigTemplate;
  content: string;
  capabilities: string[];
  permissions: Permission[];
  estimatedCost: number;
  installLocation: ConfigLocation;
}

export interface GenerationContext {
  type: ConfigType;
  userPrompt: string;
  projectContext?: {
    framework?: string;
    language?: string;
    existingConfigs?: string[];
  };
  preferences?: {
    verbosity?: 'concise' | 'detailed';
    includeExamples?: boolean;
  };
}

export interface GeneratedConfig {
  name: string;
  description: string;
  content: string;
  type: ConfigType;
  metadata: {
    generatedAt: Date;
    prompt: string;
    model: string;
    estimatedCost: number;
    capabilities?: string[];
    permissions?: Permission[];
  };
}

export interface AIGenerationRequest {
  prompt: string;
  context: GenerationContext;
}

export interface AIGenerationResponse {
  success: boolean;
  config?: GeneratedConfig;
  error?: string;
  costEstimate?: number;
}

export interface ConfigInstallRequest {
  configId?: string;
  content: string;
  name: string;
  type: ConfigType;
  location: ConfigLocation;
}

export interface ConfigInstallResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ConfigListResponse {
  configs: ClaudeConfig[];
  byType: Record<ConfigType, ClaudeConfig[]>;
  byLocation: Record<ConfigLocation, ClaudeConfig[]>;
  total: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface ConfigParseResult {
  name: string;
  description: string;
  content: string;
  metadata?: {
    type?: ConfigType;
    permissions?: string[];
    tags?: string[];
  };
}

export interface TemplateLoadResult {
  template: ConfigTemplate;
  content: string;
}

export interface FileOperation {
  operation: 'create' | 'read' | 'update' | 'delete';
  path: string;
  content?: string;
  backup?: boolean;
}

export interface FileOperationResult {
  success: boolean;
  path?: string;
  error?: string;
  backupPath?: string;
}

export interface ClaudeDirectory {
  local: string;
  global: string;
  exists: {
    local: boolean;
    global: boolean;
  };
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: string;
}

export interface PermissionAnalysis {
  permissions: Permission[];
  risks: {
    level: 'low' | 'medium' | 'high';
    description: string;
  }[];
  recommendations: string[];
}

// Zustand Store Types

export interface ClaudeConfigState {
  templates: ConfigTemplate[];
  userConfigs: ClaudeConfig[];
  selectedTemplate: ConfigTemplate | null;
  previewConfig: ConfigPreview | null;
  isModalOpen: boolean;
  isGenerating: boolean;
  activeTab: 'templates' | 'my-configs';
  selectedCategory: string | null;
  searchQuery: string;
  
  // Actions
  setTemplates: (templates: ConfigTemplate[]) => void;
  setUserConfigs: (configs: ClaudeConfig[]) => void;
  setSelectedTemplate: (template: ConfigTemplate | null) => void;
  setPreviewConfig: (preview: ConfigPreview | null) => void;
  openModal: () => void;
  closeModal: () => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setActiveTab: (tab: 'templates' | 'my-configs') => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Async actions
  loadTemplates: () => Promise<void>;
  loadUserConfigs: () => Promise<void>;
  generateConfig: (prompt: string, context?: Partial<GenerationContext>) => Promise<void>;
  installConfig: (request: ConfigInstallRequest) => Promise<boolean>;
  deleteConfig: (configId: string) => Promise<boolean>;
  previewTemplate: (templateId: string) => Promise<void>;
}

// API Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TemplatesApiResponse extends ApiResponse {
  data: {
    templates: ConfigTemplate[];
    categories: TemplateCategory[];
  };
}

export interface ConfigsApiResponse extends ApiResponse {
  data: {
    configs: ClaudeConfig[];
    byType: Record<ConfigType, ClaudeConfig[]>;
    byLocation: Record<ConfigLocation, ClaudeConfig[]>;
  };
}

export interface PreviewApiResponse extends ApiResponse {
  data: {
    template: ConfigTemplate;
    content: string;
  };
}

// Component Props Types

export interface ClaudeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TemplateCardProps {
  template: ConfigTemplate;
  onSelect: (template: ConfigTemplate) => void;
  onPreview: (template: ConfigTemplate) => void;
}

export interface ConfigCardProps {
  config: ClaudeConfig;
  onDelete: (configId: string) => void;
  onEdit?: (configId: string) => void;
}

export interface CategoryPillsProps {
  categories: TemplateCategory[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export interface NaturalLanguageBarProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export interface ConfigPreviewModalProps {
  preview: ConfigPreview | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (location: ConfigLocation) => void;
}

export interface CapabilitiesListProps {
  capabilities: string[];
}

export interface PermissionsViewProps {
  permissions: Permission[];
  analysis?: PermissionAnalysis;
}

export interface CostEstimateProps {
  estimate: number;
  model?: string;
}

// Utility Types

export type FilterFunction<T> = (item: T) => boolean;
export type SortFunction<T> = (a: T, b: T) => number;

export interface FilterOptions {
  type?: ConfigType[];
  category?: ConfigCategory[];
  tags?: string[];
  location?: ConfigLocation[];
  search?: string;
}

export interface SortOptions {
  field: 'name' | 'createdAt' | 'updatedAt' | 'type' | 'cost';
  direction: 'asc' | 'desc';
}

// Constants as types

export const CONFIG_TYPES: readonly ConfigType[] = ['agent', 'hook', 'skill', 'command', 'mcp', 'template'];
export const CONFIG_LOCATIONS: readonly ConfigLocation[] = ['local', 'global'];
export const PERMISSIONS: readonly Permission[] = ['read', 'write', 'execute', 'network', 'filesystem'];

// Helper type guards

export function isAgent(config: ClaudeConfig): config is ClaudeConfig & { type: 'agent' } {
  return config.type === 'agent';
}

export function isHook(config: ClaudeConfig): config is ClaudeConfig & { type: 'hook' } {
  return config.type === 'hook';
}

export function isSkill(config: ClaudeConfig): config is ClaudeConfig & { type: 'skill' } {
  return config.type === 'skill';
}

export function isCommand(config: ClaudeConfig): config is ClaudeConfig & { type: 'command' } {
  return config.type === 'command';
}

export function isMcp(config: ClaudeConfig): config is ClaudeConfig & { type: 'mcp' } {
  return config.type === 'mcp';
}

export function isTemplate(config: ClaudeConfig): config is ClaudeConfig & { type: 'template' } {
  return config.type === 'template';
}

// Validation schemas (for runtime validation)

export interface ValidationSchema {
  name: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  description: {
    minLength: number;
    maxLength: number;
  };
  content: {
    minLength: number;
    maxLength: number;
  };
}

export const VALIDATION_RULES: ValidationSchema = {
  name: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9-_ ]+$/
  },
  description: {
    minLength: 10,
    maxLength: 200
  },
  content: {
    minLength: 50,
    maxLength: 50000
  }
};

// Error types

export class ConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends ConfigError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class FileOperationError extends ConfigError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_OPERATION_ERROR', details);
    this.name = 'FileOperationError';
  }
}

export class AIGenerationError extends ConfigError {
  constructor(message: string, details?: any) {
    super(message, 'AI_GENERATION_ERROR', details);
    this.name = 'AIGenerationError';
  }
}

// Export all types as a namespace for organized imports
export namespace ClaudeConfigTypes {
  export type Config = ClaudeConfig;
  export type Template = ConfigTemplate;
  export type Preview = ConfigPreview;
  export type Generated = GeneratedConfig;
  export type State = ClaudeConfigState;
}
