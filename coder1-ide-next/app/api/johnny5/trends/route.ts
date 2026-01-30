/**
 * Johnny5 Trends API
 *
 * GET /api/johnny5/trends - Returns trend monitoring configuration and stats
 * POST /api/johnny5/trends - Add a new monitored topic
 *
 * Trend Monitor watches X, GitHub, HackerNews, and competitor websites
 * for opportunities that Johnny5 can act on.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5TrendMonitorConfig,
} from '@/types/johnny5';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// In-memory storage for demo (would be database in production)
let monitorConfig: Johnny5TrendMonitorConfig = {
  xAccounts: [
    '@levelsio',
    '@theprimeagen',
    '@dan_abramov',
    '@swyx',
    '@jaredpalmer',
  ],
  xKeywords: [
    '#buildinpublic',
    '#indie',
    'ai coding',
    'vibe coding',
    'claude code',
  ],
  githubRepos: [
    'anthropics/claude-code',
    'vercel/next.js',
    'facebook/react',
    'tailwindlabs/tailwindcss',
  ],
  hackerNewsKeywords: [
    'AI IDE',
    'code generation',
    'Claude',
    'cursor alternative',
    'developer tools',
  ],
  competitorWebsites: [
    'cursor.sh',
    'bolt.new',
    'replit.com',
    'windsurf.com',
  ],
  industryNewsRss: [
    'https://news.ycombinator.com/rss',
  ],
  customWebhooks: [],
};

interface TrendMonitorStats {
  isMonitoring: boolean;
  lastChecked: Date;
  alertCount: number;
  topicCount: number;
}

/**
 * GET handler - Returns configuration and monitoring stats
 */
export async function GET() {
  try {
    // Calculate topic count
    const topicCount =
      monitorConfig.xAccounts.length +
      monitorConfig.xKeywords.length +
      monitorConfig.githubRepos.length +
      monitorConfig.hackerNewsKeywords.length +
      monitorConfig.competitorWebsites.length +
      monitorConfig.industryNewsRss.length +
      monitorConfig.customWebhooks.length;

    const stats: TrendMonitorStats = {
      isMonitoring: true,
      lastChecked: new Date(),
      alertCount: 10, // Mock count
      topicCount,
    };

    const response: Johnny5APIResponse<{
      config: Johnny5TrendMonitorConfig;
      stats: TrendMonitorStats;
    }> = {
      success: true,
      data: {
        config: monitorConfig,
        stats,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Trends API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trends config',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST handler - Add a new monitored topic
 *
 * Body: { type: keyof Johnny5TrendMonitorConfig, value: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value } = body;

    // Validate required fields
    if (!type || !value) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required fields: type, value',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate type
    const validTypes: (keyof Johnny5TrendMonitorConfig)[] = [
      'xAccounts',
      'xKeywords',
      'githubRepos',
      'hackerNewsKeywords',
      'competitorWebsites',
      'industryNewsRss',
      'customWebhooks',
    ];

    if (!validTypes.includes(type)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Add to config (avoid duplicates)
    const configArray = monitorConfig[type as keyof Johnny5TrendMonitorConfig];
    if (Array.isArray(configArray) && !configArray.includes(value)) {
      (configArray as string[]).push(value);
    }

    console.log(`[Johnny5 Trends] Added ${type}: ${value}`);

    const response: Johnny5APIResponse<{ added: boolean; config: Johnny5TrendMonitorConfig }> = {
      success: true,
      data: {
        added: true,
        config: monitorConfig,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[Johnny5 Trends API] POST Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add topic',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE handler - Remove a monitored topic
 *
 * Body: { type: keyof Johnny5TrendMonitorConfig, value: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value } = body;

    if (!type || !value) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required fields: type, value',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Remove from config
    const configArray = monitorConfig[type as keyof Johnny5TrendMonitorConfig];
    if (Array.isArray(configArray)) {
      const index = (configArray as string[]).indexOf(value);
      if (index > -1) {
        (configArray as string[]).splice(index, 1);
      }
    }

    console.log(`[Johnny5 Trends] Removed ${type}: ${value}`);

    const response: Johnny5APIResponse<{ removed: boolean; config: Johnny5TrendMonitorConfig }> = {
      success: true,
      data: {
        removed: true,
        config: monitorConfig,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Trends API] DELETE Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove topic',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
