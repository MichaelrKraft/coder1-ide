/* 
===============================================================================
Smart PRD Generator - Sessions API
===============================================================================
File: app/api/smart-prd/sessions/route.ts
Purpose: Session management for Smart PRD Generator questionnaire
Status: PRODUCTION - Created: January 20, 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';

// In-memory session storage (for demo - in production, use Redis or database)
const sessions = new Map();

// Simple session cleanup (remove sessions older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [sessionId, session] of sessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      sessions.delete(sessionId);
    }
  }
}, 15 * 60 * 1000); // Run cleanup every 15 minutes

function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userContext } = body;
    
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      userContext: userContext || {},
      answers: [],
      currentQuestionIndex: 0,
      selectedPattern: null,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    sessions.set(sessionId, session);
    
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session created successfully'
    });
    
  } catch (error) {
    console.error('Session creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      session
    });
    
  } catch (error) {
    console.error('Session retrieval error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve session'
    }, { status: 500 });
  }
}