/**
 * Context Quality Assessor
 * 
 * Evaluates the quality of conversation context before spawning AI Team agents.
 * Prevents low-quality agent spawns by ensuring sufficient project details are present.
 * 
 * Quality Dimensions:
 * - Project Type: What is being built (website, app, API, etc.)
 * - Purpose: Why it's being built, what problem it solves
 * - Features: Key functionality and requirements
 * - Tech Stack: Technology preferences or constraints
 * - Audience: Target users or customers
 * - Scope: Project size and complexity
 */

/**
 * User-friendly guidance for missing context aspects
 */
const CONTEXT_ADVICE = {
  projectType: "What are you building? (e.g., website, mobile app, API, dashboard)",
  purpose: "What problem does it solve? Who is it for?",
  features: "What key features or functionality should it have?",
  techStack: "Any technology preferences? (e.g., React, Python, Node.js)",
  audience: "Who will use this? (e.g., customers, students, internal team)",
  scope: "How big is this project? (e.g., MVP, prototype, full production app)"
};

/**
 * Pattern definitions for each quality dimension
 */
const QUALITY_PATTERNS = {
  // Project type indicators
  projectType: /(?:website|web app|mobile app|landing page|dashboard|api|rest api|graphql|backend|frontend|full[- ]?stack|system|platform|tool|application|service|microservice|portal|interface)/i,
  
  // Purpose and problem-solving indicators
  purpose: /(?:for|to help|to solve|to enable|because|users need|customers want|problem is|challenge is|goal is|objective|designed to|built to|allows|enables|provides)/i,
  
  // Features and requirements
  features: /(?:with|including|needs?|should have|must have|requires?|feature|functionality|capability|can|able to|supports?|handles?|provides?|\band\b)/i,
  
  // Technology stack mentions
  techStack: /(?:react|vue|angular|svelte|next\.?js|nuxt|gatsby|node\.?js|express|fastify|python|django|flask|fastapi|ruby|rails|php|laravel|java|spring|\.net|go|rust|typescript|javascript|html|css|tailwind|bootstrap|mongodb|postgres|mysql|redis|graphql|rest)/i,
  
  // Audience and users
  audience: /(?:users?|customers?|clients?|students?|members?|visitors?|people|audience|community|team|employees?|admins?|managers?|public|b2b|b2c|enterprise)/i,
  
  // Scope and scale
  scope: /(?:small|large|simple|complex|basic|advanced|mvp|minimum viable product|prototype|proof of concept|poc|production|enterprise|scalable|starter|beginner|professional)/i
};

/**
 * Assess the quality of conversation context
 * 
 * @param {string} conversationContext - Full conversation history as string
 * @returns {{
 *   score: number,
 *   passed: boolean,
 *   missingAspects: string[],
 *   breakdown: Object<string, boolean>,
 *   suggestions: string[]
 * }}
 */
function assessContextQuality(conversationContext) {
  // Validate input
  if (!conversationContext || typeof conversationContext !== 'string') {
    return {
      score: 0,
      passed: false,
      missingAspects: Object.keys(CONTEXT_ADVICE),
      breakdown: {},
      suggestions: Object.values(CONTEXT_ADVICE)
    };
  }

  // Normalize context for better matching
  const normalizedContext = conversationContext.toLowerCase();
  
  // Test each quality dimension
  const breakdown = {};
  let aspectsDetected = 0;
  const totalAspects = Object.keys(QUALITY_PATTERNS).length;

  for (const [aspect, pattern] of Object.entries(QUALITY_PATTERNS)) {
    breakdown[aspect] = pattern.test(normalizedContext);
    if (breakdown[aspect]) {
      aspectsDetected++;
    }
  }

  // Calculate score (0-100)
  const score = Math.round((aspectsDetected / totalAspects) * 100);
  
  // Determine if quality threshold is met (30% = 2/6 aspects) - TEMP: lowered for alpha testing
  const threshold = 30;
  const passed = score >= threshold;

  // Generate list of missing aspects with user-friendly advice
  const missingAspects = Object.entries(breakdown)
    .filter(([_, present]) => !present)
    .map(([aspect, _]) => aspect);
  
  const suggestions = missingAspects.map(aspect => CONTEXT_ADVICE[aspect]);

  return {
    score,
    passed,
    missingAspects,
    breakdown,
    suggestions,
    aspectsDetected,
    totalAspects,
    threshold
  };
}

/**
 * Generate user-friendly quality report
 * 
 * @param {{score: number, passed: boolean, suggestions: string[]}} assessment
 * @returns {string} Formatted report for terminal display
 */
function formatQualityReport(assessment) {
  const lines = [];
  
  if (assessment.passed) {
    lines.push(`✅ Context Quality: ${assessment.score}% (${assessment.aspectsDetected}/${assessment.totalAspects} aspects detected)`);
    lines.push('Context is sufficient for AI Team spawning.');
  } else {
    lines.push(`⚠️ Context Quality: ${assessment.score}% (needs ${assessment.threshold}% minimum)`);
    lines.push(`Detected: ${assessment.aspectsDetected}/${assessment.totalAspects} aspects`);
    lines.push('');
    lines.push('💡 To improve context, please discuss:');
    assessment.suggestions.forEach((suggestion, i) => {
      lines.push(`   ${i + 1}. ${suggestion}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Get quality assessment with recommendation
 * 
 * @param {string} conversationContext - Full conversation history
 * @returns {{
 *   quality: Object,
 *   recommendation: 'spawn'|'improve'|'reject',
 *   message: string
 * }}
 */
function getQualityRecommendation(conversationContext) {
  const quality = assessContextQuality(conversationContext);
  
  let recommendation;
  let message;
  
  if (quality.passed) {
    recommendation = 'spawn';
    message = 'Context quality is sufficient. Proceeding with AI Team spawn.';
  } else if (quality.score >= 30) {
    recommendation = 'improve';
    message = 'Context is present but could be improved. Consider providing more details for better AI Team results.';
  } else {
    recommendation = 'reject';
    message = 'Insufficient context. Please have a conversation with Claude about your project first.';
  }
  
  return {
    quality,
    recommendation,
    message
  };
}

/**
 * Validate that context has minimum length
 * 
 * @param {string} conversationContext
 * @returns {boolean}
 */
function hasMinimumLength(conversationContext) {
  if (!conversationContext || typeof conversationContext !== 'string') {
    return false;
  }
  
  // Require at least 50 characters of actual content
  const cleaned = conversationContext.trim();
  return cleaned.length >= 50;
}

module.exports = {
  assessContextQuality,
  formatQualityReport,
  getQualityRecommendation,
  hasMinimumLength,
  CONTEXT_ADVICE,
  QUALITY_PATTERNS
};
