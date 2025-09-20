/**
 * AI Review Analysis API
 * 
 * Endpoint for triggering Coder1 AI code reviews.
 * This is the server-side API that the frontend can call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { codeReviewService } from '@/services/code-review/code-review-service';
import { z } from 'zod';

// Request validation schema
const reviewRequestSchema = z.object({
  files: z.array(z.string()).optional(),
  staged: z.boolean().optional(),
  unstaged: z.boolean().optional(),
  commit: z.string().optional(),
  autoFix: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request
    const validationResult = reviewRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const options = validationResult.data;

    // Initialize service if needed
    if (!codeReviewService.isAvailable()) {
      await codeReviewService.initialize();
    }

    // Perform the review
    const result = await codeReviewService.reviewCode(options);

    // Return successful response
    return NextResponse.json({
      success: true,
      result: {
        source: result.source,
        timestamp: result.timestamp,
        summary: result.summary,
        issues: result.issues,
        metrics: result.metrics,
        confidence: result.confidence
      }
    });

  } catch (error: any) {
    console.error('AI Review API error:', error);

    // Check if it's an initialization error
    if (error.message?.includes('not available')) {
      return NextResponse.json(
        { 
          error: 'AI Review service is not available',
          message: 'Please ensure the review engine is properly configured'
        },
        { status: 503 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to perform code review',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}