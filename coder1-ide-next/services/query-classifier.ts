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

export type QueryCategory = 'personal' | 'coding' | 'hybrid' | 'general' | 'session_recall' | 'deployment' | 'browser';

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

/**
 * Patterns that indicate deployment/platform management queries
 * These use the deployment-assistant skill via Composio
 */
const DEPLOYMENT_PATTERNS = [
  // Environment variables
  /\b(set|update|change|add|create)\s+(the\s+)?(env|environment)\s*(var|variable)?s?\b/i,
  /\b(env|environment)\s*(var|variable)?s?\s*(on|for|to)\b/i,
  /\bset\s+[A-Z_][A-Z0-9_]*\s*=/i, // Matches "set DATABASE_URL="
  /\b[A-Z_][A-Z0-9_]*\s*=\s*\S/i, // Matches "DATABASE_URL=value"

  // Platform names
  /\b(render|vercel|railway|supabase|fly\.io|heroku)\s+(service|dashboard|deploy|env)/i,
  /\b(on|to|from)\s+(my\s+)?(render|vercel|railway|supabase)\b/i,
  /\b(configure|setup|connect)\s+(render|vercel|railway|supabase)\b/i,

  // Deployment actions
  /\b(trigger|start|initiate)\s+(a\s+)?(deploy|deployment|redeploy)\b/i,
  /\bdeploy\s+(to|on)\s+(render|vercel|production|staging)\b/i,
  /\bredeploy\s+(the\s+)?(service|app|application)\b/i,

  // Service management
  /\b(list|show|view)\s+(my\s+)?(render|vercel)?\s*services?\b/i,
  /\b(show|list|view)\s+(env|environment)\s*(vars?|variables?)?\b/i,
  /\b(delete|remove|clear)\s+(env|environment)\s*(var|variable)?\b/i,

  // Visual mode triggers
  /\b(show me|let me watch|do it visually)\b/i,
  /\b(open|show)\s+(the\s+)?(render|vercel)\s+dashboard\b/i,
];

/**
 * Patterns that indicate browser automation queries
 * These require Bridge mode for claude-in-chrome MCP tools
 */
const BROWSER_PATTERNS = [
  // Navigation commands
  /\b(go to|navigate to|visit|open|browse)\s+(https?:\/\/)?[\w.-]+/i,
  /\b(open|show me|check out)\s+(the\s+)?(website|site|page)\b/i,

  // Interaction commands
  /\b(click|tap|press)\s+(on\s+)?(the\s+)?\w+/i,
  /\b(fill|type|enter)\s+(in\s+)?(the\s+)?\w+/i,
  /\b(screenshot|capture|snap)\s*(the\s+)?(page|screen|website)?\b/i,
  /\btake\s+a?\s*screenshot\b/i,

  // General browser context
  /\b(in the browser|on the page|web page|webpage)\b/i,
  /\b(browser automation|automate the browser)\b/i,
  /\bwhat('s| is) on\s+(the\s+)?(page|site|website)\b/i,
  /\b(scrape|extract)\s+(data\s+)?(from\s+)?(the\s+)?(page|site|website)\b/i,
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
 * Short confirmation patterns — these inherit the previous message's mode
 * to maintain conversation continuity (e.g., user says "ok" after Johnny5
 * offers to do something in bridge mode → stay in bridge mode)
 */
const CONFIRMATION_PATTERNS = [
  /^(ok|okay|yes|yeah|yep|yup|sure|go ahead|do it|please|go for it|sounds good|let's do it|lets do it|proceed|confirm|affirmative|alright|right|got it|cool|perfect|great|awesome|absolutely|definitely|for sure|why not|bet)\.?!?$/i,
];

/**
 * Classify a user query to determine optimal routing
 *
 * @param message - The user's message to classify
 * @param previousMode - The mode used for the previous response (for conversation continuity)
 * @returns Classification result with routing recommendation
 */
export function classifyQuery(message: string, previousMode?: 'bridge' | 'gemini' | 'j5'): ClassificationResult {
  const normalizedMessage = message.toLowerCase().trim();

  // Short confirmations inherit the previous mode to maintain conversation continuity.
  // Without this, "ok" gets classified as 'general' and rerouted to Gemini even when
  // the user is confirming a bridge-mode action.
  if (previousMode && CONFIRMATION_PATTERNS.some(p => p.test(normalizedMessage))) {
    const useBridge = previousMode === 'bridge' || previousMode === 'j5';
    return {
      category: useBridge ? 'coding' : 'general',
      confidence: 0.8,
      shouldUseBridge: useBridge,
      reasoning: `Short confirmation — continuing in ${previousMode} mode from previous message.`,
      matchedPatterns: [normalizedMessage],
    };
  }

  // Match against all pattern categories
  const personalMatches = matchPatterns(normalizedMessage, PERSONAL_PATTERNS);
  const codingMatches = matchPatterns(normalizedMessage, CODING_PATTERNS);
  const hybridMatches = matchPatterns(normalizedMessage, HYBRID_PATTERNS);
  const sessionRecallMatches = matchPatterns(normalizedMessage, SESSION_RECALL_PATTERNS);
  const deploymentMatches = matchPatterns(normalizedMessage, DEPLOYMENT_PATTERNS);
  const browserMatches = matchPatterns(normalizedMessage, BROWSER_PATTERNS);

  // Calculate confidence scores
  const personalConfidence = calculateConfidence(personalMatches, message.length);
  const codingConfidence = calculateConfidence(codingMatches, message.length);
  const hybridConfidence = calculateConfidence(hybridMatches, message.length);
  const sessionRecallConfidence = calculateConfidence(sessionRecallMatches, message.length);
  const deploymentConfidence = calculateConfidence(deploymentMatches, message.length);
  const browserConfidence = calculateConfidence(browserMatches, message.length);

  console.log('[QueryClassifier] Scores:', {
    browser: browserConfidence.toFixed(2),
    deployment: deploymentConfidence.toFixed(2),
    sessionRecall: sessionRecallConfidence.toFixed(2),
    personal: personalConfidence.toFixed(2),
    coding: codingConfidence.toFixed(2),
    hybrid: hybridConfidence.toFixed(2),
    browserMatches,
    deploymentMatches,
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

  // Check deployment queries (manages env vars, deploys via Composio)
  if (deploymentConfidence > 0.3) {
    return {
      category: 'deployment',
      confidence: deploymentConfidence,
      shouldUseBridge: false, // Uses Composio/Gemini, not Bridge
      reasoning: 'Deployment platform query. Using deployment-assistant skill to manage env vars and deploys.',
      matchedPatterns: deploymentMatches,
    };
  }

  // Check browser queries - route to Bridge for claude-in-chrome MCP tools
  if (browserConfidence > 0.3) {
    return {
      category: 'browser',
      confidence: browserConfidence,
      shouldUseBridge: true, // Bridge has claude-in-chrome MCP tools
      reasoning: 'Browser automation query. Using Bridge mode for claude-in-chrome MCP tools.',
      matchedPatterns: browserMatches,
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

/**
 * Quick check if a query is definitely deployment-related
 */
export function isDefinitelyDeploymentQuery(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();

  // Very strong deployment indicators
  const strongDeploymentPatterns = [
    /\bset\s+[A-Z_][A-Z0-9_]*\s*=/i, // "set DATABASE_URL="
    /\b(env|environment)\s*(var|variable)s?\s+(on|for)\s+(render|vercel|supabase)/i,
    /\b(deploy|redeploy)\s+(to|on)\s+(render|vercel|production)/i,
    /\b(connect|configure)\s+(my\s+)?(render|vercel|supabase)\s+account/i,
    /\bshow\s+(my\s+)?(env|environment)\s*(vars?|variables?)/i,
  ];

  return strongDeploymentPatterns.some(p => p.test(normalizedMessage));
}

/**
 * Quick check if a query is definitely browser-related
 */
export function isDefinitelyBrowserQuery(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();

  // Very strong browser indicators
  const strongBrowserPatterns = [
    /\b(go to|navigate to|visit)\s+(https?:\/\/)?[\w.-]+\.(com|org|net|io|dev|app|co)/i,
    /\btake\s+a?\s*screenshot\b/i,
    /\bopen\s+(the\s+)?(url|website|link)\b/i,
    /\b(click|fill|type)\s+(on\s+)?(the\s+)?[\w]+\s+(button|input|field|form)\b/i,
  ];

  return strongBrowserPatterns.some(p => p.test(normalizedMessage));
}
