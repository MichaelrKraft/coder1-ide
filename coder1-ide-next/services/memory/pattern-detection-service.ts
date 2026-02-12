/**
 * Pattern Detection Service for Johnny5
 *
 * Analyzes accumulated facts and session data to detect user behavior patterns.
 * These patterns enable Johnny5 to be proactive and self-improving.
 *
 * Pattern Types:
 * - workflow: How the user prefers to work (e.g., "always wants tests first")
 * - coding_style: Coding preferences (e.g., "prefers TypeScript strict mode")
 * - preference: General preferences (e.g., "likes detailed explanations")
 * - time_pattern: When they work (e.g., "most active evenings")
 * - communication: Communication style preferences
 */

import { getDb } from '@/lib/johnny5-db';
import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// Types
// ============================================================================

export interface LearnedPattern {
  id: string;
  pattern_type: 'workflow' | 'coding_style' | 'preference' | 'time_pattern' | 'communication';
  pattern_description: string;
  evidence_count: number;
  first_observed: string;
  last_observed: string;
  confidence: number;
  actionable: boolean;
  suggested_action: string | null;
}

export interface PatternDetectionResult {
  type: LearnedPattern['pattern_type'];
  description: string;
  confidence: number;
  suggestedAction: string;
}

export interface SessionSummary {
  id: string;
  messageCount: number;
  startedAt: string;
  userMessageSnippets: string[];
}

// ============================================================================
// Pattern Detection Prompt
// ============================================================================

const PATTERN_DETECTION_PROMPT = `You are a pattern detection system for an AI assistant called Johnny5.
Analyze the provided user data and identify behavioral patterns that would help Johnny5 be more helpful.

## PATTERN TYPES
- workflow: How they prefer to work (e.g., "prefers seeing a plan before code")
- coding_style: Coding preferences (e.g., "uses TypeScript strict mode", "prefers functional components")
- preference: General preferences (e.g., "likes detailed explanations", "prefers concise responses")
- time_pattern: Work timing patterns (e.g., "typically works evenings", "prefers morning deep work")
- communication: Communication style (e.g., "prefers casual tone", "values direct feedback")

## RULES
1. Only identify patterns with strong evidence (multiple data points)
2. Confidence should reflect how consistent the pattern is:
   - 0.9+: Very consistent, seen many times
   - 0.7-0.9: Mostly consistent
   - 0.5-0.7: Emerging pattern, needs more data
3. Each pattern MUST have a concrete suggested action Johnny5 can take
4. Focus on patterns that would improve Johnny5's assistance

## INPUT DATA
Recent extracted facts:
{facts}

Recent session summaries:
{sessions}

## OUTPUT FORMAT
Return a JSON array of patterns. If no clear patterns, return empty array [].

\`\`\`json
[
  {
    "type": "workflow",
    "description": "User prefers to see implementation plans before code",
    "confidence": 0.85,
    "suggestedAction": "Always propose a brief plan before writing code"
  }
]
\`\`\`

Analyze and return patterns:`;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Initialize Gemini AI client
 */
function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[PatternDetection] GEMINI_API_KEY not set');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Get recent facts from database for pattern analysis
 */
async function getRecentFacts(limit: number = 50, userId: string): Promise<string> {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT fact_type, fact_key, fact_value, confidence, reference_count
    FROM extracted_facts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const facts = stmt.all(userId, limit) as Array<{
    fact_type: string;
    fact_key: string;
    fact_value: string;
    confidence: number;
    reference_count: number;
  }>;

  if (facts.length === 0) {
    return 'No facts available yet.';
  }

  return facts
    .map(f => `[${f.fact_type}] ${f.fact_key}: ${f.fact_value} (confidence: ${f.confidence}, referenced: ${f.reference_count}x)`)
    .join('\n');
}

/**
 * Get recent session summaries for pattern analysis
 */
async function getRecentSessionSummaries(limit: number = 10): Promise<string> {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT s.id, s.message_count, s.started_at,
           GROUP_CONCAT(CASE WHEN m.role = 'user' THEN SUBSTR(m.content, 1, 100) END, ' | ') as user_snippets
    FROM sessions s
    LEFT JOIN messages m ON s.id = m.session_id
    WHERE s.status IN ('active', 'completed')
    GROUP BY s.id
    ORDER BY s.started_at DESC
    LIMIT ?
  `);

  const sessions = stmt.all(limit) as Array<{
    id: string;
    message_count: number;
    started_at: string;
    user_snippets: string | null;
  }>;

  if (sessions.length === 0) {
    return 'No sessions available yet.';
  }

  return sessions
    .map(s => `Session ${s.id.substring(0, 8)}... (${s.message_count} messages, ${s.started_at}): ${s.user_snippets || 'No user messages'}`)
    .join('\n\n');
}

/**
 * Detect patterns from accumulated data using AI
 */
export async function detectPatterns(userId: string): Promise<PatternDetectionResult[]> {
  const genAI = getGeminiClient();
  if (!genAI) {
    return [];
  }

  try {
    const [factsText, sessionsText] = await Promise.all([
      getRecentFacts(50, userId),
      getRecentSessionSummaries(10),
    ]);

    // Skip if not enough data
    if (factsText === 'No facts available yet.' && sessionsText === 'No sessions available yet.') {
      console.log('[PatternDetection] Not enough data for pattern detection');
      return [];
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    });

    const prompt = PATTERN_DETECTION_PROMPT
      .replace('{facts}', factsText)
      .replace('{sessions}', sessionsText);

    console.log('[PatternDetection] Analyzing patterns...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('[PatternDetection] No patterns detected');
      return [];
    }

    const patterns = JSON.parse(jsonMatch[0]) as PatternDetectionResult[];
    console.log(`[PatternDetection] Detected ${patterns.length} patterns`);

    return patterns.filter(p =>
      p.type && p.description && p.confidence >= 0.5 && p.suggestedAction
    );
  } catch (error) {
    console.error('[PatternDetection] Error:', error);
    return [];
  }
}

/**
 * Save detected patterns to database
 */
export async function savePatterns(patterns: PatternDetectionResult[], userId: string): Promise<void> {
  if (patterns.length === 0) return;

  const db = getDb();
  const now = new Date().toISOString();

  const upsertStmt = db.prepare(`
    INSERT INTO learned_patterns (
      id, user_id, pattern_type, pattern_description, evidence_count,
      first_observed, last_observed, confidence, actionable, suggested_action
    )
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, 1, ?)
    ON CONFLICT(user_id, pattern_type, pattern_description) DO UPDATE SET
      evidence_count = evidence_count + 1,
      last_observed = excluded.last_observed,
      confidence = MIN(1.0, confidence + 0.05),
      suggested_action = COALESCE(excluded.suggested_action, suggested_action)
  `);

  const upsertMany = db.transaction((patternsToSave: PatternDetectionResult[]) => {
    for (const pattern of patternsToSave) {
      upsertStmt.run(
        randomUUID(),
        userId,
        pattern.type,
        pattern.description,
        now,
        now,
        pattern.confidence,
        pattern.suggestedAction
      );
    }
  });

  try {
    upsertMany(patterns);
    console.log(`[PatternDetection] Saved ${patterns.length} patterns`);
  } catch (error) {
    console.error('[PatternDetection] Failed to save patterns:', error);
  }
}

/**
 * Get high-confidence patterns for context injection
 */
export async function getHighConfidencePatterns(
  minConfidence: number = 0.7,
  limit: number = 5,
  userId: string
): Promise<LearnedPattern[]> {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT *
    FROM learned_patterns
    WHERE confidence >= ? AND actionable = 1 AND user_id = ?
    ORDER BY confidence DESC, evidence_count DESC
    LIMIT ?
  `);

  return stmt.all(minConfidence, userId, limit) as LearnedPattern[];
}

/**
 * Get all patterns of a specific type
 */
export async function getPatternsByType(
  patternType: LearnedPattern['pattern_type'],
  limit: number = 10,
  userId: string
): Promise<LearnedPattern[]> {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT *
    FROM learned_patterns
    WHERE pattern_type = ? AND user_id = ?
    ORDER BY confidence DESC, evidence_count DESC
    LIMIT ?
  `);

  return stmt.all(patternType, userId, limit) as LearnedPattern[];
}

/**
 * Record that a pattern was applied (for tracking effectiveness)
 */
export async function recordPatternApplication(patternId: string, userId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE learned_patterns
    SET evidence_count = evidence_count + 1,
        last_observed = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(now, patternId, userId);
}

/**
 * Decay pattern confidence over time (for patterns that aren't reinforced)
 */
export async function decayStalePatterns(
  olderThanDays: number = 30,
  decayAmount: number = 0.1,
  userId: string
): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const stmt = db.prepare(`
    UPDATE learned_patterns
    SET confidence = MAX(0.3, confidence - ?)
    WHERE last_observed < ? AND user_id = ?
  `);

  const result = stmt.run(decayAmount, cutoffDate.toISOString(), userId);
  console.log(`[PatternDetection] Decayed confidence for ${result.changes} stale patterns`);
  return result.changes;
}

/**
 * Delete patterns with very low confidence
 */
export async function cleanupLowConfidencePatterns(
  maxConfidence: number = 0.35,
  userId: string
): Promise<number> {
  const db = getDb();

  const stmt = db.prepare(`
    DELETE FROM learned_patterns
    WHERE confidence < ? AND user_id = ?
  `);

  const result = stmt.run(maxConfidence, userId);
  console.log(`[PatternDetection] Removed ${result.changes} low-confidence patterns`);
  return result.changes;
}

/**
 * Run full pattern detection and update cycle
 * Call this periodically (e.g., after every 10 conversations or daily)
 */
export async function runPatternDetectionCycle(userId: string): Promise<{
  detected: number;
  saved: number;
  decayed: number;
  cleaned: number;
}> {
  console.log('[PatternDetection] Starting detection cycle...');

  const patterns = await detectPatterns(userId);
  await savePatterns(patterns, userId);

  const decayed = await decayStalePatterns(30, 0.1, userId);
  const cleaned = await cleanupLowConfidencePatterns(0.35, userId);

  const result = {
    detected: patterns.length,
    saved: patterns.length,
    decayed,
    cleaned,
  };

  console.log('[PatternDetection] Cycle complete:', result);
  return result;
}
