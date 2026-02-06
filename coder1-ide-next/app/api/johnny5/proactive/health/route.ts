/**
 * Johnny5 Proactive Health Check
 *
 * GET /api/johnny5/proactive/health
 * Returns 200 if all proactive services healthy, 503 if degraded.
 */

import { NextResponse } from 'next/server';
import { getJohnny5Config } from '@/lib/johnny5-config';
import { opportunityEngine } from '@/services/johnny5/opportunity-engine';
import { telegramBot } from '@/services/johnny5/telegram-bot';

export async function GET() {
  try {
    const config = getJohnny5Config();

    const status = {
      opportunityEngine: opportunityEngine.isHealthy(),
      telegramBot: telegramBot.getIsConnected(),
      proactivityLevel: config.proactivityLevel,
      queueSize: opportunityEngine.getQueueSize(),
      dailyTokensUsed: opportunityEngine.getTokensUsed(),
      pendingConfirmations: telegramBot.getPendingConfirmationsCount(),
      telegramEnabled: config.integrations.telegram?.enabled ?? false,
    };

    // Healthy if: engine is healthy AND (telegram connected OR not enabled)
    const healthy = status.opportunityEngine &&
      (!status.telegramEnabled || status.telegramBot);

    return NextResponse.json(
      {
        healthy,
        status,
        timestamp: new Date().toISOString(),
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('[Johnny5/Health] Check failed:', error);
    return NextResponse.json(
      { healthy: false, error: 'Health check failed' },
      { status: 503 }
    );
  }
}
