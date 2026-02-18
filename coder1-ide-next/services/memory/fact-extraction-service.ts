/**
 * Fact Extraction Service for Johnny5
 *
 * Extracts facts from conversations using AI (Gemini Flash for speed/cost).
 * This enables Johnny5 to build persistent memory that works in production
 * without requiring ManusLive.
 *
 * Key Features:
 * - Extracts explicit facts from conversations (never assumes)
 * - Assigns confidence scores based on how directly stated
 * - Categorizes facts: personal, preference, project, technical, goal
 * - Avoids duplicates by checking existing facts
 * - Non-blocking - runs after chat responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/johnny5-db';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedFact {
  type: 'personal' | 'preference' | 'project' | 'technical' | 'goal';
  key: string;
  value: string;
  confidence: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ExistingFact {
  fact_key: string;
  fact_value: string;
}

// ============================================================================
// Extraction Prompt
// ============================================================================

const EXTRACTION_PROMPT = `You are a memory extraction system for an AI assistant called Johnny5.
Your job is to extract EXPLICIT facts from conversations that would be useful to remember.

## RULES
1. Only extract information that is EXPLICITLY STATED, never assume or infer
2. Assign confidence based on how directly the information was stated:
   - 0.95-1.0: Directly stated ("My name is Mike", "I'm a developer")
   - 0.80-0.94: Strongly implied from direct statements ("I've been coding for 10 years")
   - 0.60-0.79: Reasonably implied ("Working on my startup" implies entrepreneurship)
   - Below 0.6: Don't extract, too uncertain
3. Use specific, searchable keys (e.g., "user_name" not "name")
4. Keep values concise but complete
5. If user corrects a previous statement, extract the correction

## FACT TYPES
- personal: User's personal info (name, location, role, background)
- preference: User's likes, dislikes, preferred tools/frameworks/methods
- project: Current projects, companies, products they're building
- technical: Technical skills, languages, frameworks they use
- goal: User's goals, aspirations, what they're trying to achieve

## OUTPUT FORMAT
Return a JSON array of facts. If no new facts found, return empty array [].

\`\`\`json
[
  {
    "type": "personal",
    "key": "user_name",
    "value": "Mike",
    "confidence": 0.95
  },
  {
    "type": "project",
    "key": "current_project",
    "value": "Coder1 IDE - AI-powered development environment",
    "confidence": 0.9
  }
]
\`\`\`

## IMPORTANT
- ONLY return the JSON array, no other text
- Do NOT re-extract facts that are already known (provided below)
- Focus on NEW information from the conversation

ALREADY KNOWN FACTS (do not re-extract):
{existingFacts}

CONVERSATION TO ANALYZE:
{conversation}

Extract facts from this conversation:`;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Initialize Gemini AI client
 */
function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[FactExtraction] GEMINI_API_KEY not set, fact extraction disabled');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Format conversation messages for the extraction prompt
 */
function formatConversation(messages: ConversationMessage[], userId: string): string {
  // Take last 10 messages for context (balance between context and cost)
  const recentMessages = messages.slice(-10);
  return recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
}

/**
 * Format existing facts to avoid re-extraction
 */
function formatExistingFacts(facts: ExistingFact[]): string {
  if (facts.length === 0) {
    return 'None';
  }
  return facts
    .slice(0, 20) // Limit to 20 most relevant
    .map(f => `- ${f.fact_key}: ${f.fact_value}`)
    .join('\n');
}

/**
 * Parse extraction response from Gemini
 */
function parseExtractionResponse(text: string): ExtractedFact[] {
  try {
    // Try to find JSON array in the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('[FactExtraction] No JSON array found in response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      console.warn('[FactExtraction] Parsed result is not an array');
      return [];
    }

    // Validate and filter facts
    return parsed.filter((fact: any) => {
      const validTypes = ['personal', 'preference', 'project', 'technical', 'goal'];
      return (
        fact &&
        typeof fact.type === 'string' &&
        validTypes.includes(fact.type) &&
        typeof fact.key === 'string' &&
        fact.key.length > 0 &&
        typeof fact.value === 'string' &&
        fact.value.length > 0 &&
        typeof fact.confidence === 'number' &&
        fact.confidence >= 0.6 &&
        fact.confidence <= 1.0
      );
    });
  } catch (error) {
    console.error('[FactExtraction] Failed to parse response:', error);
    return [];
  }
}

/**
 * Regex-based fact extraction fallback.
 * Used when Gemini API is unavailable (no GEMINI_API_KEY).
 * Catches obvious personal statements from USER messages.
 */
function extractFactsWithRegex(
  messages: ConversationMessage[],
  existingFacts: ExistingFact[] = []
): ExtractedFact[] {
  const existingKeys = new Set(existingFacts.map(f => f.fact_key));
  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  // Only analyze user messages
  const userMessages = messages.filter(m => m.role === 'user');

  // Patterns: [regex, factType, factKey, valueGroupIndex]
  const patterns: Array<{
    regex: RegExp;
    type: ExtractedFact['type'];
    key: string;
    confidence: number;
  }> = [
    // Name patterns
    { regex: /\bmy name is ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i, type: 'personal', key: 'user_name', confidence: 0.95 },
    { regex: /\bcall me ([A-Z][a-z]+)/i, type: 'personal', key: 'user_name', confidence: 0.9 },
    { regex: /\bi'm ([A-Z][a-z]+),?\s/i, type: 'personal', key: 'user_name', confidence: 0.7 },

    // Favorite color
    { regex: /\bmy favou?rite colou?r is ([a-z][a-z\s]{1,20})/i, type: 'preference', key: 'favorite_color', confidence: 0.95 },
    { regex: /\bfavou?rite colou?r(?:\s+is|\:)\s*([a-z][a-z\s]{1,20})/i, type: 'preference', key: 'favorite_color', confidence: 0.9 },

    // General favorites
    { regex: /\bmy favou?rite (\w+) is ([^\.,!?]+)/i, type: 'preference', key: '_dynamic_favorite', confidence: 0.9 },

    // Role / occupation
    { regex: /\bi(?:'m| am) an? ([a-z][a-z\s]{2,30}(?:developer|engineer|designer|founder|entrepreneur|manager|analyst|scientist|architect|consultant|writer|artist))/i, type: 'personal', key: 'user_role', confidence: 0.85 },
    { regex: /\bi work as an? ([a-z][a-z\s]{2,30})/i, type: 'personal', key: 'user_role', confidence: 0.85 },

    // Location
    { regex: /\bi(?:'m| am) from ([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i, type: 'personal', key: 'user_location', confidence: 0.85 },
    { regex: /\bi live in ([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i, type: 'personal', key: 'user_location', confidence: 0.85 },

    // Goals
    { regex: /\bmy goal is (?:to )?([^\.,!?]{5,60})/i, type: 'goal', key: 'user_goal', confidence: 0.85 },
    { regex: /\bi(?:'m| am) trying to ([^\.,!?]{5,60})/i, type: 'goal', key: 'user_goal', confidence: 0.75 },

    // Projects / Work
    { regex: /\bi(?:'m| am) (?:working on|building) ([^\.,!?]{3,50})/i, type: 'project', key: 'current_project', confidence: 0.8 },
    { regex: /\bmy (?:company|startup|business) is (?:called )?([^\.,!?]{2,40})/i, type: 'project', key: 'user_company', confidence: 0.85 },

    // Preferences
    { regex: /\bi (?:really )?(?:like|love|prefer) ([^\.,!?]{3,40})/i, type: 'preference', key: 'user_likes', confidence: 0.75 },

    // Technical
    { regex: /\bi (?:mainly )?(?:use|code in|program in|work with) ([^\.,!?]{2,40})/i, type: 'technical', key: 'tech_stack', confidence: 0.8 },
  ];

  for (const msg of userMessages) {
    for (const pattern of patterns) {
      const match = msg.content.match(pattern.regex);
      if (!match) continue;

      let key = pattern.key;
      let value: string;

      // Handle dynamic favorite pattern (e.g., "my favorite food is pizza")
      if (key === '_dynamic_favorite') {
        key = `favorite_${match[1].toLowerCase().trim()}`;
        value = match[2].trim();
      } else {
        value = match[1].trim();
      }

      // Clean up value (remove trailing punctuation, whitespace)
      value = value.replace(/[\s.!?,;:]+$/, '').trim();

      // Skip if empty, too short, or already known
      if (!value || value.length < 2) continue;
      if (existingKeys.has(key)) continue;
      if (seen.has(key)) continue;

      seen.add(key);
      facts.push({
        type: pattern.type,
        key,
        value,
        confidence: pattern.confidence,
      });
    }
  }

  if (facts.length > 0) {
    console.log(`[FactExtraction] Regex fallback extracted ${facts.length} facts:`,
      facts.map(f => `${f.key}=${f.value}`).join(', '));
  }

  return facts;
}

/**
 * Extract facts from a conversation using Gemini AI
 *
 * @param messages - The conversation messages to analyze
 * @param existingFacts - Facts already known (to avoid duplicates)
 * @returns Array of newly extracted facts
 */
export async function extractFactsFromConversation(
  messages: ConversationMessage[],
  existingFacts: ExistingFact[] = [],
  userId: string
): Promise<ExtractedFact[]> {
  console.log('[FactExtraction] Starting extraction...');
  console.log('[FactExtraction] Messages count:', messages.length);
  console.log('[FactExtraction] User messages:', messages.filter(m => m.role === 'user').length);
  console.log('[FactExtraction] Existing facts to avoid:', existingFacts.length);

  const genAI = getGeminiClient();
  if (!genAI) {
    console.warn('[FactExtraction] Gemini client not available, using regex fallback');
    const regexFacts = extractFactsWithRegex(messages, existingFacts);
    console.log('[FactExtraction] === Extraction Summary ===', {
      inputMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      existingFactsChecked: existingFacts.length,
      newFactsExtracted: regexFacts.length,
      geminiAvailable: false,
      status: 'regex_fallback',
    });
    return regexFacts;
  }

  // Skip if conversation is too short
  if (messages.length < 2) {
    console.log('[FactExtraction] Conversation too short, skipping');
    return [];
  }

  // Skip if no user messages
  const hasUserMessages = messages.some(m => m.role === 'user');
  if (!hasUserMessages) {
    console.log('[FactExtraction] No user messages, skipping');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2, // Low temperature for consistent extraction
        maxOutputTokens: 1024,
      }
    });

    const prompt = EXTRACTION_PROMPT
      .replace('{existingFacts}', formatExistingFacts(existingFacts))
      .replace('{conversation}', formatConversation(messages, userId));

    console.log('[FactExtraction] Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log('[FactExtraction] Gemini response length:', text.length);
    console.log('[FactExtraction] Response preview:', text.substring(0, 300));

    const facts = parseExtractionResponse(text);
    console.log(`[FactExtraction] Parsed ${facts.length} new facts`);
    if (facts.length > 0) {
      console.log('[FactExtraction] First fact:', JSON.stringify(facts[0]));
    }

    console.log('[FactExtraction] === Extraction Summary ===', {
      inputMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      existingFactsChecked: existingFacts.length,
      newFactsExtracted: facts.length,
      geminiAvailable: true,
      status: facts.length > 0 ? 'facts_found' : 'no_new_facts',
    });

    return facts;
  } catch (error) {
    console.error('[FactExtraction] Gemini API error:', error);

    console.log('[FactExtraction] === Extraction Summary ===', {
      inputMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      existingFactsChecked: existingFacts.length,
      newFactsExtracted: 0,
      geminiAvailable: true,
      status: 'error',
    });

    return [];
  }
}

/**
 * Save extracted facts to the database
 *
 * @param sessionId - The session these facts came from
 * @param facts - The facts to save
 * @param sourceMessageId - Optional message ID that triggered extraction
 */
export async function saveFacts(
  sessionId: string,
  facts: ExtractedFact[],
  sourceMessageId: string | undefined,
  userId: string
): Promise<void> {
  if (facts.length === 0) return;

  console.log(`[FactExtraction] Saving ${facts.length} facts to session ${sessionId}`);

  const db = getDb();
  const now = new Date().toISOString();

  // Check for existing facts to detect updates/contradictions
  try {
    const placeholders = facts.map(() => '?').join(',');
    const checkStmt = db.prepare(`SELECT fact_key, fact_value FROM extracted_facts WHERE fact_key IN (${placeholders}) AND user_id = ?`);
    const existing = checkStmt.all(...facts.map(f => f.key), userId) as Array<{ fact_key: string; fact_value: string }>;
    for (const e of existing) {
      const newFact = facts.find(f => f.key === e.fact_key);
      if (newFact && newFact.value !== e.fact_value) {
        console.log(`[FactExtraction] Fact update detected: "${e.fact_key}" changing from "${e.fact_value}" to "${newFact.value}"`);
      }
    }
  } catch (checkError) {
    // Non-critical, continue with save
    console.warn('[FactExtraction] Could not check existing facts:', checkError);
  }

  const insertStmt = db.prepare(`
    INSERT INTO extracted_facts (
      id, user_id, session_id, fact_type, fact_key, fact_value, confidence,
      source_message_id, created_at, last_referenced, reference_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(user_id, fact_key) DO UPDATE SET
      fact_value = excluded.fact_value,
      confidence = MAX(confidence, excluded.confidence),
      last_referenced = excluded.created_at,
      reference_count = reference_count + 1
  `);

  const insertMany = db.transaction((factsToInsert: ExtractedFact[]) => {
    for (const fact of factsToInsert) {
      console.debug(`[FactExtraction] Upserting fact: ${fact.key} = ${fact.value} (type=${fact.type}, confidence=${fact.confidence})`);
      insertStmt.run(
        randomUUID(),
        userId,
        sessionId,
        fact.type,
        fact.key,
        fact.value,
        fact.confidence,
        sourceMessageId || null,
        now,
        now
      );
    }
  });

  try {
    insertMany(facts);
    console.log(`[FactExtraction] Successfully saved ${facts.length} facts`);
  } catch (error: any) {
    console.error(`[FactExtraction] Database error saving facts: ${error?.message || error}`, error);
  }
}

/**
 * Get existing facts from the database
 *
 * @param sessionId - Optional: filter by session
 * @param limit - Maximum number of facts to return
 */
export async function getExistingFacts(
  sessionId: string | undefined,
  limit: number = 50,
  userId: string
): Promise<ExistingFact[]> {
  const db = getDb();

  let stmt;
  if (sessionId) {
    stmt = db.prepare(`
      SELECT fact_key, fact_value
      FROM extracted_facts
      WHERE session_id = ? AND user_id = ?
      ORDER BY confidence DESC, reference_count DESC
      LIMIT ?
    `);
    return stmt.all(sessionId, userId, limit) as ExistingFact[];
  } else {
    stmt = db.prepare(`
      SELECT fact_key, fact_value
      FROM extracted_facts
      WHERE user_id = ?
      ORDER BY confidence DESC, reference_count DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as ExistingFact[];
  }
}

/**
 * Get relevant facts for a given query/context
 *
 * @param query - The user's message or context to match against
 * @param limit - Maximum number of facts to return
 */
export async function getRelevantFacts(
  query: string,
  limit: number = 10,
  userId: string
): Promise<Array<ExtractedFact & { reference_count: number }>> {
  const db = getDb();

  // Use simple keyword matching for now
  // Could be enhanced with embeddings later
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  if (keywords.length === 0) {
    // Return most referenced facts if no keywords
    const stmt = db.prepare(`
      SELECT fact_type as type, fact_key as key, fact_value as value,
             confidence, reference_count
      FROM extracted_facts
      WHERE user_id = ?
      ORDER BY reference_count DESC, confidence DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as Array<ExtractedFact & { reference_count: number }>;
  }

  // Build a simple relevance query
  const likeConditions = keywords.map(() => `(LOWER(fact_key) LIKE ? OR LOWER(fact_value) LIKE ?)`).join(' OR ');
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

  const stmt = db.prepare(`
    SELECT fact_type as type, fact_key as key, fact_value as value,
           confidence, reference_count
    FROM extracted_facts
    WHERE user_id = ? AND (${likeConditions})
    ORDER BY confidence DESC, reference_count DESC
    LIMIT ?
  `);

  return stmt.all(userId, ...params, limit) as Array<ExtractedFact & { reference_count: number }>;
}

/**
 * Get facts ranked by a composite score: confidence × recency × relevance.
 *
 * Compared to getRelevantFacts(), this function:
 * - Boosts recently created/updated facts
 * - Boosts facts whose values share keywords with the user's message
 * - Penalizes facts older than 90 days that have never been confirmed
 * - Annotates stale facts so the caller can present them differently
 */
export async function getRelevantFactsRanked(
  userMessage: string,
  limit: number = 10,
  userId: string
): Promise<Array<ExtractedFact & { isStale: boolean; score: number }>> {
  const db = getDb();

  // Pull up to 60 candidate facts ordered by base confidence
  const rows = db.prepare(`
    SELECT fact_type as type, fact_key as key, fact_value as value,
           confidence, created_at, last_referenced, reference_count
    FROM extracted_facts
    WHERE user_id = ?
    ORDER BY confidence DESC, reference_count DESC
    LIMIT 60
  `).all(userId) as Array<ExtractedFact & {
    created_at: string;
    last_referenced: string | null;
    reference_count: number;
  }>;

  const now = Date.now();
  const STALE_DAYS = 90;

  // Build keyword set from user message — only words longer than 3 chars
  const messageWords = new Set(
    userMessage.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  );

  const scored = rows.map(row => {
    // Recency: use last_referenced if available, otherwise created_at
    const dateStr = row.last_referenced || row.created_at;
    const ageDays = (now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);

    let recencyWeight: number;
    if (ageDays <= 7)        recencyWeight = 1.5;
    else if (ageDays <= 30)  recencyWeight = 1.2;
    else if (ageDays <= 90)  recencyWeight = 1.0;
    else if (ageDays <= 180) recencyWeight = 0.7;
    else                     recencyWeight = 0.4;

    // Relevance: keyword overlap between user message and fact value + key
    const factText = `${row.key} ${row.value}`.toLowerCase();
    const factWords = new Set(factText.split(/\W+/).filter(w => w.length > 3));
    const overlap = [...messageWords].filter(w => factWords.has(w)).length;
    const relevanceWeight = messageWords.size > 0
      ? 1.0 + Math.min(overlap * 0.25, 1.0)
      : 1.0;

    const score = row.confidence * recencyWeight * relevanceWeight;
    const isStale = ageDays > STALE_DAYS;

    return { ...row, score, isStale };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ created_at, last_referenced, reference_count, ...rest }) => rest);
}

/**
 * Mark a fact as confirmed by the user (resets stale status).
 * Call this when the user explicitly affirms an old fact is still true.
 */
export function confirmFact(factKey: string, userId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE extracted_facts
    SET last_referenced = ?,
        reference_count = reference_count + 1
    WHERE fact_key = ? AND user_id = ?
  `).run(new Date().toISOString(), factKey, userId);
}

/**
 * Update fact reference count (called when a fact is used in context)
 */
export async function recordFactReference(factKey: string, userId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE extracted_facts
    SET reference_count = reference_count + 1,
        last_referenced = ?
    WHERE fact_key = ? AND user_id = ?
  `);

  stmt.run(now, factKey, userId);
}

/**
 * Get all facts of a specific type
 */
export async function getFactsByType(
  factType: ExtractedFact['type'],
  limit: number = 20,
  userId: string
): Promise<ExtractedFact[]> {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT fact_type as type, fact_key as key, fact_value as value, confidence
    FROM extracted_facts
    WHERE fact_type = ? AND user_id = ?
    ORDER BY confidence DESC, reference_count DESC
    LIMIT ?
  `);

  return stmt.all(factType, userId, limit) as ExtractedFact[];
}

/**
 * Delete old, low-confidence facts that haven't been referenced
 *
 * @param olderThanDays - Delete facts older than this many days
 * @param maxConfidence - Only delete facts with confidence below this
 */
export async function cleanupStaleFacts(
  olderThanDays: number = 30,
  maxConfidence: number = 0.7,
  userId: string
): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const stmt = db.prepare(`
    DELETE FROM extracted_facts
    WHERE created_at < ?
      AND confidence < ?
      AND reference_count = 0
      AND user_id = ?
  `);

  const result = stmt.run(cutoffDate.toISOString(), maxConfidence, userId);
  console.log(`[FactExtraction] Cleaned up ${result.changes} stale facts`);
  return result.changes;
}

// ============================================================================
// Direct Fact Extraction (for explicit "remember" commands)
// ============================================================================

/**
 * Extract a fact from an explicit "remember that..." command.
 * Returns null if the message is not a remember command.
 *
 * This is a standalone function that can be called by the chat route
 * without going through the Gemini API.
 */
export function extractDirectFact(message: string, userId: string): ExtractedFact | null {
  const match = message.match(/^(?:remember|note|save)\s+(?:that\s+)?(.+)/i);
  if (!match) return null;

  const fact: ExtractedFact = {
    type: 'personal',
    key: `user_note_${Date.now()}`,
    value: match[1].trim(),
    confidence: 1.0,
  };

  console.log('[FactExtraction] Direct "remember" command detected:', fact.value);
  return fact;
}

// ============================================================================
// Export for use in chat route
// ============================================================================

export { formatConversation };
