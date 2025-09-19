/**
 * Parallel Reasoning Service for Beta IDE
 * 
 * Implements the ParaThinker-inspired parallel reasoning strategy
 * where multiple AI agents tackle the same problem from different angles
 * simultaneously, then use majority voting to select the best solution.
 * 
 * Based on the ParaThinker paper findings:
 * - Multiple independent reasoning paths outperform single deep reasoning
 * - Avoids tunnel vision from suboptimal initial reasoning paths
 * - 14-40% accuracy improvement for complex problems
 */

import { universalAIWrapper } from '@/services/ai-platform/universal-ai-wrapper-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { parallelReasoningManager } from '@/lib/parallel-reasoning-manager';

export interface ReasoningStrategy {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  weight: number; // Voting weight based on strategy effectiveness
}

export interface ReasoningPath {
  id: string;
  strategyId: string;
  strategyName: string;
  status: 'pending' | 'thinking' | 'completed' | 'failed';
  progress: number;
  solution: string | null;
  confidence: number;
  reasoning: string[];
  startTime: Date;
  endTime?: Date;
  tokensUsed?: number;
  error?: string;
}

export interface ParallelReasoningSession {
  id: string;
  problem: string;
  strategies: string[];
  paths: ReasoningPath[];
  status: 'initializing' | 'reasoning' | 'voting' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  finalSolution?: string;
  votingResults?: VotingResult;
  totalTokensUsed: number;
  metadata: {
    triggeredBy: 'manual' | 'auto' | 'escalation';
    previousAttempts?: number;
    complexity?: number;
  };
}

export interface VotingResult {
  winner: string;
  votes: Map<string, number>;
  confidence: number;
  synthesized: boolean;
}

// Reasoning strategies based on the ParaThinker paper and practical experience
export const REASONING_STRATEGIES: ReasoningStrategy[] = [
  {
    id: 'analytical',
    name: 'Analytical Decomposition',
    description: 'Break down the problem into smaller, manageable components',
    prompt: 'Analyze this problem by breaking it down into its smallest components. Identify each part, understand how they interact, and solve them individually before combining the solutions.',
    icon: '🔬',
    weight: 1.2
  },
  {
    id: 'pattern_matching',
    name: 'Pattern Recognition',
    description: 'Find similar problems that have been solved before',
    prompt: 'Search for similar problems in the codebase and documentation. Identify patterns that match this issue and adapt existing solutions to fit the current context.',
    icon: '🎯',
    weight: 1.1
  },
  {
    id: 'first_principles',
    name: 'First Principles',
    description: 'Build the solution from fundamental concepts',
    prompt: 'Start from the most basic truths and build up the solution step by step. Question every assumption and derive the answer from fundamental principles.',
    icon: '🏗️',
    weight: 1.3
  },
  {
    id: 'reverse_engineering',
    name: 'Reverse Engineering',
    description: 'Work backwards from the desired outcome',
    prompt: 'Start with the desired end result and work backwards. What needs to be true for this to work? Trace the requirements back to the current state.',
    icon: '⏮️',
    weight: 1.0
  },
  {
    id: 'lateral_thinking',
    name: 'Lateral Thinking',
    description: 'Explore unconventional and creative approaches',
    prompt: 'Think outside the box. What unconventional approaches could solve this? Consider solutions from other domains and creative workarounds.',
    icon: '💡',
    weight: 0.9
  },
  {
    id: 'domain_expert',
    name: 'Domain Expertise',
    description: 'Apply deep domain-specific knowledge',
    prompt: 'Apply expert knowledge of the specific technology stack and domain. Use best practices, common patterns, and domain-specific optimizations.',
    icon: '🎓',
    weight: 1.2
  },
  {
    id: 'error_analysis',
    name: 'Error Analysis',
    description: 'Focus on what could go wrong and prevent it',
    prompt: 'Identify all possible failure modes and edge cases. Focus on error prevention, handling, and recovery. Build a robust solution that handles all error scenarios.',
    icon: '🚨',
    weight: 1.1
  },
  {
    id: 'performance_first',
    name: 'Performance Optimization',
    description: 'Prioritize efficiency and speed',
    prompt: 'Focus on performance and efficiency. Consider time complexity, space complexity, and resource usage. Optimize for speed and scalability.',
    icon: '⚡',
    weight: 1.0
  },
  {
    id: 'user_centric',
    name: 'User Experience',
    description: 'Consider the end-user perspective',
    prompt: 'Think from the user\'s perspective. What would provide the best user experience? Consider usability, accessibility, and user expectations.',
    icon: '👤',
    weight: 0.9
  },
  {
    id: 'security_focused',
    name: 'Security Analysis',
    description: 'Identify and address security concerns',
    prompt: 'Analyze security implications. Identify potential vulnerabilities, attack vectors, and security best practices. Build a secure solution.',
    icon: '🔒',
    weight: 1.1
  }
];

export class ParallelReasoningOrchestrator {
  constructor() {
    logger?.info('ParallelReasoningOrchestrator initialized');
  }

  /**
   * Start a parallel reasoning session with multiple strategies
   */
  async startReasoning(
    problem: string,
    strategyIds?: string[],
    metadata?: Partial<ParallelReasoningSession['metadata']>
  ): Promise<ParallelReasoningSession> {
    const sessionId = `pr_${uuidv4()}`;
    
    // Select strategies (default to top 4 if not specified)
    const selectedStrategies = strategyIds || 
      ['analytical', 'pattern_matching', 'first_principles', 'domain_expert'];
    
    const strategies = REASONING_STRATEGIES.filter(s => 
      selectedStrategies.includes(s.id)
    );

    // Initialize paths for each strategy
    const paths: ReasoningPath[] = strategies.map(strategy => ({
      id: `path_${uuidv4()}`,
      strategyId: strategy.id,
      strategyName: strategy.name,
      status: 'pending',
      progress: 0,
      solution: null,
      confidence: 0,
      reasoning: [],
      startTime: new Date()
    }));

    // Create session
    const session: ParallelReasoningSession = {
      id: sessionId,
      problem,
      strategies: selectedStrategies,
      paths,
      status: 'initializing',
      startTime: new Date(),
      totalTokensUsed: 0,
      metadata: {
        triggeredBy: metadata?.triggeredBy || 'manual',
        ...metadata
      }
    };

    parallelReasoningManager.addSession(session);

    // Start parallel reasoning
    this.executeParallelReasoning(session);

    return session;
  }

  /**
   * Execute reasoning paths in parallel
   */
  private async executeParallelReasoning(session: ParallelReasoningSession) {
    try {
      session.status = 'reasoning';
      parallelReasoningManager.updateSession(session.id, { status: 'reasoning' });

      // Execute all paths in parallel
      const reasoningPromises = session.paths.map(path => 
        this.executeReasoningPath(session, path)
      );

      // Wait for all paths to complete
      await Promise.allSettled(reasoningPromises);

      // Perform voting
      session.status = 'voting';
      parallelReasoningManager.updateSession(session.id, { status: 'voting' });
      const votingResult = await this.performVoting(session);
      session.votingResults = votingResult;

      // Select final solution
      const winningPath = session.paths.find(p => 
        p.solution === votingResult.winner
      );
      session.finalSolution = winningPath?.solution || 
        this.synthesizeSolutions(session);

      session.status = 'completed';
      session.endTime = new Date();

      // Calculate total tokens
      session.totalTokensUsed = session.paths.reduce((sum, path) => 
        sum + (path.tokensUsed || 0), 0
      );

      // Update the complete session in the manager
      parallelReasoningManager.updateSession(session.id, {
        status: 'completed',
        endTime: session.endTime,
        finalSolution: session.finalSolution,
        votingResults: session.votingResults,
        totalTokensUsed: session.totalTokensUsed,
        paths: session.paths
      });

      logger?.info(`Parallel reasoning completed: ${session.id}`, {
        paths: session.paths.length,
        tokensUsed: session.totalTokensUsed,
        duration: session.endTime.getTime() - session.startTime.getTime()
      });

    } catch (error) {
      logger?.error('Parallel reasoning failed', error);
      session.status = 'failed';
      session.endTime = new Date();
      
      // Update failed status in manager
      parallelReasoningManager.updateSession(session.id, {
        status: 'failed',
        endTime: session.endTime
      });
    }
  }

  /**
   * Execute a single reasoning path
   */
  /**
   * Helper to update session paths in the manager
   */
  private updateSessionPaths(session: ParallelReasoningSession): void {
    parallelReasoningManager.updateSession(session.id, { paths: session.paths });
  }

  private async executeReasoningPath(
    session: ParallelReasoningSession, 
    path: ReasoningPath
  ): Promise<void> {
    try {
      path.status = 'thinking';
      path.progress = 10;
      this.updateSessionPaths(session);

      const strategy = REASONING_STRATEGIES.find(s => s.id === path.strategyId);
      if (!strategy) {
        throw new Error(`Strategy not found: ${path.strategyId}`);
      }

      // Construct the prompt with strategy-specific instructions
      const prompt = `
${strategy.prompt}

Problem to solve:
${session.problem}

Please provide:
1. Your step-by-step reasoning
2. The solution
3. Your confidence level (0-100)
4. Any potential issues or edge cases
`;

      path.progress = 30;
      this.updateSessionPaths(session);

      // Execute through universal AI wrapper
      const controller = new AbortController();
      parallelReasoningManager.registerAbortController(session.id, controller);

      const response = await universalAIWrapper.execute({
        prompt,
        stream: false,
        signal: controller.signal,
        metadata: {
          reasoningSessionId: session.id,
          strategyId: strategy.id,
          pathId: path.id
        }
      });

      path.progress = 80;
      this.updateSessionPaths(session);

      // Parse response
      if (response.response) {
        path.solution = this.extractSolution(response.response);
        path.confidence = this.extractConfidence(response.response);
        path.reasoning = this.extractReasoning(response.response);
        path.tokensUsed = response.tokensUsed || 0;
      }

      path.status = 'completed';
      path.progress = 100;
      path.endTime = new Date();
      this.updateSessionPaths(session);

    } catch (error) {
      logger?.error(`Reasoning path failed: ${path.id}`, error);
      path.status = 'failed';
      path.error = error instanceof Error ? error.message : 'Unknown error';
      path.progress = 0;
      path.endTime = new Date();
      this.updateSessionPaths(session);
    } finally {
      // Controller is registered per session, not per path
    }
  }

  /**
   * Perform majority voting on solutions
   */
  private async performVoting(session: ParallelReasoningSession): Promise<VotingResult> {
    const completedPaths = session.paths.filter(p => 
      p.status === 'completed' && p.solution
    );

    if (completedPaths.length === 0) {
      return {
        winner: '',
        votes: new Map(),
        confidence: 0,
        synthesized: false
      };
    }

    // Count votes with weighted scoring
    const voteMap = new Map<string, number>();
    
    for (const path of completedPaths) {
      if (!path.solution) continue;
      
      const strategy = REASONING_STRATEGIES.find(s => s.id === path.strategyId);
      const weight = strategy?.weight || 1.0;
      const adjustedVote = weight * (path.confidence / 100);
      
      const currentVotes = voteMap.get(path.solution) || 0;
      voteMap.set(path.solution, currentVotes + adjustedVote);
    }

    // Find winner
    let winner = '';
    let maxVotes = 0;
    
    for (const [solution, votes] of voteMap.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = solution;
      }
    }

    // Calculate overall confidence
    const avgConfidence = completedPaths.reduce((sum, p) => 
      sum + p.confidence, 0
    ) / completedPaths.length;

    return {
      winner,
      votes: voteMap,
      confidence: avgConfidence,
      synthesized: false
    };
  }

  /**
   * Synthesize solutions from multiple paths
   */
  private synthesizeSolutions(session: ParallelReasoningSession): string {
    const completedPaths = session.paths.filter(p => 
      p.status === 'completed' && p.solution
    );

    if (completedPaths.length === 0) {
      return 'No solution found';
    }

    // For now, return the highest confidence solution
    // In future, could use AI to synthesize multiple solutions
    const bestPath = completedPaths.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return bestPath.solution || 'No solution found';
  }

  /**
   * Extract solution from AI response
   */
  private extractSolution(response: string): string {
    // Look for solution markers
    const solutionMatch = response.match(/solution[:\s]+(.+?)(?:\n\n|\n(?:confidence|potential issues)|$)/is);
    if (solutionMatch) {
      return solutionMatch[1].trim();
    }
    
    // Fallback: return the entire response
    return response.trim();
  }

  /**
   * Extract confidence from AI response
   */
  private extractConfidence(response: string): number {
    const confidenceMatch = response.match(/confidence[:\s]+(\d+)/i);
    if (confidenceMatch) {
      return Math.min(100, Math.max(0, parseInt(confidenceMatch[1])));
    }
    return 50; // Default confidence
  }

  /**
   * Extract reasoning steps from AI response
   */
  private extractReasoning(response: string): string[] {
    const reasoningSection = response.match(/reasoning[:\s]+(.+?)(?:\n\nsolution|$)/is);
    if (reasoningSection) {
      return reasoningSection[1]
        .split(/\n\d+\.\s+/)
        .filter(step => step.trim())
        .map(step => step.trim());
    }
    
    // Fallback: split by numbered lines
    return response
      .split(/\n\d+\.\s+/)
      .filter(step => step.trim())
      .slice(0, 5); // Limit to first 5 steps
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): ParallelReasoningSession | undefined {
    return parallelReasoningManager.getSession(sessionId);
  }

  /**
   * Cancel a reasoning session
   */
  cancelSession(sessionId: string): boolean {
    const session = parallelReasoningManager.getSession(sessionId);
    if (!session) return false;

    // Abort all active agents
    const controller = parallelReasoningManager.getAbortController(sessionId);
    if (controller) {
      controller.abort();
      // Update all paths to failed status
      session.paths.forEach(path => {
        if (path.status === 'thinking' || path.status === 'pending') {
          path.status = 'failed';
          path.error = 'Cancelled by user';
        }
      });
    }

    session.status = 'failed';
    session.endTime = new Date();
    
    // Update the session in the manager
    parallelReasoningManager.updateSession(sessionId, session);
    
    return true;
  }

  /**
   * Clean up old sessions
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    
    const sessions = parallelReasoningManager.getAllSessions();
    for (const session of sessions) {
      if (session.endTime) {
        const age = now - session.endTime.getTime();
        if (age > maxAge) {
          parallelReasoningManager.deleteSession(session.id);
        }
      }
    }
  }
}

// Export singleton instance
export const parallelReasoning = new ParallelReasoningOrchestrator();