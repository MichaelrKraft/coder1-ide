/**
 * Model Selector Service
 *
 * Selects the appropriate AI model based on task complexity.
 * Supports Claude models as primary with Gemini fallbacks.
 *
 * Complexity levels:
 * - simple: Quick tasks, basic queries → Claude Haiku
 * - standard: Regular development tasks → Claude Sonnet
 * - complex: Deep analysis, large refactors → Claude Max (higher limits)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Task complexity levels for model selection
 */
export type TaskComplexity = 'simple' | 'standard' | 'complex';

/**
 * Configuration for a selected AI model
 */
export interface ModelConfig {
  /** Primary model identifier */
  model: string;
  /** Fallback model if primary fails */
  fallback: string;
  /** Maximum tokens for the response */
  maxTokens: number;
  /** Human-readable model tier name */
  tier: string;
}

/**
 * Model definition with metadata
 */
interface ModelDefinition {
  id: string;
  name: string;
  maxTokens: number;
  tier: 'haiku' | 'sonnet' | 'max';
}

// ============================================================================
// Model Definitions
// ============================================================================

const CLAUDE_MODELS: Record<TaskComplexity, ModelDefinition> = {
  simple: {
    id: 'claude-haiku-3-5-20241022',
    name: 'Claude Haiku',
    maxTokens: 4096,
    tier: 'haiku',
  },
  standard: {
    id: 'claude-sonnet-4-6-20250514',
    name: 'Claude Sonnet',
    maxTokens: 8192,
    tier: 'sonnet',
  },
  complex: {
    id: 'claude-sonnet-4-6-20250514',
    name: 'Claude Max',
    maxTokens: 16384,
    tier: 'max',
  },
};

const GEMINI_FALLBACKS: Record<TaskComplexity, ModelDefinition> = {
  simple: {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini Flash',
    maxTokens: 4096,
    tier: 'haiku',
  },
  standard: {
    id: 'gemini-2.5-flash',
    name: 'Gemini Pro',
    maxTokens: 8192,
    tier: 'sonnet',
  },
  complex: {
    id: 'gemini-2.5-flash',
    name: 'Gemini Pro',
    maxTokens: 16384,
    tier: 'max',
  },
};

// ============================================================================
// Model Selector Class
// ============================================================================

/**
 * Selects AI models based on task complexity.
 *
 * @example
 * ```typescript
 * const selector = new ModelSelector();
 * const config = selector.select('standard');
 * console.log(config.model); // 'claude-sonnet-4-6-20250514'
 * ```
 */
export class ModelSelector {
  /**
   * Select the appropriate model configuration for a given complexity level.
   *
   * @param complexity - The task complexity level
   * @returns Model configuration with primary, fallback, and token limits
   */
  select(complexity: TaskComplexity): ModelConfig {
    const primary = CLAUDE_MODELS[complexity];
    const fallback = GEMINI_FALLBACKS[complexity];

    return {
      model: primary.id,
      fallback: fallback.id,
      maxTokens: primary.maxTokens,
      tier: primary.name,
    };
  }

  /**
   * Get all available model configurations.
   *
   * @returns Map of complexity levels to their model configs
   */
  getAllConfigs(): Record<TaskComplexity, ModelConfig> {
    return {
      simple: this.select('simple'),
      standard: this.select('standard'),
      complex: this.select('complex'),
    };
  }

  /**
   * Get the recommended complexity for a task description.
   * Uses simple heuristics based on task characteristics.
   *
   * @param taskDescription - Description of the task
   * @returns Recommended complexity level
   */
  recommendComplexity(taskDescription: string): TaskComplexity {
    const lower = taskDescription.toLowerCase();

    // Complex indicators
    const complexPatterns = [
      'refactor',
      'redesign',
      'architecture',
      'migrate',
      'security audit',
      'performance optimization',
      'entire codebase',
      'full implementation',
    ];

    // Simple indicators
    const simplePatterns = [
      'fix typo',
      'rename',
      'update comment',
      'add log',
      'quick',
      'simple',
      'minor',
      'small',
    ];

    if (complexPatterns.some((p) => lower.includes(p))) {
      return 'complex';
    }

    if (simplePatterns.some((p) => lower.includes(p))) {
      return 'simple';
    }

    return 'standard';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default model selector instance
 */
export const modelSelector = new ModelSelector();
