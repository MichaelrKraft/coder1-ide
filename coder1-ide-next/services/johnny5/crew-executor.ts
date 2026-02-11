/**
 * Crew Executor Service
 *
 * Executes crew tasks with smart model selection and memory context.
 * Uses ModelSelector to choose Haiku/Sonnet/Max based on complexity.
 * Loads crew memory context before execution for continuity.
 * Falls back to Gemini if Claude fails.
 *
 * Emits events:
 * - 'crew:completed' - When a task completes successfully
 * - 'crew:error' - When a task fails
 */

import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelSelector, type ModelConfig, type TaskComplexity } from './model-selector';
import { getCrewMemoryStore, type CrewMemory } from './crew-memory';
import crewMembersData from '../../data/crew-members.json';

// ============================================================================
// Types
// ============================================================================

/**
 * Crew member definition from data file
 */
interface CrewMember {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  promptPrefix: string;
  exampleTasks: string[];
}

/**
 * A task to be executed by a crew member (simplified interface)
 */
export interface CrewTask {
  /** Crew member identifier */
  crewMember: string;
  /** The task description */
  task: string;
  /** Task complexity */
  complexity: TaskComplexity;
}

/**
 * Result of a crew task execution (simplified interface)
 */
export interface CrewResult {
  /** Crew member that executed the task */
  crewMember: string;
  /** The original task */
  task: string;
  /** The result or output */
  result: string;
  /** The AI model used */
  modelUsed: string;
  /** When the task was completed */
  timestamp: Date;
  /** Whether the task succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for executing a crew task
 */
export interface ExecutionOptions {
  /** The crew member ID to use */
  crewMember: string;
  /** Task complexity for model selection */
  complexity: TaskComplexity;
  /** Maximum tokens for the response (overrides default) */
  maxTokens?: number;
  /** Additional context to include */
  additionalContext?: string;
  /** Whether to save the result to memory (default: true) */
  saveToMemory?: boolean;
}

/**
 * Result from executing a crew task
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** The response content */
  content: string;
  /** Which model was used */
  modelUsed: string;
  /** Whether fallback model was used */
  usedFallback: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Token usage stats */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================================================
// Crew Member Registry
// ============================================================================

const CREW_MEMBERS: Map<string, CrewMember> = new Map(
  (crewMembersData.crewMembers as CrewMember[]).map((m) => [m.id, m])
);

// ============================================================================
// Crew Executor Class
// ============================================================================

/**
 * Executes tasks using the appropriate crew member persona and AI model.
 *
 * Extends EventEmitter to emit task completion events.
 *
 * @example
 * ```typescript
 * const executor = new CrewExecutor(
 *   process.env.ANTHROPIC_API_KEY!,
 *   process.env.GOOGLE_API_KEY
 * );
 *
 * executor.on('crew:completed', (result) => {
 *   console.log(`${result.crewMember} completed task`);
 * });
 *
 * executor.on('crew:error', (result) => {
 *   console.error(`Task failed: ${result.error}`);
 * });
 *
 * const result = await executor.execute(
 *   'Write a blog post about AI trends',
 *   { crewMember: 'writer', complexity: 'standard' }
 * );
 *
 * console.log(result.content);
 * ```
 */
export class CrewExecutor extends EventEmitter {
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI | null = null;
  private modelSelector: ModelSelector;
  private memoryStore = getCrewMemoryStore();

  /**
   * Create a new CrewExecutor instance.
   *
   * @param anthropicApiKey - Anthropic API key for Claude models
   * @param googleApiKey - Optional Google API key for Gemini fallback
   */
  constructor(
    private anthropicApiKey: string,
    private googleApiKey?: string
  ) {
    super();
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.modelSelector = new ModelSelector();

    if (googleApiKey) {
      this.gemini = new GoogleGenerativeAI(googleApiKey);
    }
  }

  /**
   * Execute a task with the specified crew member and model selection.
   *
   * @param task - The task description or prompt
   * @param options - Execution options including crew member and complexity
   * @returns Execution result with content and metadata
   */
  async execute(task: string, options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Validate crew member
    const crewMember = CREW_MEMBERS.get(options.crewMember);
    if (!crewMember) {
      return {
        success: false,
        content: '',
        modelUsed: 'none',
        usedFallback: false,
        error: `Unknown crew member: ${options.crewMember}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Get model config
    const modelConfig = this.modelSelector.select(options.complexity);

    // Load crew memory context
    let memory: CrewMemory | null = null;
    try {
      memory = await this.memoryStore.getContext(options.crewMember);
    } catch (err) {
      console.warn('Failed to load crew memory:', err);
    }

    // Build the system prompt with persona and context
    const systemPrompt = this.buildSystemPrompt(crewMember, memory, options.additionalContext);

    // Try Claude first
    try {
      const result = await this.executeWithClaude(
        task,
        systemPrompt,
        modelConfig,
        options.maxTokens
      );

      // Save to memory if successful
      if (options.saveToMemory !== false) {
        await this.saveToMemory(options.crewMember, task, result.content, modelConfig.model);
      }

      const executionResult = {
        ...result,
        executionTimeMs: Date.now() - startTime,
      };

      // Emit crew:completed event
      const crewResult: CrewResult = {
        crewMember: options.crewMember,
        task,
        result: result.content,
        modelUsed: modelConfig.model,
        timestamp: new Date(),
        success: true,
      };
      this.emit('crew:completed', crewResult);

      return executionResult;
    } catch (claudeError) {
      console.warn('Claude execution failed:', claudeError);

      // Try Gemini fallback if available
      if (this.gemini) {
        try {
          const result = await this.executeWithGemini(
            task,
            systemPrompt,
            modelConfig
          );

          // Save to memory if successful
          if (options.saveToMemory !== false) {
            await this.saveToMemory(
              options.crewMember,
              task,
              result.content,
              modelConfig.fallback
            );
          }

          const executionResult = {
            ...result,
            usedFallback: true,
            executionTimeMs: Date.now() - startTime,
          };

          // Emit crew:completed event for Gemini fallback success
          const crewResult: CrewResult = {
            crewMember: options.crewMember,
            task,
            result: result.content,
            modelUsed: modelConfig.fallback,
            timestamp: new Date(),
            success: true,
          };
          this.emit('crew:completed', crewResult);

          return executionResult;
        } catch (geminiError) {
          console.error('Gemini fallback failed:', geminiError);
        }
      }

      // Both failed - emit crew:error event
      const errorResult: CrewResult = {
        crewMember: options.crewMember,
        task,
        result: '',
        modelUsed: modelConfig.model,
        timestamp: new Date(),
        success: false,
        error: `Execution failed: ${(claudeError as Error).message}`,
      };
      this.emit('crew:error', errorResult);

      return {
        success: false,
        content: '',
        modelUsed: modelConfig.model,
        usedFallback: false,
        error: `Execution failed: ${(claudeError as Error).message}`,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a task using Claude.
   */
  private async executeWithClaude(
    task: string,
    systemPrompt: string,
    modelConfig: ModelConfig,
    maxTokensOverride?: number
  ): Promise<Omit<ExecutionResult, 'executionTimeMs'>> {
    const response = await this.anthropic.messages.create({
      model: modelConfig.model,
      max_tokens: maxTokensOverride || modelConfig.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: task }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');

    return {
      success: true,
      content,
      modelUsed: modelConfig.model,
      usedFallback: false,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Execute a task using Gemini as fallback.
   */
  private async executeWithGemini(
    task: string,
    systemPrompt: string,
    modelConfig: ModelConfig
  ): Promise<Omit<ExecutionResult, 'executionTimeMs'>> {
    if (!this.gemini) {
      throw new Error('Gemini not configured');
    }

    const model = this.gemini.getGenerativeModel({
      model: modelConfig.fallback,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(task);
    const response = result.response;
    const content = response.text();

    return {
      success: true,
      content,
      modelUsed: modelConfig.fallback,
      usedFallback: true,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }

  /**
   * Build the system prompt with persona and memory context.
   */
  private buildSystemPrompt(
    crewMember: CrewMember,
    memory: CrewMemory | null,
    additionalContext?: string
  ): string {
    const parts: string[] = [];

    // Add crew member persona
    parts.push(crewMember.promptPrefix);

    // Add memory context if available
    if (memory && memory.taskCount > 0) {
      parts.push('\n--- Your History ---');
      parts.push(memory.summary);

      if (memory.recentTasks.length > 0) {
        parts.push('\nRecent tasks you completed:');
        memory.recentTasks.slice(0, 3).forEach((task, i) => {
          const preview =
            task.task.length > 80
              ? task.task.substring(0, 80) + '...'
              : task.task;
          parts.push(`${i + 1}. ${preview}`);
        });
      }
    }

    // Add additional context if provided
    if (additionalContext) {
      parts.push('\n--- Additional Context ---');
      parts.push(additionalContext);
    }

    return parts.join('\n');
  }

  /**
   * Save execution result to crew memory.
   */
  private async saveToMemory(
    crewMember: string,
    task: string,
    result: string,
    modelUsed: string
  ): Promise<void> {
    try {
      await this.memoryStore.saveResult(crewMember, task, result, modelUsed);
    } catch (err) {
      console.warn('Failed to save to crew memory:', err);
    }
  }

  /**
   * Get the list of available crew members.
   *
   * @returns Array of crew member IDs
   */
  getAvailableCrewMembers(): string[] {
    return Array.from(CREW_MEMBERS.keys());
  }

  /**
   * Get details for a specific crew member.
   *
   * @param id - Crew member ID
   * @returns Crew member details or undefined
   */
  getCrewMember(id: string): CrewMember | undefined {
    return CREW_MEMBERS.get(id);
  }

  /**
   * Check if Gemini fallback is available.
   *
   * @returns True if Gemini is configured
   */
  hasFallback(): boolean {
    return this.gemini !== null;
  }

  /**
   * Execute a task using the simplified CrewTask interface.
   *
   * This is an alternative interface that matches the CrewTask/CrewResult types.
   *
   * @param crewTask - The crew task to execute
   * @returns CrewResult with execution details
   */
  async executeTask(crewTask: CrewTask): Promise<CrewResult> {
    const result = await this.execute(crewTask.task, {
      crewMember: crewTask.crewMember,
      complexity: crewTask.complexity,
    });

    return {
      crewMember: crewTask.crewMember,
      task: crewTask.task,
      result: result.content,
      modelUsed: result.modelUsed,
      timestamp: new Date(),
      success: result.success,
      error: result.error,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a CrewExecutor instance with the provided API keys.
 *
 * @param anthropicApiKey - Anthropic API key for Claude
 * @param googleApiKey - Optional Google API key for Gemini fallback
 * @returns CrewExecutor instance
 */
export function createCrewExecutor(
  anthropicApiKey: string,
  googleApiKey?: string
): CrewExecutor {
  return new CrewExecutor(anthropicApiKey, googleApiKey);
}
