/**
 * Query Classifier Service for Johnny5
 *
 * Classifies user queries to determine the optimal routing:
 * - Personal queries → Gemini mode (respects memory context)
 * - Coding queries → Bridge mode (project awareness via Claude Code CLI)
 * - Hybrid queries → Gemini mode with coding context
 *
 * This solves the problem where Bridge mode ignores injected memory context
 * because Claude Code CLI prioritizes its own project context.
 */

// ============================================================================
// Types
// ============================================================================

export type QueryCategory = 'personal' | 'coding' | 'hybrid' | 'general' | 'session_recall';

export interface ClassificationResult {
  category: QueryCategory;
  confidence: number;
  shouldUseBridge: boolean;
  reasoning: string;
  matchedPatterns: string[];
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Patterns that indicate personal/memory-related queries
 * These should ALWAYS use Gemini mode to respect memory context
 */
const PERSONAL_PATTERNS = [
  // Direct memory queries
  /\b(what do you know|what do you remember|tell me about me|about me)\b/i,
  /\b(my (favorite|favourite)|my name|my preference|my project)\b/i,
  /\b(do you (know|remember)|have you (learned|memorized))\b/i,

  // Personal information
  /\b(my (color|colour|food|movie|music|hobby|hobbies|interest|interests))\b/i,
  /\b(my (job|role|title|company|team|work))\b/i,
  /\b(my (goal|goals|objective|objectives|plan|plans))\b/i,
  /\b(my (style|preference|approach|workflow))\b/i,

  // Questions about user
  /\bwho am i\b/i,
  /\bwhat('s| is) my\b/i,
  /\bhow do i (like|prefer|usually)\b/i,
  /\bdo i (like|prefer|use|work)\b/i,

  // Memory test questions
  /\bremember (when|that|what)\b/i,
  /\blast time (we|i)\b/i,
  /\byou know me\b/i,
  /\b(recall|recollect)\b/i,
];

/**
 * Patterns that indicate coding/development queries
 * These benefit from Bridge mode's project awareness
 */
const CODING_PATTERNS = [
  // Code operations
  /\b(write|create|generate|implement|build|code|develop)\s+(a |the |some )?(function|class|component|module|api|service|test|hook)\b/i,
  /\b(fix|debug|solve|resolve|patch)\s+(the |this |a )?(bug|error|issue|problem|crash)\b/i,
  /\b(refactor|optimize|improve|clean up)\s+(the |this )?(code|function|component)\b/i,

  // File operations
  /\b(read|edit|modify|update|change|delete|create)\s+(the |this |a )?(file|files)\b/i,
  /\b(find|search|look for|locate)\s+(the |a |this )?(file|function|class|component|import)\b/i,

  // Git/VCS operations
  /\b(commit|push|pull|merge|branch|rebase|stash|checkout)\b/i,
  /\b(git|github|gitlab|version control)\b/i,

  // Build/deployment
  /\b(build|compile|deploy|run|start|stop|restart|test)\s+(the |this )?(app|project|server|tests?)\b/i,
  /\b(npm|yarn|pnpm|pip|cargo|gradle|maven)\s+(install|run|build|test|start)\b/i,

  // Debugging/analysis
  /\b(analyze|examine|inspect|review)\s+(the |this )?(code|codebase|project|architecture)\b/i,
  /\bwhat('s| is) (wrong with|the issue|the error|causing)\b/i,
  /\bwhy (is|does|isn't|doesn't)\s+(it|the|this)\b/i,

  // Technical questions about code
  /\bhow (does|do)\s+(this|the|that)\s+(work|function|operate)\b/i,
  /\bexplain\s+(this|the|that)\s+(code|function|component|logic)\b/i,
];

/**
 * Patterns that indicate hybrid queries (personal context + coding)
 * These use Gemini to respect memory but may include technical context
 */
const HYBRID_PATTERNS = [
  // Personal preferences in code context
  /\b(how do i usually|what's my preferred|my coding style)\b/i,
  /\b(based on my|according to my|using my)\s+(preference|style|approach)\b/i,

  // Project-related personal questions
  /\bmy (current )?project\b/i,
  /\bwhat am i (working on|building|developing)\b/i,
  /\bwhat('s| is) my (tech |technology )?(stack|setup)\b/i,
];

/**
 * Patterns that indicate session recall queries
 * These search through past coding sessions for specific events/context
 */
const SESSION_RECALL_PATTERNS = [
  /\b(remember when|remember that time|that time when)\b/i,
  /\b(what (files?|changes?) did I)\b/i,
  /\b(what did I (do|work on|change|fix|build|implement))\b/i,
  /\b(last (session|time) (I|we))\b/i,
  /\b(show me|find) (my|the) (history|sessions?|changes?)\b/i,
  /\b(what happened|what was I doing)\b/i,
  /\b(in that session|during that|back when I)\b/i,
  /\b(what errors? did I (hit|get|encounter))\b/i,
  /\b(what commands? did I (run|execute|use))\b/i,
  /\b(which (files?|projects?) did I)\b/i,
  /\b(what (files?|changes?) did I (recently\s+)?commit)\b/i,
  /\bwhat\s+did\s+I\s+(commit|push|deploy|merge)\b/i,
  /\b(my|our|recent|last)\s+(commit|commits)\b/i,
];

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Check if message matches any pattern in a list
 */
function matchPatterns(message: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Calculate confidence score based on matches and message length
 */
function calculateConfidence(matches: string[], messageLength: number): number {
  if (matches.length === 0) return 0;

  // Base confidence from number of matches
  const matchConfidence = Math.min(0.9, 0.5 + (matches.length * 0.15));

  // Boost for shorter messages (more likely to be direct queries)
  const lengthBoost = messageLength < 50 ? 0.1 : (messageLength < 100 ? 0.05 : 0);

  return Math.min(0.95, matchConfidence + lengthBoost);
}

/**
 * Classify a user query to determine optimal routing
 *
 * @param message - The user's message to classify
 * @returns Classification result with routing recommendation
 */
export function classifyQuery(message: string): ClassificationResult {
  const normalizedMessage = message.toLowerCase().trim();

  // Match against all pattern categories
  const personalMatches = matchPatterns(normalizedMessage, PERSONAL_PATTERNS);
  const codingMatches = matchPatterns(normalizedMessage, CODING_PATTERNS);
  const hybridMatches = matchPatterns(normalizedMessage, HYBRID_PATTERNS);
  const sessionRecallMatches = matchPatterns(normalizedMessage, SESSION_RECALL_PATTERNS);

  // Calculate confidence scores
  const personalConfidence = calculateConfidence(personalMatches, message.length);
  const codingConfidence = calculateConfidence(codingMatches, message.length);
  const hybridConfidence = calculateConfidence(hybridMatches, message.length);
  const sessionRecallConfidence = calculateConfidence(sessionRecallMatches, message.length);

  console.log('[QueryClassifier] Scores:', {
    sessionRecall: sessionRecallConfidence.toFixed(2),
    personal: personalConfidence.toFixed(2),
    coding: codingConfidence.toFixed(2),
    hybrid: hybridConfidence.toFixed(2),
    sessionRecallMatches,
    personalMatches,
    codingMatches,
    hybridMatches,
  });

  // Check session recall first (more specific than personal)
  if (sessionRecallConfidence > 0.3) {
    return {
      category: 'session_recall',
      confidence: sessionRecallConfidence,
      shouldUseBridge: false, // MUST use Gemini - Bridge ignores memory context
      reasoning: 'Session recall query. Using Gemini to search and present session history.',
      matchedPatterns: sessionRecallMatches,
    };
  }

  // Determine category based on highest confidence
  // Personal queries take priority if they match (memory is critical)
  if (personalConfidence > 0.3 && personalConfidence >= codingConfidence) {
    return {
      category: 'personal',
      confidence: personalConfidence,
      shouldUseBridge: false, // Always use Gemini for personal queries
      reasoning: 'Query appears to be about personal information or memory recall. Using Gemini to respect memory context.',
      matchedPatterns: personalMatches,
    };
  }

  // Hybrid queries also prefer Gemini
  if (hybridConfidence > 0.3 && hybridConfidence > codingConfidence) {
    return {
      category: 'hybrid',
      confidence: hybridConfidence,
      shouldUseBridge: false, // Use Gemini for hybrid queries
      reasoning: 'Query combines personal context with technical aspects. Using Gemini to respect memory while providing technical help.',
      matchedPatterns: hybridMatches,
    };
  }

  // Coding queries benefit from Bridge
  if (codingConfidence > 0.3) {
    return {
      category: 'coding',
      confidence: codingConfidence,
      shouldUseBridge: true, // Use Bridge for coding tasks
      reasoning: 'Query is about coding, files, or development tasks. Using Bridge for project context awareness.',
      matchedPatterns: codingMatches,
    };
  }

  // General queries - default to Gemini to ensure memory is respected
  // This is a key design decision: when uncertain, prefer memory over project context
  return {
    category: 'general',
    confidence: 0.5,
    shouldUseBridge: false, // Default to Gemini for general queries
    reasoning: 'Query type unclear. Defaulting to Gemini to ensure memory context is respected.',
    matchedPatterns: [],
  };
}

/**
 * Quick check if a query is definitely personal
 * Faster than full classification for simple checks
 */
export function isDefinitelyPersonalQuery(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();

  // Very strong personal indicators
  const strongPersonalPatterns = [
    /\bmy (favorite|favourite|name)\b/i,
    /\bwhat do you (know|remember) about me\b/i,
    /\bwho am i\b/i,
    /\bdo you remember\b/i,
  ];

  return strongPersonalPatterns.some(p => p.test(normalizedMessage));
}

/**
 * Quick check if a query is definitely coding-related
 */
export function isDefinitelyCodingQuery(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();

  // Very strong coding indicators
  const strongCodingPatterns = [
    /\b(write|create|generate|implement)\s+(a |the )?(function|class|component|api)\b/i,
    /\b(fix|debug)\s+(the |this )?(bug|error)\b/i,
    /\bgit\s+(commit|push|pull|merge)\b/i,
    /\bnpm\s+(install|run|build)\b/i,
  ];

  return strongCodingPatterns.some(p => p.test(normalizedMessage));
}
