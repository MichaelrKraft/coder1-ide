/**
 * API endpoint for getting Claude usage statistics
 * Tracks token usage per session
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// In-memory session metrics storage (in production, use a database)
const sessionMetrics = new Map<string, {
  inputTokens: number;
  outputTokens: number;
  commandCount: number;
  lastUpdate: number;
}>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required'
      });
    }
    
    // Get or create session metrics
    let metrics = sessionMetrics.get(sessionId);
    if (!metrics) {
      metrics = {
        inputTokens: 0,
        outputTokens: 0,
        commandCount: 0,
        lastUpdate: Date.now()
      };
      sessionMetrics.set(sessionId, metrics);
    }
    
    // Simulate token usage based on command count
    // In production, this would track actual API usage
    const estimatedInputTokens = metrics.commandCount * 150; // Avg ~150 tokens per command
    const estimatedOutputTokens = metrics.commandCount * 500; // Avg ~500 tokens per response
    
    // Calculate cost based on Claude pricing
    // Claude 3 Sonnet: $3 per million input tokens, $15 per million output tokens
    const inputCost = (estimatedInputTokens / 1000000) * 3;
    const outputCost = (estimatedOutputTokens / 1000000) * 15;
    const totalCost = inputCost + outputCost;
    
    return NextResponse.json({
      success: true,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      commandCount: metrics.commandCount,
      cost: totalCost,
      formattedCost: `$${totalCost.toFixed(4)}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get Claude usage:', error);
    return NextResponse.json({
      success: false,
      inputTokens: 0,
      outputTokens: 0,
      commandCount: 0,
      cost: 0,
      formattedCost: "$0.0000",
      error: 'Failed to retrieve usage data',
      timestamp: new Date().toISOString()
    });
  }
}

// Increment command counter or reset usage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, tokens } = body;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required'
      });
    }
    
    // Get or create session metrics
    let metrics = sessionMetrics.get(sessionId);
    if (!metrics) {
      metrics = {
        inputTokens: 0,
        outputTokens: 0,
        commandCount: 0,
        lastUpdate: Date.now()
      };
      sessionMetrics.set(sessionId, metrics);
    }
    
    if (action === 'increment') {
      // Increment command counter
      metrics.commandCount += 1;
      metrics.lastUpdate = Date.now();
      
      // If token counts provided, use them
      if (tokens) {
        metrics.inputTokens += tokens.input || 0;
        metrics.outputTokens += tokens.output || 0;
      }
      
      sessionMetrics.set(sessionId, metrics);
      
      return NextResponse.json({
        success: true,
        message: 'Command counter incremented',
        commandCount: metrics.commandCount
      });
    }
    
    if (action === 'reset') {
      // Reset the usage counter for this session
      sessionMetrics.set(sessionId, {
        inputTokens: 0,
        outputTokens: 0,
        commandCount: 0,
        lastUpdate: Date.now()
      });
      
      return NextResponse.json({
        success: true,
        message: 'Usage counter reset for session'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    });
  } catch (error) {
    logger.error('Failed to update usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update usage counter'
    });
  }
}