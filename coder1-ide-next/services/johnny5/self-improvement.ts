/**
 * Johnny5 Self-Improvement Service
 *
 * Analyzes conversations to detect patterns and suggest new skills.
 * This is the learning engine that makes Johnny5 smarter over time.
 *
 * Features:
 * - Conversation analysis for repeated patterns
 * - Workflow detection (e.g., "always create tests after code")
 * - Skill suggestion based on user behavior
 * - Learning from successful task completions
 */

import type { Johnny5Skill, Johnny5LearnedPattern } from '@/types/johnny5';

// ================================================================================
// Types
// ================================================================================

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: {
    name: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
  }[];
}

export interface PatternMatch {
  pattern: string;
  confidence: number;
  examples: string[];
  suggestedSkill?: Partial<Johnny5Skill>;
}

export interface ConversationAnalysis {
  patterns: PatternMatch[];
  suggestedSkills: Partial<Johnny5Skill>[];
  insights: string[];
  learnedPreferences: Record<string, unknown>;
}

// ================================================================================
// Pattern Detection
// ================================================================================

/**
 * Common workflow patterns to detect
 */
const WORKFLOW_PATTERNS = [
  {
    id: 'test_after_code',
    name: 'Test After Code',
    triggers: ['write test', 'add test', 'create test'],
    context: ['implement', 'create', 'build', 'add feature'],
    description: 'User typically requests tests after implementing features',
    skillSuggestion: {
      name: 'Auto Test Generator',
      description: 'Automatically generate tests after implementing new features',
      trigger: 'event' as const,
      category: 'development' as const,
    },
  },
  {
    id: 'commit_with_message',
    name: 'Commit Pattern',
    triggers: ['commit', 'push', 'git commit'],
    context: ['after changes', 'when done', 'finished'],
    description: 'User prefers specific commit message formats',
    skillSuggestion: {
      name: 'Smart Commit Messages',
      description: 'Generate meaningful commit messages based on changes',
      trigger: 'event' as const,
      category: 'development' as const,
    },
  },
  {
    id: 'research_before_build',
    name: 'Research First',
    triggers: ['research', 'look up', 'find out', 'how does', 'best practice'],
    context: ['before', 'first', 'then'],
    description: 'User prefers researching before implementing',
    skillSuggestion: {
      name: 'Pre-Build Research',
      description: 'Automatically research best practices before implementing new features',
      trigger: 'manual' as const,
      category: 'research' as const,
    },
  },
  {
    id: 'content_repurpose',
    name: 'Content Repurposing',
    triggers: ['repurpose', 'convert', 'transform', 'turn into', 'make a'],
    context: ['youtube', 'video', 'blog', 'newsletter', 'tweet', 'thread'],
    description: 'User frequently repurposes content across platforms',
    skillSuggestion: {
      name: 'Content Repurposer',
      description: 'Transform content from one format to another (video to blog, blog to thread, etc.)',
      trigger: 'manual' as const,
      category: 'productivity' as const,
    },
  },
  {
    id: 'daily_standup',
    name: 'Daily Summary',
    triggers: ['standup', 'what did', 'summary', 'recap', 'progress'],
    context: ['yesterday', 'today', 'this week'],
    description: 'User regularly requests progress summaries',
    skillSuggestion: {
      name: 'Daily Progress Report',
      description: 'Generate daily standup-style progress reports',
      trigger: 'scheduled' as const,
      category: 'productivity' as const,
    },
  },
  {
    id: 'competitor_tracking',
    name: 'Competitor Monitoring',
    triggers: ['competitor', 'what is', 'launched', 'released', 'announced'],
    context: ['company', 'startup', 'product'],
    description: 'User monitors competitor activity',
    skillSuggestion: {
      name: 'Competitor Tracker',
      description: 'Monitor and alert on competitor product updates and announcements',
      trigger: 'scheduled' as const,
      category: 'monitoring' as const,
    },
  },
];

// ================================================================================
// Self-Improvement Service
// ================================================================================

class SelfImprovementService {
  private conversationHistory: ConversationTurn[] = [];
  private learnedPatterns: Johnny5LearnedPattern[] = [];
  private userPreferences: Record<string, unknown> = {};

  /**
   * Add a conversation turn for analysis
   */
  addConversationTurn(turn: ConversationTurn): void {
    this.conversationHistory.push(turn);
    // Keep last 1000 turns
    if (this.conversationHistory.length > 1000) {
      this.conversationHistory = this.conversationHistory.slice(-1000);
    }
  }

  /**
   * Analyze recent conversations for patterns
   */
  analyzeConversations(windowSize: number = 50): ConversationAnalysis {
    const recentTurns = this.conversationHistory.slice(-windowSize);
    const patterns: PatternMatch[] = [];
    const suggestedSkills: Partial<Johnny5Skill>[] = [];
    const insights: string[] = [];

    // Detect workflow patterns
    for (const workflowPattern of WORKFLOW_PATTERNS) {
      const match = this.detectWorkflowPattern(recentTurns, workflowPattern);
      if (match && match.confidence > 0.6) {
        patterns.push(match);
        if (match.suggestedSkill) {
          suggestedSkills.push(match.suggestedSkill);
        }
      }
    }

    // Detect repeated phrases/commands
    const repeatedCommands = this.detectRepeatedCommands(recentTurns);
    for (const cmd of repeatedCommands) {
      if (cmd.count >= 3) {
        insights.push(`You frequently use: "${cmd.command}" (${cmd.count} times)`);
        patterns.push({
          pattern: `Repeated command: ${cmd.command}`,
          confidence: Math.min(cmd.count / 10, 1),
          examples: cmd.examples,
        });
      }
    }

    // Detect time-based patterns
    const timePatterns = this.detectTimePatterns(recentTurns);
    insights.push(...timePatterns);

    return {
      patterns,
      suggestedSkills,
      insights,
      learnedPreferences: this.userPreferences,
    };
  }

  /**
   * Detect a specific workflow pattern in conversations
   */
  private detectWorkflowPattern(
    turns: ConversationTurn[],
    pattern: typeof WORKFLOW_PATTERNS[0]
  ): PatternMatch | null {
    const userTurns = turns.filter(t => t.role === 'user');
    let triggerMatches = 0;
    let contextMatches = 0;
    const examples: string[] = [];

    for (const turn of userTurns) {
      const content = turn.content.toLowerCase();

      // Check triggers
      const hasTrigger = pattern.triggers.some(t => content.includes(t.toLowerCase()));
      if (hasTrigger) {
        triggerMatches++;
        examples.push(turn.content.slice(0, 100));
      }

      // Check context
      const hasContext = pattern.context.some(c => content.includes(c.toLowerCase()));
      if (hasContext) {
        contextMatches++;
      }
    }

    if (triggerMatches < 2) return null;

    const confidence = Math.min((triggerMatches / 5) * (1 + contextMatches / 10), 1);

    return {
      pattern: pattern.name,
      confidence,
      examples: examples.slice(0, 3),
      suggestedSkill: {
        ...pattern.skillSuggestion,
        createdBy: 'self_improvement',
        createdAt: new Date(),
        usageCount: 0,
        successRate: 0,
        enabled: false,
        dependencies: [],
      },
    };
  }

  /**
   * Detect repeated commands/phrases
   */
  private detectRepeatedCommands(turns: ConversationTurn[]): {
    command: string;
    count: number;
    examples: string[];
  }[] {
    const commandCounts = new Map<string, { count: number; examples: string[] }>();
    const userTurns = turns.filter(t => t.role === 'user');

    for (const turn of userTurns) {
      // Extract first sentence/command
      const firstSentence = turn.content.split(/[.!?\n]/)[0].trim();
      if (firstSentence.length < 5 || firstSentence.length > 100) continue;

      const normalized = firstSentence.toLowerCase();

      const existing = commandCounts.get(normalized);
      if (existing) {
        existing.count++;
        if (existing.examples.length < 3) {
          existing.examples.push(turn.content.slice(0, 100));
        }
      } else {
        commandCounts.set(normalized, {
          count: 1,
          examples: [turn.content.slice(0, 100)],
        });
      }
    }

    return Array.from(commandCounts.entries())
      .filter(([_, v]) => v.count >= 3)
      .map(([command, v]) => ({
        command,
        count: v.count,
        examples: v.examples,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Detect time-based patterns in conversations
   */
  private detectTimePatterns(turns: ConversationTurn[]): string[] {
    const insights: string[] = [];
    const hourCounts = new Map<number, number>();

    for (const turn of turns) {
      const hour = new Date(turn.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    // Find peak hours
    const sortedHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sortedHours.length > 0) {
      const peakHour = sortedHours[0][0];
      const period = peakHour < 12 ? 'morning' : peakHour < 17 ? 'afternoon' : 'evening';
      insights.push(`You're most active in the ${period} (around ${peakHour}:00)`);
    }

    return insights;
  }

  /**
   * Learn from a successful task completion
   */
  learnFromSuccess(taskType: string, approach: string, duration: number): void {
    const patternId = `${taskType}_${approach}`.replace(/[^a-z0-9_]/gi, '_');

    const existing = this.learnedPatterns.find(p => p.id === patternId);
    if (existing) {
      existing.confidence = Math.min(existing.confidence + 0.1, 1);
      existing.lastSeen = new Date();
    } else {
      this.learnedPatterns.push({
        id: patternId,
        pattern: `${taskType} using ${approach}`,
        examples: [],
        confidence: 0.5,
        lastSeen: new Date(),
      });
    }
  }

  /**
   * Get suggested skills based on learned patterns
   */
  getSuggestedSkills(): Partial<Johnny5Skill>[] {
    const analysis = this.analyzeConversations();
    return analysis.suggestedSkills;
  }

  /**
   * Get all learned patterns
   */
  getLearnedPatterns(): Johnny5LearnedPattern[] {
    return [...this.learnedPatterns];
  }

  /**
   * Update user preference
   */
  setPreference(key: string, value: unknown): void {
    this.userPreferences[key] = value;
  }

  /**
   * Get user preferences
   */
  getPreferences(): Record<string, unknown> {
    return { ...this.userPreferences };
  }

  /**
   * Clear all learned data
   */
  reset(): void {
    this.conversationHistory = [];
    this.learnedPatterns = [];
    this.userPreferences = {};
  }
}

// Singleton instance
export const selfImprovementService = new SelfImprovementService();

export default selfImprovementService;
