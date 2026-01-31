/**
 * Johnny5 Prompt Injection Alerts API
 *
 * GET /api/johnny5/security/alerts - Returns REAL prompt injection alerts
 * POST /api/johnny5/security/alerts - Report a new potential injection attempt
 *
 * This is a KEY DIFFERENTIATOR for Johnny5 - transparent security monitoring
 * that shows users when and how prompt injection attempts are detected and blocked.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5PaginatedResponse,
  Johnny5PromptInjectionAlert
} from '@/types/johnny5';
import { getPromptInjectionAlerts, checkForPromptInjection } from '@/services/johnny5/security-tracker';

// Force dynamic rendering - alerts can arrive at any time
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // Get REAL alerts from security tracker
    const alerts = getPromptInjectionAlerts(100); // Get up to 100

    // Paginate
    const total = alerts.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedAlerts = alerts.slice(startIndex, startIndex + pageSize);

    const response: Johnny5APIResponse<Johnny5PaginatedResponse<Johnny5PromptInjectionAlert>> = {
      success: true,
      data: {
        items: paginatedAlerts,
        total,
        page,
        pageSize,
        hasMore: startIndex + pageSize < total
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Security Alerts API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST handler to check text for prompt injection and report if detected
 * This can be called to manually check content for injection patterns
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { text, source } = body;

    if (!text || !source) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required fields: text, source',
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate source
    const validSources = ['email', 'file', 'terminal', 'api', 'unknown'];
    if (!validSources.includes(source)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Invalid source. Must be one of: ${validSources.join(', ')}`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check for prompt injection using real security tracker
    const alert = checkForPromptInjection(text, source);

    if (alert) {
      console.log(`[Johnny5 Security] Prompt injection detected from ${source}`);

      const response: Johnny5APIResponse<Johnny5PromptInjectionAlert> = {
        success: true,
        data: alert,
        timestamp: new Date()
      };

      return NextResponse.json(response, { status: 201 });
    }

    // No injection detected
    const response: Johnny5APIResponse<null> = {
      success: true,
      data: null,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Security Alerts API] POST Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check for injection',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
