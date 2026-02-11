/**
 * Parallel Dispatcher Service
 *
 * Coordinates multiple crew members working simultaneously on tasks.
 * Uses TaskRouter to classify tasks and CrewExecutor to execute them.
 * Emits live feed updates as each crew member completes their work.
 *
 * Events:
 * - 'crew:started' - When a crew member starts working
 * - 'crew:completed' - When a crew member finishes successfully
 * - 'crew:error' - When a crew member encounters an error
 */

import { EventEmitter } from 'events';
import { CrewExecutor, type ExecutionResult, type ExecutionOptions } from './crew-executor';
import { TaskRouter, type TaskClassification } from './task-router';
import { type TaskComplexity } from './model-selector';

// ============================================================================
// Types
// ============================================================================

/**
 * Result from a crew member's execution
 */
export interface CrewResult {
  /** Crew member ID */
  crewMember: string;
  /** Whether the execution succeeded */
  success: boolean;
  /** Response content from the crew member */
  content: string;
  /** Model used for execution */
  modelUsed: string;
  /** Whether fallback model was used */
  usedFallback: boolean;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for dispatching a task
 */
export interface DispatchOptions {
  /** Override the complexity detection */
  complexity?: TaskComplexity;
  /** Additional context for all crew members */
  additionalContext?: string;
  /** Whether to save results to memory (default: true) */
  saveToMemory?: boolean;
  /** Maximum tokens per response */
  maxTokens?: number;
}

/**
 * Event payload for crew:started
 */
export interface CrewStartedEvent {
  crewMember: string;
  task: string;
}

/**
 * Event payload for crew:completed
 */
export interface CrewCompletedEvent {
  crewMember: string;
  result: CrewResult;
}

/**
 * Event payload for crew:error
 */
export interface CrewErrorEvent {
  crewMember: string;
  error: Error;
}

/**
 * Status of a parallel sub-task
 */
export type SubTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * A sub-task assigned to a specific crew member
 */
export interface SubTask {
  /** Unique identifier for this sub-task */
  id: string;
  /** The crew member assigned to this task */
  crewMember: string;
  /** The specialized prompt for this crew member */
  prompt: string;
  /** Current status */
  status: SubTaskStatus;
  /** Result once completed */
  result?: ExecutionResult;
  /** When the sub-task started */
  startedAt?: Date;
  /** When the sub-task completed */
  completedAt?: Date;
}

/**
 * Result of a parallel dispatch
 */
export interface DispatchResult {
  /** Whether all sub-tasks succeeded */
  success: boolean;
  /** All sub-tasks with their results */
  subTasks: SubTask[];
  /** Total execution time in milliseconds */
  totalTimeMs: number;
  /** Number of successful sub-tasks */
  successCount: number;
  /** Number of failed sub-tasks */
  failureCount: number;
  /** Combined output from all crew members */
  combinedOutput: string;
}

// ============================================================================
// Task Specialization Templates
// ============================================================================

/**
 * Templates for specializing tasks based on crew member role
 */
const SPECIALIZATION_TEMPLATES: Record<string, string> = {
  researcher:
    'Focus on gathering data, sources, and factual information. Provide citations and verify claims where possible.',
  writer:
    'Focus on creating clear, engaging, and well-structured content. Adapt tone and style appropriately.',
  analyst:
    'Focus on interpreting data, identifying patterns, and providing actionable insights.',
  strategist:
    'Focus on strategic planning, decision frameworks, and recommendations. Consider trade-offs and risks.',
  brainstormer:
    'Focus on generating diverse, creative ideas and exploring unconventional angles.',
  assistant:
    'Focus on organizing information, creating structure, and ensuring nothing is missed.',
};

// ============================================================================
// Parallel Dispatcher Class
// ============================================================================

/**
 * Coordinates parallel execution of tasks across multiple crew members.
 *
 * @example
 * ```typescript
 * const dispatcher = new ParallelDispatcher(executor, router);
 *
 * // Listen for live updates
 * dispatcher.on('crew:started', ({ crewMember, task }) => {
 *   console.log(`${crewMember} started: ${task}`);
 * });
 *
 * dispatcher.on('crew:completed', ({ crewMember, result }) => {
 *   console.log(`${crewMember} finished: ${result.content.slice(0, 100)}...`);
 * });
 *
 * // Dispatch to single best crew member
 * const result = await dispatcher.dispatch('Write a blog post about AI');
 *
 * // Dispatch to multiple crew members in parallel
 * const results = await dispatcher.dispatchParallel(
 *   'Create a marketing campaign',
 *   ['writer', 'strategist', 'brainstormer']
 * );
 * ```
 */
export class ParallelDispatcher extends EventEmitter {
  private subTaskCounter = 0;

  /**
   * Create a new ParallelDispatcher instance.
   *
   * @param executor - CrewExecutor for running tasks
   * @param router - TaskRouter for classifying tasks
   */
  constructor(
    private executor: CrewExecutor,
    private router: TaskRouter
  ) {
    super();
  }

  /**
   * Dispatch a task to the most appropriate crew member.
   *
   * Uses TaskRouter to classify the task and determine the best crew member,
   * then executes with that crew member.
   *
   * @param task - The task description
   * @param options - Optional dispatch options
   * @returns Result from the crew member
   */
  async dispatch(task: string, options: DispatchOptions = {}): Promise<CrewResult> {
    // 1. Use router to classify task
    const classification = await this.router.classify(task);

    // 2. Emit started event
    this.emit('crew:started', {
      crewMember: classification.crewMember,
      task,
    } as CrewStartedEvent);

    try {
      // 3. Execute with the selected crew member
      const executionOptions: ExecutionOptions = {
        crewMember: classification.crewMember,
        complexity: options.complexity || classification.complexity,
        additionalContext: options.additionalContext,
        saveToMemory: options.saveToMemory,
        maxTokens: options.maxTokens,
      };

      const executionResult = await this.executor.execute(task, executionOptions);

      // 4. Build crew result
      const result: CrewResult = {
        crewMember: classification.crewMember,
        success: executionResult.success,
        content: executionResult.content,
        modelUsed: executionResult.modelUsed,
        usedFallback: executionResult.usedFallback,
        executionTimeMs: executionResult.executionTimeMs,
        error: executionResult.error,
      };

      // 5. Emit completed event
      this.emit('crew:completed', {
        crewMember: classification.crewMember,
        result,
      } as CrewCompletedEvent);

      return result;
    } catch (error) {
      // Emit error event
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('crew:error', {
        crewMember: classification.crewMember,
        error: err,
      } as CrewErrorEvent);

      // Return error result
      return {
        crewMember: classification.crewMember,
        success: false,
        content: '',
        modelUsed: 'none',
        usedFallback: false,
        executionTimeMs: 0,
        error: err.message,
      };
    }
  }

  /**
   * Dispatch a task to multiple crew members in parallel.
   *
   * Creates specialized sub-tasks for each crew member and executes
   * all of them simultaneously using Promise.all. Emits live feed
   * updates as each crew member starts and completes.
   *
   * @param task - The base task description
   * @param crewMembers - Array of crew member IDs to dispatch to
   * @param options - Optional dispatch options
   * @returns Map of crew member ID to their result
   */
  async dispatchParallel(
    task: string,
    crewMembers: string[],
    options: DispatchOptions = {}
  ): Promise<Map<string, CrewResult>> {
    const results = new Map<string, CrewResult>();

    // Validate crew members
    const availableCrew = this.executor.getAvailableCrewMembers();
    const validCrewMembers = crewMembers.filter((id) => availableCrew.includes(id));

    if (validCrewMembers.length === 0) {
      console.warn('No valid crew members provided for parallel dispatch');
      return results;
    }

    // Get base complexity from classification if not provided
    let complexity = options.complexity;
    if (!complexity) {
      const classification = await this.router.classify(task);
      complexity = classification.complexity;
    }

    // Create parallel execution promises
    const executions = validCrewMembers.map(async (crewMember) => {
      // Specialize the task for this crew member
      const specializedTask = this.specializeTask(task, crewMember);

      // Emit started event
      this.emit('crew:started', {
        crewMember,
        task: specializedTask,
      } as CrewStartedEvent);

      try {
        // Execute with this crew member
        const executionOptions: ExecutionOptions = {
          crewMember,
          complexity: complexity!,
          additionalContext: options.additionalContext,
          saveToMemory: options.saveToMemory,
          maxTokens: options.maxTokens,
        };

        const executionResult = await this.executor.execute(specializedTask, executionOptions);

        // Build crew result
        const result: CrewResult = {
          crewMember,
          success: executionResult.success,
          content: executionResult.content,
          modelUsed: executionResult.modelUsed,
          usedFallback: executionResult.usedFallback,
          executionTimeMs: executionResult.executionTimeMs,
          error: executionResult.error,
        };

        // Emit completed event
        this.emit('crew:completed', {
          crewMember,
          result,
        } as CrewCompletedEvent);

        return { crewMember, result };
      } catch (error) {
        // Handle error for this crew member (don't fail others)
        const err = error instanceof Error ? error : new Error(String(error));

        // Emit error event
        this.emit('crew:error', {
          crewMember,
          error: err,
        } as CrewErrorEvent);

        // Return error result
        const result: CrewResult = {
          crewMember,
          success: false,
          content: '',
          modelUsed: 'none',
          usedFallback: false,
          executionTimeMs: 0,
          error: err.message,
        };

        return { crewMember, result };
      }
    });

    // Execute all in parallel
    const allResults = await Promise.all(executions);

    // Collect results into map
    for (const { crewMember, result } of allResults) {
      results.set(crewMember, result);
    }

    return results;
  }

  /**
   * Dispatch a task using automatic parallel detection.
   *
   * Uses the TaskRouter to determine if the task would benefit from
   * multiple crew members working in parallel, then dispatches accordingly.
   *
   * @param task - The task description
   * @param options - Optional dispatch options
   * @returns Single result or map of results depending on routing
   */
  async dispatchAuto(
    task: string,
    options: DispatchOptions = {}
  ): Promise<CrewResult | Map<string, CrewResult>> {
    const classification = await this.router.classify(task);

    // If parallel candidates identified and confidence warrants it
    if (
      classification.parallelCandidates &&
      classification.parallelCandidates.length > 0 &&
      classification.confidence < 0.9
    ) {
      // Include primary and parallel candidates
      const allCrew = [classification.crewMember, ...classification.parallelCandidates];
      return this.dispatchParallel(task, allCrew, {
        ...options,
        complexity: classification.complexity,
      });
    }

    // Single crew member dispatch
    return this.dispatch(task, {
      ...options,
      complexity: classification.complexity,
    });
  }

  /**
   * Full dispatch with structured result (legacy compatibility).
   *
   * @param config - Dispatch configuration
   * @returns Combined results from all crew members
   */
  async dispatchFull(config: {
    task: string;
    crewMembers: string[];
    complexity: TaskComplexity;
    sharedContext?: string;
    maxTokens?: number;
  }): Promise<DispatchResult> {
    const startTime = Date.now();

    // Create sub-tasks for each crew member
    const subTasks = this.createSubTasks(config);

    // Emit initial feed events
    subTasks.forEach((subTask) => {
      this.emit('crew:started', {
        crewMember: subTask.crewMember,
        task: subTask.prompt,
      } as CrewStartedEvent);
    });

    // Execute all sub-tasks in parallel
    const results = await Promise.all(
      subTasks.map((subTask) => this.executeSubTask(subTask, config))
    );

    // Update sub-tasks with results
    results.forEach((result, index) => {
      subTasks[index] = result;
    });

    // Calculate summary stats
    const successCount = subTasks.filter((st) => st.status === 'completed').length;
    const failureCount = subTasks.filter((st) => st.status === 'failed').length;

    // Combine outputs
    const combinedOutput = this.combineOutputs(subTasks);

    return {
      success: failureCount === 0,
      subTasks,
      totalTimeMs: Date.now() - startTime,
      successCount,
      failureCount,
      combinedOutput,
    };
  }

  /**
   * Specialize a task for a specific crew member.
   *
   * Adds crew-specific focus and instructions to the base task,
   * helping each crew member understand their unique contribution.
   *
   * @param task - The base task description
   * @param crewMember - The crew member ID
   * @returns Specialized task description
   */
  private specializeTask(task: string, crewMember: string): string {
    const template = SPECIALIZATION_TEMPLATES[crewMember];

    if (!template) {
      // No specialization template, return task as-is
      return task;
    }

    return `${template}\n\nTask: ${task}`;
  }

  /**
   * Create specialized sub-tasks for each crew member.
   */
  private createSubTasks(config: {
    task: string;
    crewMembers: string[];
  }): SubTask[] {
    return config.crewMembers.map((crewMember) => {
      const id = `subtask-${++this.subTaskCounter}`;
      const prompt = this.createSpecializedPrompt(
        config.task,
        crewMember,
        config.crewMembers
      );

      return {
        id,
        crewMember,
        prompt,
        status: 'pending' as SubTaskStatus,
      };
    });
  }

  /**
   * Create a specialized prompt for a specific crew member.
   */
  private createSpecializedPrompt(
    task: string,
    crewMember: string,
    allMembers: string[]
  ): string {
    const otherMembers = allMembers.filter((m) => m !== crewMember);
    const specialization = SPECIALIZATION_TEMPLATES[crewMember] || '';

    let prompt = specialization ? `${specialization}\n\n` : '';
    prompt += task;

    if (otherMembers.length > 0) {
      prompt += `\n\nNote: Other team members (${otherMembers.join(', ')}) are also working on this task in parallel. Focus on your area of expertise and provide your unique perspective.`;
    }

    return prompt;
  }

  /**
   * Execute a single sub-task.
   */
  private async executeSubTask(
    subTask: SubTask,
    config: {
      complexity: TaskComplexity;
      sharedContext?: string;
      maxTokens?: number;
    }
  ): Promise<SubTask> {
    const updated: SubTask = {
      ...subTask,
      status: 'running',
      startedAt: new Date(),
    };

    try {
      const options: ExecutionOptions = {
        crewMember: subTask.crewMember,
        complexity: config.complexity,
        additionalContext: config.sharedContext,
        maxTokens: config.maxTokens,
      };

      const result = await this.executor.execute(subTask.prompt, options);

      updated.result = result;
      updated.status = result.success ? 'completed' : 'failed';
      updated.completedAt = new Date();

      // Emit completion/error event
      if (result.success) {
        this.emit('crew:completed', {
          crewMember: subTask.crewMember,
          result: {
            crewMember: subTask.crewMember,
            success: result.success,
            content: result.content,
            modelUsed: result.modelUsed,
            usedFallback: result.usedFallback,
            executionTimeMs: result.executionTimeMs,
            error: result.error,
          },
        } as CrewCompletedEvent);
      } else {
        this.emit('crew:error', {
          crewMember: subTask.crewMember,
          error: new Error(result.error || 'Unknown error'),
        } as CrewErrorEvent);
      }
    } catch (error) {
      updated.status = 'failed';
      updated.completedAt = new Date();
      updated.result = {
        success: false,
        content: '',
        modelUsed: 'none',
        usedFallback: false,
        error: (error as Error).message,
        executionTimeMs: Date.now() - (updated.startedAt?.getTime() || Date.now()),
      };

      // Emit error event
      this.emit('crew:error', {
        crewMember: subTask.crewMember,
        error: error as Error,
      } as CrewErrorEvent);
    }

    return updated;
  }

  /**
   * Combine outputs from all successful sub-tasks.
   */
  private combineOutputs(subTasks: SubTask[]): string {
    const parts: string[] = [];

    subTasks
      .filter((st) => st.status === 'completed' && st.result?.content)
      .forEach((st) => {
        parts.push(`## ${st.crewMember.charAt(0).toUpperCase() + st.crewMember.slice(1)}'s Analysis\n`);
        parts.push(st.result!.content);
        parts.push('\n---\n');
      });

    if (parts.length === 0) {
      return 'No successful outputs from crew members.';
    }

    // Remove trailing separator
    parts.pop();

    return parts.join('\n');
  }

  /**
   * Get the list of available crew members.
   *
   * @returns Array of crew member IDs
   */
  getAvailableCrewMembers(): string[] {
    return this.executor.getAvailableCrewMembers();
  }

  /**
   * Get the underlying task router for classification.
   */
  getRouter(): TaskRouter {
    return this.router;
  }

  /**
   * Get the underlying executor.
   */
  getExecutor(): CrewExecutor {
    return this.executor;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a ParallelDispatcher instance with the provided services.
 *
 * @param executor - CrewExecutor instance
 * @param router - TaskRouter instance
 * @returns ParallelDispatcher instance
 */
export function createParallelDispatcher(
  executor: CrewExecutor,
  router: TaskRouter
): ParallelDispatcher {
  return new ParallelDispatcher(executor, router);
}
