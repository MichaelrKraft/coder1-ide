import { NextRequest, NextResponse } from 'next/server';
import { extractRequirementFromDataBuffer, validateExtraction } from '@/lib/requirement-extractor';
import { getTerminalDataBuffer, isInitialized } from '@/lib/server-terminal-access';

const QUALITY_PATTERNS: Record<string, RegExp> = {
  projectType: /(?:website|web app|mobile app|landing page|dashboard|api|rest api|graphql|backend|frontend|full[- ]?stack|system|platform|tool|application|service|microservice|portal|interface)/i,
  purpose: /(?:for|to help|to solve|to enable|because|users need|customers want|problem is|challenge is|goal is|objective|designed to|built to|allows|enables|provides)/i,
  features: /(?:with|including|needs?|should have|must have|requires?|feature|functionality|capability|can|able to|supports?|handles?|provides?|\band\b)/i,
  techStack: /(?:react|vue|angular|svelte|next\.?js|nuxt|gatsby|node\.?js|express|fastify|python|django|flask|fastapi|ruby|rails|php|laravel|java|spring|\.net|go|rust|typescript|javascript|html|css|tailwind|bootstrap|mongodb|postgres|mysql|redis|graphql|rest)/i,
  audience: /(?:users?|customers?|clients?|students?|members?|visitors?|people|audience|community|team|employees?|admins?|managers?|public|b2b|b2c|enterprise)/i,
  scope: /(?:small|large|simple|complex|basic|advanced|mvp|minimum viable product|prototype|proof of concept|poc|production|enterprise|scalable|starter|beginner|professional)/i
};

const CONTEXT_ADVICE: Record<string, string> = {
  projectType: "What are you building? (e.g., website, mobile app, API, dashboard)",
  purpose: "What problem does it solve? Who is it for?",
  features: "What key features or functionality should it have?",
  techStack: "Any technology preferences? (e.g., React, Python, Node.js)",
  audience: "Who will use this? (e.g., customers, students, internal team)",
  scope: "How big is this project? (e.g., MVP, prototype, full production app)"
};

function inlineAssessContextQuality(conversationContext: string) {
  console.log('[QUALITY-INLINE] assessContextQuality called with:', conversationContext?.substring(0, 100));
  
  if (!conversationContext || typeof conversationContext !== 'string') {
    console.log('[QUALITY-INLINE] No context provided, returning zero score');
    return {
      score: 0,
      passed: false,
      missingAspects: Object.keys(CONTEXT_ADVICE),
      breakdown: {},
      suggestions: Object.values(CONTEXT_ADVICE),
      aspectsDetected: 0,
      totalAspects: Object.keys(QUALITY_PATTERNS).length,
      threshold: 30
    };
  }

  const normalizedContext = conversationContext.toLowerCase();
  const breakdown: Record<string, boolean> = {};
  let aspectsDetected = 0;
  const totalAspects = Object.keys(QUALITY_PATTERNS).length;

  for (const [aspect, pattern] of Object.entries(QUALITY_PATTERNS)) {
    breakdown[aspect] = pattern.test(normalizedContext);
    if (breakdown[aspect]) {
      aspectsDetected++;
    }
  }

  const score = Math.round((aspectsDetected / totalAspects) * 100);
  const threshold = 30;
  const passed = score >= threshold;

  const missingAspects = Object.entries(breakdown)
    .filter(([_, present]) => !present)
    .map(([aspect]) => aspect);
  
  const suggestions = missingAspects.map(aspect => CONTEXT_ADVICE[aspect]);

  console.log('[QUALITY-INLINE] Assessment complete:', { score, passed, aspectsDetected, totalAspects });

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
 * POST /api/terminal/extract-requirement
 * 
 * Extract project requirement from terminal conversation history
 * Uses structured terminalDataBuffers with type discrimination
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({
        success: false,
        requirement: '',
        confidence: 'low',
        fallbackNeeded: true,
        error: 'Valid session ID is required',
        userMessages: [],
        conversationContext: ''
      }, { status: 400 });
    }

    if (!isInitialized()) {
      console.error('[Extract Requirement] Server buffers not initialized');
      return NextResponse.json({
        success: false,
        requirement: '',
        confidence: 'low',
        fallbackNeeded: true,
        error: 'Server buffers not initialized. This is a configuration issue.',
        userMessages: [],
        conversationContext: ''
      }, { status: 500 });
    }

    const buffer = getTerminalDataBuffer(sessionId);
    
    if (!buffer || buffer.length === 0) {
      console.warn(`[Extract Requirement] No buffer found for session: ${sessionId}`);
      return NextResponse.json({
        success: true,
        requirement: '',
        confidence: 'low',
        fallbackNeeded: true,
        message: 'No conversation history found. Start a conversation with Claude first.',
        userMessages: [],
        conversationContext: ''
      });
    }

    console.log(`[Extract Requirement] Processing ${buffer.length} buffer chunks for session ${sessionId}`);

    const result = extractRequirementFromDataBuffer(buffer);
    const validation = validateExtraction(result);
    const fallbackNeeded = result.confidence === 'low' || !validation.valid;
    
    // INLINED quality assessment - no import issues
    const contextToAssess = result.conversationContext || result.requirement;
    console.log('[Extract Requirement] Calling inlined quality assessment...');
    const quality = inlineAssessContextQuality(contextToAssess);
    
    console.log(`[Extract Requirement] Extraction result:`, {
      requirement: result.requirement.substring(0, 100),
      confidence: result.confidence,
      fallbackNeeded,
      validationReason: validation.reason,
      qualityScore: quality.score,
      qualityPassed: quality.passed
    });

    return NextResponse.json({
      success: true,
      requirement: result.requirement,
      confidence: result.confidence,
      fallbackNeeded,
      userMessages: result.userMessages,
      conversationContext: result.conversationContext,
      extractedFrom: result.extractedFrom,
      validation: validation.valid ? undefined : validation.reason,
      quality: {
        score: quality.score,
        passed: quality.passed,
        aspectsDetected: quality.aspectsDetected,
        totalAspects: quality.totalAspects,
        missingAspects: quality.missingAspects,
        suggestions: quality.suggestions
      }
    });
    
  } catch (error) {
    console.error('[Extract Requirement] Error:', error);
    
    return NextResponse.json({
      success: false,
      requirement: '',
      confidence: 'low',
      fallbackNeeded: true,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      userMessages: [],
      conversationContext: ''
    }, { status: 500 });
  }
}

/**
 * GET /api/terminal/extract-requirement
 * 
 * Get extraction status/health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'terminal-requirement-extraction',
    status: 'operational',
    buffersInitialized: isInitialized(),
    version: '2.0.0-inlined-quality'
  });
}
