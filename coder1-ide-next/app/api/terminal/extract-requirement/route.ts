import { NextRequest, NextResponse } from 'next/server';
import { extractRequirementFromDataBuffer, validateExtraction } from '@/lib/requirement-extractor';
import { getTerminalDataBuffer, isInitialized } from '@/lib/server-terminal-access';

/**
 * POST /api/terminal/extract-requirement
 * 
 * Extract project requirement from terminal conversation history
 * Uses structured terminalDataBuffers with type discrimination
 * 
 * Request body:
 * {
 *   sessionId: string - Terminal session ID
 * }
 * 
 * Response:
 * {
 *   requirement: string - Extracted requirement
 *   confidence: 'high' | 'medium' | 'low' - Confidence score
 *   fallbackNeeded: boolean - Whether user input is needed
 *   userMessages: string[] - All user inputs from conversation
 *   conversationContext: string - Full conversation context
 *   extractedFrom?: string - The actual line that matched
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    // Validate session ID
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

    // Check if server buffers are initialized
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

    // Get terminal data buffer for this session
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

    // Extract requirement from buffer
    const result = extractRequirementFromDataBuffer(buffer);
    
    // Validate extraction quality
    const validation = validateExtraction(result);
    
    // Determine if fallback is needed
    const fallbackNeeded = result.confidence === 'low' || !validation.valid;
    
    console.log(`[Extract Requirement] Extraction result:`, {
      requirement: result.requirement.substring(0, 100),
      confidence: result.confidence,
      fallbackNeeded,
      validationReason: validation.reason
    });

    return NextResponse.json({
      success: true,
      requirement: result.requirement,
      confidence: result.confidence,
      fallbackNeeded,
      userMessages: result.userMessages,
      conversationContext: result.conversationContext,
      extractedFrom: result.extractedFrom,
      validation: validation.valid ? undefined : validation.reason
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
    version: '1.0.0'
  });
}
