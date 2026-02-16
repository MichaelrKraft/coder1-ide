/**
 * Task Router Service
 *
 * Classifies incoming tasks and routes them to the appropriate crew member.
 * Uses Claude Haiku for fast, cost-effective classification.
 *
 * Responsibilities:
 * - Analyze task descriptions to determine the best crew member
 * - Estimate task complexity for model selection
 * - Identify opportunities for parallel crew member work
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TaskComplexity } from './model-selector';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of task classification
 */
export interface TaskClassification {
  /** The crew member ID best suited for this task */
  crewMember: string;
  /** Task complexity level for model selection */
  complexity: TaskComplexity;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Other crew members that could work in parallel */
  parallelCandidates?: string[];
  /** Reasoning for the classification */
  reasoning?: string;
}

/**
 * Crew member definition for routing
 */
interface CrewMemberSpec {
  id: string;
  name: string;
  category: string;
  description: string;
  keywords: string[];
}

// ============================================================================
// Crew Member Specifications
// ============================================================================

/**
 * Crew member routing specifications with keywords for fast matching
 */
const CREW_SPECS: CrewMemberSpec[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    category: 'intelligence',
    description: 'Market research, competitor analysis, trend tracking, audience insights',
    keywords: [
      'research', 'analyze', 'find', 'discover', 'investigate',
      'competitor', 'market', 'trend', 'demographic', 'audience',
      'data', 'statistics', 'survey', 'benchmark', 'compare',
    ],
  },
  {
    id: 'writer',
    name: 'Writer',
    category: 'content',
    description: 'Blog posts, emails, social copy, documentation',
    keywords: [
      'write', 'draft', 'blog', 'post', 'article', 'email',
      'copy', 'content', 'documentation', 'docs', 'readme',
      'newsletter', 'social', 'tweet', 'linkedin', 'message',
    ],
  },
  {
    id: 'analyst',
    name: 'Analyst',
    category: 'insights',
    description: 'Report summaries, metrics interpretation, data insights',
    keywords: [
      'analyze', 'interpret', 'metrics', 'report', 'summary',
      'insight', 'pattern', 'trend', 'conversion', 'funnel',
      'kpi', 'performance', 'dashboard', 'visualization', 'chart',
    ],
  },
  {
    id: 'strategist',
    name: 'Strategist',
    category: 'planning',
    description: 'Campaign outlines, decision frameworks, roadmaps',
    keywords: [
      'strategy', 'plan', 'roadmap', 'campaign', 'framework',
      'decision', 'prioritize', 'launch', 'go-to-market', 'gtm',
      'timeline', 'milestone', 'objective', 'goal', 'okr',
    ],
  },
  {
    id: 'brainstormer',
    name: 'Brainstormer',
    category: 'ideation',
    description: 'Feature ideas, naming, creative concepts, pivots',
    keywords: [
      'brainstorm', 'idea', 'creative', 'name', 'concept',
      'feature', 'innovation', 'pivot', 'alternative', 'option',
      'suggest', 'generate', 'explore', 'what if', 'imagine',
    ],
  },
  {
    id: 'assistant',
    name: 'Assistant',
    category: 'operations',
    description: 'Task organization, meeting prep, document formatting',
    keywords: [
      'organize', 'format', 'meeting', 'agenda', 'checklist',
      'template', 'structure', 'schedule', 'reminder', 'todo',
      'list', 'prep', 'prepare', 'notes', 'action items',
    ],
  },
];

// ============================================================================
// Complexity Patterns
// ============================================================================

const COMPLEXITY_PATTERNS = {
  simple: [
    'quick', 'simple', 'minor', 'small', 'brief',
    'short', 'basic', 'one', 'single', 'just',
  ],
  complex: [
    'comprehensive', 'detailed', 'thorough', 'extensive', 'complete',
    'deep dive', 'full', 'entire', 'all', 'analysis',
    'strategy', 'roadmap', 'campaign', 'architecture',
  ],
};

// ============================================================================
// Task Router Class
// ============================================================================

/**
 * Routes tasks to appropriate crew members using AI classification.
 *
 * @example
 * ```typescript
 * const router = new TaskRouter(process.env.ANTHROPIC_API_KEY!);
 * const result = await router.classify('Write a blog post about AI trends');
 * console.log(result.crewMember); // 'writer'
 * ```
 */
export class TaskRouter {
  private client: Anthropic;

  /** Cached user-defined agent-skills from DB */
  private agentSkillsCache: CrewMemberSpec[] | null = null;
  private agentSkillsCacheTime = 0;
  private static CACHE_TTL = 60_000; // 60 seconds

  /**
   * Create a new TaskRouter instance.
   *
   * @param anthropicApiKey - Anthropic API key for classification calls
   */
  constructor(private anthropicApiKey: string) {
    this.client = new Anthropic({ apiKey: anthropicApiKey });
  }

  /**
   * Load hardcoded crew specs merged with user-defined agent-skills from DB.
   * Results are cached for CACHE_TTL milliseconds to avoid frequent DB reads.
   */
  private async getCrewSpecs(): Promise<CrewMemberSpec[]> {
    const now = Date.now();
    if (this.agentSkillsCache && now - this.agentSkillsCacheTime < TaskRouter.CACHE_TTL) {
      return [...CREW_SPECS, ...this.agentSkillsCache];
    }

    try {
      const { getSkillRecords } = await import('@/lib/johnny5-db');
      const skills = getSkillRecords();
      const agentSkills = skills
        .filter((s) => s.trigger_type === 'agent' && s.enabled)
        .slice(0, 10); // Cap at 10 user-defined agents

      if (agentSkills.length >= 10) {
        console.warn('[TaskRouter] Agent-skill cap reached (10). Some agent-skills will be ignored.');
      }

      // Load routing keywords from metadata.json on disk for each agent-skill
      const { DATA_DIR } = await import('@/lib/data-paths');
      const path = await import('path');
      const fs = await import('fs');

      this.agentSkillsCache = agentSkills.map((skill) => {
        let keywords: string[] = [];
        try {
          const metaPath = path.join(DATA_DIR, 'skills', skill.id, 'metadata.json');
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            // 'tools' in metadata.json stores routing keywords for agent-type skills
            if (Array.isArray(meta.tools)) {
              keywords = meta.tools.map((k: string) => k.trim().toLowerCase()).filter(Boolean);
            }
          }
        } catch {
          // Non-fatal: agent still selectable by AI classification via description
        }
        return {
          id: `skill-agent-${skill.id}`,
          name: skill.name,
          category: 'custom',
          description: skill.description || '',
          keywords,
        };
      });
      this.agentSkillsCacheTime = now;

      return [...CREW_SPECS, ...this.agentSkillsCache];
    } catch {
      // Fallback to hardcoded only
      return [...CREW_SPECS];
    }
  }

  /**
   * Classify a task and route it to the appropriate crew member.
   *
   * @param taskDescription - Description of the task to classify
   * @returns Classification result with crew member, complexity, and confidence
   */
  async classify(taskDescription: string): Promise<TaskClassification> {
    const specs = await this.getCrewSpecs();

    // First, try fast keyword-based classification
    const quickMatch = this.quickClassify(taskDescription, specs);

    // If high confidence from keywords, use that
    if (quickMatch.confidence >= 0.8) {
      return quickMatch;
    }

    // Otherwise, use AI for more nuanced classification
    try {
      return await this.aiClassify(taskDescription, quickMatch, specs);
    } catch (error) {
      // Fallback to quick match if AI fails
      console.warn('AI classification failed, using keyword fallback:', error);
      return quickMatch;
    }
  }

  /**
   * Fast keyword-based classification without AI call.
   *
   * @param taskDescription - Task description to classify
   * @param specs - Crew member specs to match against (hardcoded + user-defined)
   * @returns Classification based on keyword matching
   */
  private quickClassify(taskDescription: string, specs: CrewMemberSpec[]): TaskClassification {
    const lower = taskDescription.toLowerCase();

    // Score each crew member based on keyword matches
    const scores = specs.map((spec) => {
      const matchCount = spec.keywords.filter((kw) => lower.includes(kw)).length;
      return {
        id: spec.id,
        score: matchCount,
        category: spec.category,
      };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const maxPossibleScore = Math.max(...specs.map((s) => s.keywords.length), 1);

    // Calculate confidence based on match ratio and separation from second best
    const confidence = Math.min(
      0.95,
      (best.score / maxPossibleScore) * 0.6 +
        ((best.score - (scores[1]?.score || 0)) / maxPossibleScore) * 0.4
    );

    // Determine complexity
    const complexity = this.determineComplexity(lower);

    // Find parallel candidates (other crew members with matches)
    const parallelCandidates = scores
      .slice(1)
      .filter((s) => s.score > 0 && s.category !== best.category)
      .map((s) => s.id);

    return {
      crewMember: best.id,
      complexity,
      confidence: Math.max(0.3, confidence), // Minimum 30% confidence
      parallelCandidates: parallelCandidates.length > 0 ? parallelCandidates : undefined,
    };
  }

  /**
   * AI-powered classification using Claude Haiku.
   *
   * @param taskDescription - Task description to classify
   * @param fallback - Fallback classification if AI is uncertain
   * @param specs - Crew member specs to include in the AI prompt
   * @returns AI-enhanced classification
   */
  private async aiClassify(
    taskDescription: string,
    fallback: TaskClassification,
    specs: CrewMemberSpec[]
  ): Promise<TaskClassification> {
    const crewList = specs.map(
      (s) => `- ${s.id}: ${s.name} - ${s.description}`
    ).join('\n');

    const response = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Classify this task and return JSON only.

Task: "${taskDescription}"

Crew members:
${crewList}

Return JSON with:
- crewMember: best crew member ID
- complexity: "simple", "standard", or "complex"
- confidence: 0.0 to 1.0
- parallelCandidates: array of other crew member IDs that could help (optional)
- reasoning: one sentence explanation

JSON only, no markdown:`,
        },
      ],
    });

    // Extract text from response
    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Parse the JSON response
      const parsed = JSON.parse(text.trim());

      // Validate the response against all available specs (hardcoded + user-defined)
      const validCrewIds = specs.map((s) => s.id);
      if (!validCrewIds.includes(parsed.crewMember)) {
        throw new Error(`Invalid crew member: ${parsed.crewMember}`);
      }

      return {
        crewMember: parsed.crewMember,
        complexity: this.validateComplexity(parsed.complexity),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        parallelCandidates: parsed.parallelCandidates?.filter((id: string) =>
          validCrewIds.includes(id)
        ),
        reasoning: parsed.reasoning,
      };
    } catch (parseError) {
      console.warn('Failed to parse AI classification response:', parseError);
      return fallback;
    }
  }

  /**
   * Determine task complexity from description.
   *
   * @param lowerDescription - Lowercase task description
   * @returns Complexity level
   */
  private determineComplexity(lowerDescription: string): TaskComplexity {
    const simpleMatches = COMPLEXITY_PATTERNS.simple.filter((p) =>
      lowerDescription.includes(p)
    ).length;

    const complexMatches = COMPLEXITY_PATTERNS.complex.filter((p) =>
      lowerDescription.includes(p)
    ).length;

    if (complexMatches > simpleMatches) {
      return 'complex';
    }

    if (simpleMatches > complexMatches) {
      return 'simple';
    }

    return 'standard';
  }

  /**
   * Validate and normalize complexity value.
   *
   * @param complexity - Complexity value to validate
   * @returns Valid complexity level
   */
  private validateComplexity(complexity: unknown): TaskComplexity {
    if (
      complexity === 'simple' ||
      complexity === 'standard' ||
      complexity === 'complex'
    ) {
      return complexity;
    }
    return 'standard';
  }

  /**
   * Get all available crew member IDs.
   *
   * @returns Array of crew member IDs
   */
  getCrewMemberIds(): string[] {
    return CREW_SPECS.map((s) => s.id);
  }

  /**
   * Get crew member specification by ID.
   *
   * @param id - Crew member ID
   * @returns Crew member specification or undefined
   */
  getCrewMemberSpec(id: string): CrewMemberSpec | undefined {
    return CREW_SPECS.find((s) => s.id === id);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TaskRouter instance with the provided API key.
 *
 * @param apiKey - Anthropic API key
 * @returns TaskRouter instance
 */
export function createTaskRouter(apiKey: string): TaskRouter {
  return new TaskRouter(apiKey);
}
