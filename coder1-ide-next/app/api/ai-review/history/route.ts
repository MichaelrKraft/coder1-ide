/**
 * AI Review History API
 * 
 * Endpoint for retrieving the history of code reviews
 * performed during the current session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// In-memory storage for review history (in production, use database)
const reviewHistory: Array<{
  id: string;
  timestamp: Date;
  summary: any;
  filesReviewed: number;
  issuesFound: number;
}> = [];

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get history from memory (or database in production)
    const totalCount = reviewHistory.length;
    const items = reviewHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      history: items,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error: any) {
    console.error('AI Review History API error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to get review history',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Add a review to history
    const body = await request.json();
    
    const historyEntry = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      summary: body.summary,
      filesReviewed: body.filesReviewed || 0,
      issuesFound: body.issuesFound || 0
    };

    reviewHistory.push(historyEntry);

    // Keep only last 100 reviews in memory
    if (reviewHistory.length > 100) {
      reviewHistory.shift();
    }

    return NextResponse.json({
      success: true,
      entry: historyEntry
    });

  } catch (error: any) {
    console.error('AI Review History POST error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to add to history',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}