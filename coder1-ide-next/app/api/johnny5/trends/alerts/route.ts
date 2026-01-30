/**
 * Johnny5 Trend Alerts API
 *
 * GET /api/johnny5/trends/alerts - Returns trend alerts with filtering/pagination
 * POST /api/johnny5/trends/alerts - Dismiss an alert or take action
 *
 * Trend alerts are opportunities detected from monitoring X, GitHub,
 * HackerNews, and competitor websites.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5PaginatedResponse,
  Johnny5TrendAlert,
} from '@/types/johnny5';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Generate mock alerts
function generateMockAlerts(): Johnny5TrendAlert[] {
  const now = new Date();

  return [
    {
      id: 'trend-001',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000),
      source: 'x',
      title: '@levelsio just launched Photo AI 2.0',
      description:
        'New version includes AI-powered background removal and style transfer. Getting massive engagement with 2.5k likes in first hour.',
      url: 'https://x.com/levelsio/status/123456789',
      relevance: 'high',
      opportunity:
        'Build a similar photo editing feature for Coder1. Could integrate with the component studio.',
      dismissed: false,
    },
    {
      id: 'trend-002',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000),
      source: 'github',
      title: 'Next.js 15.2 Released',
      description:
        'Major performance improvements and new experimental features including enhanced streaming and partial prerendering.',
      url: 'https://github.com/vercel/next.js/releases/tag/v15.2.0',
      relevance: 'high',
      opportunity:
        'Update Coder1 to Next.js 15.2 for performance gains. Document new features for users.',
      dismissed: false,
    },
    {
      id: 'trend-003',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      source: 'hackernews',
      title: 'Show HN: I built an AI that writes tests for you',
      description:
        'Top of HN with 350 points. Automatically generates unit tests from function signatures. Comments discussing limitations.',
      url: 'https://news.ycombinator.com/item?id=987654',
      relevance: 'medium',
      opportunity:
        'Research their approach. Could add auto-test generation to Johnny5 capabilities.',
      dismissed: false,
    },
    {
      id: 'trend-004',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      source: 'competitor',
      title: 'Cursor adds multi-file editing feature',
      description:
        'New Cursor update allows editing multiple files simultaneously with AI. Users praising the feature on Twitter.',
      url: 'https://cursor.sh/changelog',
      relevance: 'high',
      opportunity:
        'Coder1 already has this! Create comparison content showing our implementation. Update marketing.',
      dismissed: false,
    },
    {
      id: 'trend-005',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      source: 'x',
      title: '#buildinpublic trend: Solo devs shipping faster with AI',
      description:
        'Multiple tweets about productivity gains using AI coding tools. Strong sentiment for transparent AI tools.',
      url: 'https://x.com/search?q=%23buildinpublic%20AI',
      relevance: 'medium',
      opportunity:
        'Create a case study showing Coder1 productivity gains. Share on social.',
      dismissed: false,
    },
    {
      id: 'trend-006',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      source: 'github',
      title: 'Tailwind CSS v4 beta released',
      description:
        'Major rewrite with improved performance and new features. Breaking changes from v3.',
      url: 'https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.0.0-beta.1',
      relevance: 'medium',
      opportunity:
        'Start testing Tailwind v4 compatibility. Create migration guide for users.',
      dismissed: false,
    },
    {
      id: 'trend-007',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      source: 'hackernews',
      title: 'Discussion: What makes a good AI IDE?',
      description:
        'Active discussion about features developers want. Top comment mentions transparency in AI operations.',
      url: 'https://news.ycombinator.com/item?id=456789',
      relevance: 'high',
      opportunity:
        "Johnny5's transparency features directly address this! Craft a response highlighting our approach.",
      dismissed: false,
    },
    {
      id: 'trend-008',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      source: 'custom',
      title: 'Weekly AI Newsletter: Focus on Code Security',
      description:
        'Industry newsletter highlighting importance of AI security. Mentions prompt injection risks.',
      url: 'https://newsletter.example.com/issue-42',
      relevance: 'low',
      opportunity:
        'Write a blog post about Johnny5 security features. Pitch to newsletter.',
      dismissed: false,
    },
    {
      id: 'trend-009',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      source: 'competitor',
      title: 'Bolt.new raises Series A',
      description:
        'Competitor raises $30M for AI-powered development platform. Focus on enterprise features.',
      url: 'https://techcrunch.com/bolt-series-a',
      relevance: 'medium',
      opportunity:
        'Position Coder1 as the indie-friendly alternative. Update pricing page messaging.',
      dismissed: true,
    },
    {
      id: 'trend-010',
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      source: 'x',
      title: '@swyx predicts AI tooling consolidation',
      description:
        'Thread about the future of AI development tools. Predicts integrated platforms will win.',
      url: 'https://x.com/swyx/status/987654321',
      relevance: 'low',
      opportunity:
        'Coder1 is already integrated! Share thread internally for strategy discussion.',
      dismissed: true,
    },
  ];
}

// In-memory storage (would be database in production)
let mockAlerts: Johnny5TrendAlert[] = [];

function ensureMockAlerts(): void {
  if (mockAlerts.length === 0) {
    mockAlerts = generateMockAlerts();
  }
}

/**
 * GET handler - Returns trend alerts with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    ensureMockAlerts();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const source = searchParams.get('source') as Johnny5TrendAlert['source'] | null;
    const relevance = searchParams.get('relevance') as Johnny5TrendAlert['relevance'] | null;
    const includeDismissed = searchParams.get('includeDismissed') === 'true';

    // Start with all alerts
    let alerts = [...mockAlerts];

    // Apply filters
    if (source) {
      alerts = alerts.filter((a) => a.source === source);
    }

    if (relevance) {
      alerts = alerts.filter((a) => a.relevance === relevance);
    }

    if (!includeDismissed) {
      alerts = alerts.filter((a) => !a.dismissed);
    }

    // Sort by timestamp (newest first), then by relevance
    const relevanceOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => {
      const timeDiff =
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (Math.abs(timeDiff) < 1000 * 60 * 60) {
        return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
      }
      return timeDiff;
    });

    // Paginate
    const total = alerts.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedAlerts = alerts.slice(startIndex, startIndex + pageSize);

    const response: Johnny5APIResponse<Johnny5PaginatedResponse<Johnny5TrendAlert>> = {
      success: true,
      data: {
        items: paginatedAlerts,
        total,
        page,
        pageSize,
        hasMore: startIndex + pageSize < total,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Trend Alerts API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trend alerts',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST handler - Dismiss an alert or take an action
 *
 * Body: { alertId: string, action: 'dismiss' | 'build' | 'research' | 'snooze' }
 */
export async function POST(request: NextRequest) {
  try {
    ensureMockAlerts();

    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId || !action) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required fields: alertId, action',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate action
    const validActions = ['dismiss', 'build', 'research', 'snooze'];
    if (!validActions.includes(action)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Find and update alert
    const alert = mockAlerts.find((a) => a.id === alertId);
    if (!alert) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Alert not found: ${alertId}`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Process action
    switch (action) {
      case 'dismiss':
      case 'snooze':
        alert.dismissed = true;
        break;
      case 'build':
        // In real implementation, would create a task in Mission Control
        console.log(`[Johnny5 Trends] Build action for: ${alert.title}`);
        alert.dismissed = true;
        break;
      case 'research':
        // In real implementation, would queue research task
        console.log(`[Johnny5 Trends] Research action for: ${alert.title}`);
        break;
    }

    console.log(`[Johnny5 Trend Alerts] Action "${action}" on alert: ${alertId}`);

    const response: Johnny5APIResponse<{ alert: Johnny5TrendAlert; action: string }> = {
      success: true,
      data: {
        alert,
        action,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Trend Alerts API] POST Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process action',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
