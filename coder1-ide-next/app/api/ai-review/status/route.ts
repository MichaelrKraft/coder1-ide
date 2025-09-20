/**
 * AI Review Status API
 * 
 * Endpoint for checking the status of the AI review service
 * and retrieving usage statistics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { codeReviewService } from '@/services/code-review/code-review-service';

export async function GET(request: NextRequest) {
  try {
    // Get service status
    const status = await codeReviewService.getStatus();

    // Return status information
    return NextResponse.json({
      success: true,
      status: {
        available: status.available,
        version: status.version,
        stats: status.stats
      }
    });

  } catch (error: any) {
    console.error('AI Review Status API error:', error);

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get service status',
        message: error.message || 'Service unavailable'
      },
      { status: 503 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}