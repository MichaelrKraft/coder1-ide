/* 
===============================================================================
Coder1 PRD Handoff - Launch IDE API
===============================================================================
File: app/api/coder1-handoff/[id]/launch-ide/route.ts
Purpose: Mark handoff as launched and provide IDE URL
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

export async function POST(
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
    
    // Update handoff status
    handoff.status = 'launched';
    handoff.launchedAt = Date.now();
    
    // Update all steps to completed
    handoff.steps = handoff.steps.map((step: any) => ({
      ...step,
      status: 'completed'
    }));
    
    handoffs.set(id, handoff);
    
    // Construct IDE URL with handoff parameter
    const ideUrl = `/ide?prdHandoff=${id}`;
    
    console.log('🚀 IDE launch initiated:', {
      handoffId: id,
      productName: handoff.productName,
      ideUrl
    });
    
    return NextResponse.json({
      success: true,
      ideUrl,
      handoff: {
        id: handoff.id,
        productName: handoff.productName,
        status: handoff.status,
        steps: handoff.steps
      },
      message: 'IDE launch URL ready'
    });
    
  } catch (error) {
    console.error('IDE launch error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to launch IDE'
    }, { status: 500 });
  }
}
