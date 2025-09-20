/**
 * AI Review Fix API
 * 
 * Endpoint for applying automatic fixes to code issues
 * detected by the AI review system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { codeReviewService } from '@/services/code-review/code-review-service';
import { z } from 'zod';

// Request validation schema
const fixRequestSchema = z.object({
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning', 'info', 'suggestion']),
    category: z.string(),
    file: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
    message: z.string(),
    suggestion: z.string().optional(),
    autoFixAvailable: z.boolean().optional()
  }))
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request
    const validationResult = fixRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { issues } = validationResult.data;

    // Check if service is available
    if (!codeReviewService.isAvailable()) {
      await codeReviewService.initialize();
    }

    // Apply fixes
    const result = await codeReviewService.applyFixes(issues);

    // Return results
    return NextResponse.json({
      success: true,
      fixed: result.fixed,
      failed: result.failed,
      results: result.results
    });

  } catch (error: any) {
    console.error('AI Fix API error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to apply fixes',
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