/**
 * @deprecated This module is replaced by lib/living-files.ts when JOHNNY5_LIVING_FILES=true.
 * Living files provide unified context via loadLivingFilesContext() without needing this builder.
 * This file will be removed after living files are fully verified in production.
 *
 * Memory Context Builder for Johnny5
 *
 * Builds the memory context that gets injected into Johnny5's system prompt.
 * Combines multiple memory sources:
 * - Extracted facts (from AI extraction)
 * - Learned patterns (user behavior patterns)
 * - ManusLive memory (if available locally)
 * - User profile (from onboarding)
 *
 * This is the main entry point for memory injection into Johnny5's responses.
 */

import { getRelevantFacts, getFactsByType, ExtractedFact } from './fact-extraction-service';
import { getHighConfidencePatterns, LearnedPattern } from './pattern-detection-service';
import { getUnifiedContext } from '@/lib/johnny5-db';

// ============================================================================
// Types
// ============================================================================

export interface MemoryContext {
  /** Section about what Johnny5 knows about the user */
  factsSection: string;
  /** Section about learned user patterns */
  patternsSection: string;
  /** Section from ManusLive (if available) */
  manusLiveSection: string;
  /** Combined context for injection */
  combinedContext: string;
  /** Metadata about sources used */
  sources: {
    factsCount: number;
    patternsCount: number;
    manusLiveAvailable: boolean;
    profileAvailable: boolean;
  };
}

export interface ContextBuildOptions {
  /** The user ID to scope all memory queries to */
  userId: string;
  /** User's current message (for relevance matching) */
  userMessage?: string;
  /** Maximum facts to include */
  maxFacts?: number;
  /** Maximum patterns to include */
  maxPatterns?: number;
  /** Minimum pattern confidence to include */
  minPatternConfidence?: number;
  /** Include ManusLive context if available */
  includeManusLive?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ContextBuildOptions, 'userId'>> = {
  userMessage: '',
  maxFacts: 10,
  maxPatterns: 5,
  minPatternConfidence: 0.7,
  includeManusLive: true,
};

// ============================================================================
// Context Building Functions
// ============================================================================

/**
 * Build the facts section of the context
 */
async function buildFactsSection(
  userId: string,
  userMessage: string,
  maxFacts: number
): Promise<{ section: string; count: number }> {
  let facts: ExtractedFact[] = [];

  // If we have a user message, get relevant facts
  if (userMessage) {
    const relevantFacts = await getRelevantFacts(userMessage, Math.ceil(maxFacts / 2), userId);
    facts.push(...relevantFacts);
  }

  // Fill in with high-value facts by type
  const factTypes: ExtractedFact['type'][] = ['personal', 'project', 'goal', 'preference', 'technical'];
  for (const type of factTypes) {
    if (facts.length >= maxFacts) break;
    const typeFacts = await getFactsByType(type, 3, userId);
    for (const fact of typeFacts) {
      if (facts.length >= maxFacts) break;
      // Avoid duplicates
      if (!facts.some(f => f.key === fact.key)) {
        facts.push(fact);
      }
    }
  }

  if (facts.length === 0) {
    return { section: '', count: 0 };
  }

  // Group facts by type for better readability
  const grouped = facts.reduce((acc, fact) => {
    if (!acc[fact.type]) acc[fact.type] = [];
    acc[fact.type].push(fact);
    return acc;
  }, {} as Record<string, ExtractedFact[]>);

  const lines: string[] = ['## What I Know About You'];
  const typeLabels: Record<string, string> = {
    personal: 'Personal',
    preference: 'Preferences',
    project: 'Projects',
    technical: 'Technical',
    goal: 'Goals',
  };

  for (const [type, typeFacts] of Object.entries(grouped)) {
    lines.push(`**${typeLabels[type] || type}:**`);
    for (const fact of typeFacts) {
      lines.push(`- ${fact.key}: ${fact.value}`);
    }
  }

  return {
    section: lines.join('\n'),
    count: facts.length,
  };
}

/**
 * Build the patterns section of the context
 */
async function buildPatternsSection(
  userId: string,
  minConfidence: number,
  maxPatterns: number
): Promise<{ section: string; count: number }> {
  const patterns = await getHighConfidencePatterns(minConfidence, maxPatterns, userId);

  if (patterns.length === 0) {
    return { section: '', count: 0 };
  }

  const lines: string[] = ['## Your Preferences I\'ve Learned'];

  for (const pattern of patterns) {
    const typeEmoji = getPatternEmoji(pattern.pattern_type);
    lines.push(`- ${typeEmoji} ${pattern.pattern_description}`);
    if (pattern.suggested_action) {
      lines.push(`  → Action: ${pattern.suggested_action}`);
    }
  }

  return {
    section: lines.join('\n'),
    count: patterns.length,
  };
}

/**
 * Get emoji for pattern type
 */
function getPatternEmoji(type: LearnedPattern['pattern_type']): string {
  switch (type) {
    case 'workflow': return '⚙️';
    case 'coding_style': return '💻';
    case 'preference': return '✨';
    case 'time_pattern': return '🕐';
    case 'communication': return '💬';
    default: return '📌';
  }
}

/**
 * Build the ManusLive section of the context (if available)
 */
async function buildManusLiveSection(userId: string): Promise<{
  section: string;
  available: boolean;
  profileAvailable: boolean;
}> {
  try {
    const unifiedContext = await getUnifiedContext(false, userId);

    if (!unifiedContext.manusLiveInstalled && !unifiedContext.localProfile) {
      return { section: '', available: false, profileAvailable: false };
    }

    // The unified context already has a formatted contextForAI
    if (unifiedContext.contextForAI && unifiedContext.contextForAI !== 'No user context available. Ask the user to introduce themselves.') {
      return {
        section: unifiedContext.contextForAI,
        available: unifiedContext.manusLiveInstalled,
        profileAvailable: !!unifiedContext.localProfile,
      };
    }

    return {
      section: '',
      available: unifiedContext.manusLiveInstalled,
      profileAvailable: !!unifiedContext.localProfile,
    };
  } catch (error) {
    console.error('[MemoryContext] Failed to get unified context:', error);
    return { section: '', available: false, profileAvailable: false };
  }
}

/**
 * Build the complete memory context for Johnny5
 *
 * @param options - Configuration options
 * @returns Complete memory context for prompt injection
 */
export async function buildMemoryContext(
  options: ContextBuildOptions
): Promise<MemoryContext> {
  const { userId } = options;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('[MemoryContext] Building context for user:', userId);

  // Build all sections in parallel
  const [factsResult, patternsResult, manusLiveResult] = await Promise.all([
    buildFactsSection(userId, opts.userMessage, opts.maxFacts),
    buildPatternsSection(userId, opts.minPatternConfidence, opts.maxPatterns),
    opts.includeManusLive ? buildManusLiveSection(userId) : Promise.resolve({ section: '', available: false, profileAvailable: false }),
  ]);

  // Combine sections, avoiding duplicates
  const sections: string[] = [];

  // Add facts section (highest priority - specific to this conversation)
  if (factsResult.section) {
    sections.push(factsResult.section);
  }

  // Add patterns section
  if (patternsResult.section) {
    sections.push(patternsResult.section);
  }

  // ALWAYS add ManusLive section if available (not just when facts count is 0)
  // ManusLive provides rich context even when we have extracted facts
  if (manusLiveResult.section) {
    sections.push(manusLiveResult.section);
  }

  const combinedContext = sections.length > 0
    ? sections.join('\n\n')
    : '';

  const context: MemoryContext = {
    factsSection: factsResult.section,
    patternsSection: patternsResult.section,
    manusLiveSection: manusLiveResult.section,
    combinedContext,
    sources: {
      factsCount: factsResult.count,
      patternsCount: patternsResult.count,
      manusLiveAvailable: manusLiveResult.available,
      profileAvailable: manusLiveResult.profileAvailable,
    },
  };

  console.log('[MemoryContext] Built context with:', context.sources);
  return context;
}

/**
 * Build a lightweight context for quick responses
 * Uses cached/recent data without AI calls
 */
export async function buildQuickContext(userId: string): Promise<string> {
  try {
    // Just get top facts and patterns from database
    const [personalFacts, patterns] = await Promise.all([
      getFactsByType('personal', 3, userId),
      getHighConfidencePatterns(0.8, 3, userId),
    ]);

    const lines: string[] = [];

    if (personalFacts.length > 0) {
      lines.push('**Quick context:**');
      for (const fact of personalFacts) {
        lines.push(`- ${fact.key}: ${fact.value}`);
      }
    }

    if (patterns.length > 0 && lines.length > 0) {
      lines.push('');
      for (const pattern of patterns) {
        if (pattern.suggested_action) {
          lines.push(`Note: ${pattern.suggested_action}`);
        }
      }
    }

    return lines.join('\n');
  } catch (error) {
    console.error('[MemoryContext] Quick context error:', error);
    return '';
  }
}

/**
 * Get proactive suggestions based on patterns and context
 *
 * @param currentContext - Current conversation context
 * @returns Suggested proactive behavior, or null if none applicable
 */
export async function getProactiveSuggestion(
  currentContext: string,
  userId: string
): Promise<string | null> {
  try {
    const patterns = await getHighConfidencePatterns(0.75, 3, userId);

    if (patterns.length === 0) return null;

    // Check if any pattern's suggested action is relevant to current context
    const contextLower = currentContext.toLowerCase();

    for (const pattern of patterns) {
      if (!pattern.suggested_action) continue;

      // Simple keyword matching for relevance
      const keywords = pattern.pattern_description.toLowerCase().split(/\s+/);
      const isRelevant = keywords.some(k => k.length > 4 && contextLower.includes(k));

      if (isRelevant) {
        return pattern.suggested_action;
      }
    }

    // If no specific match, return the highest confidence pattern's action
    const topPattern = patterns[0];
    if (topPattern.confidence >= 0.85 && topPattern.suggested_action) {
      return topPattern.suggested_action;
    }

    return null;
  } catch (error) {
    console.error('[MemoryContext] Proactive suggestion error:', error);
    return null;
  }
}
