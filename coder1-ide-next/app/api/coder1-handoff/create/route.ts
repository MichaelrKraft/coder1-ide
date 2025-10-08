/* 
===============================================================================
Coder1 PRD Handoff - Create API
===============================================================================
File: app/api/coder1-handoff/create/route.ts
Purpose: Create handoff record for PRD-to-IDE transition
Status: PRODUCTION - Created: January 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';

// In-memory handoff storage (for demo - in production, use Redis or database)
const handoffs = (global as any).prdHandoffs || new Map();

// Initialize global handoffs if not exists
if (!(global as any).prdHandoffs) {
  (global as any).prdHandoffs = handoffs;
  
  // Simple handoff cleanup (remove handoffs older than 24 hours)
  setInterval(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [handoffId, handoff] of handoffs.entries()) {
      if ((handoff as any).createdAt < oneDayAgo) {
        handoffs.delete(handoffId);
      }
    }
  }, 60 * 60 * 1000); // Run cleanup every hour
}

function generateHandoffId(): string {
  return 'handoff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prdContent, sessionId, productName, patterns } = body;
    
    if (!prdContent) {
      return NextResponse.json({
        success: false,
        error: 'PRD content is required'
      }, { status: 400 });
    }
    
    const handoffId = generateHandoffId();
    const handoff = {
      id: handoffId,
      prdContent,
      sessionId: sessionId || null,
      productName: productName || 'New Product',
      patterns: patterns || [],
      status: 'created',
      createdAt: Date.now(),
      steps: [
        {
          id: 'create-session',
          title: 'Create Development Session',
          description: 'Setting up your Coder1 IDE session',
          status: 'pending'
        },
        {
          id: 'load-prd',
          title: 'Load PRD Context',
          description: 'Preparing your Product Requirements Document',
          status: 'pending'
        },
        {
          id: 'prepare-prompt',
          title: 'Prepare Claude Prompt',
          description: 'Formatting optimal prompt for Claude Code',
          status: 'pending'
        },
        {
          id: 'launch-ide',
          title: 'Launch IDE',
          description: 'Opening Coder1 IDE with full context',
          status: 'pending'
        }
      ]
    };
    
    handoffs.set(handoffId, handoff);
    
    console.log('🤝 PRD Handoff created:', {
      handoffId,
      productName,
      patternsCount: patterns?.length || 0,
      prdLength: prdContent.length
    });
    
    return NextResponse.json({
      success: true,
      handoff: {
        id: handoffId,
        steps: handoff.steps
      },
      message: 'Handoff created successfully'
    });
    
  } catch (error) {
    console.error('Handoff creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create handoff'
    }, { status: 500 });
  }
}
