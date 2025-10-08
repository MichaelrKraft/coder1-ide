/* 
===============================================================================
Coder1 PRD Handoff - Retrieval API
===============================================================================
File: app/api/coder1-handoff/[id]/route.ts
Purpose: Retrieve handoff data by ID for IDE consumption
Status: PRODUCTION - Created: January 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';

// Import the handoffs map from the parent route
const handoffs = (global as any).prdHandoffs || new Map();

// Initialize global handoffs if not exists
if (!(global as any).prdHandoffs) {
  (global as any).prdHandoffs = handoffs;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Handoff ID is required'
      }, { status: 400 });
    }
    
    const handoff = handoffs.get(id);
    
    if (!handoff) {
      return NextResponse.json({
        success: false,
        error: 'Handoff not found or expired'
      }, { status: 404 });
    }
    
    console.log('📥 Handoff retrieved:', {
      handoffId: id,
      productName: handoff.productName,
      age: Math.round((Date.now() - handoff.createdAt) / 1000) + 's'
    });
    
    return NextResponse.json({
      success: true,
      handoff: {
        id: handoff.id,
        prdContent: handoff.prdContent,
        productName: handoff.productName,
        patterns: handoff.patterns,
        sessionId: handoff.sessionId,
        createdAt: handoff.createdAt
      }
    });
    
  } catch (error) {
    console.error('Handoff retrieval error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve handoff'
    }, { status: 500 });
  }
}
