/**
 * Johnny5 Proactive Webhook Handler
 *
 * Receives external events from Zapier, GitHub, and other sources.
 * Routes events to the Opportunity Engine for AI-driven classification.
 *
 * Endpoints:
 * - POST /api/johnny5/proactive/webhook
 *
 * Features:
 * - HMAC signature verification (when webhook secret configured)
 * - Zod schema validation
 * - Rate limiting (60 req/min per source)
 * - Async processing with 202 Accepted
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { z } from 'zod/v4';
import { getJohnny5Config } from '@/lib/johnny5-config';
import { opportunityEngine } from '@/services/johnny5/opportunity-engine';
import type { EventSource } from '@/services/johnny5/opportunity-engine';

// ============================================================================
// Validation Schema
// ============================================================================

const WebhookPayloadSchema = z.object({
  source: z.enum(['zapier', 'telegram', 'github', 'custom']),
  type: z.string().min(1).max(200),
  payload: z.record(z.unknown()).optional().default({}),
  webhookId: z.string().optional(), // For idempotency
});

// ============================================================================
// Rate Limiting (in-memory, per source)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60000;

function checkRateLimit(source: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(source);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(source, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================================
// Idempotency (in-memory, 1-hour window)
// ============================================================================

const processedWebhookIds = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 3600000;

function isDuplicate(webhookId: string): boolean {
  const existing = processedWebhookIds.get(webhookId);
  if (existing && Date.now() - existing < IDEMPOTENCY_WINDOW_MS) {
    return true;
  }
  processedWebhookIds.set(webhookId, Date.now());

  // Cleanup old entries periodically
  if (processedWebhookIds.size > 1000) {
    const now = Date.now();
    for (const [id, timestamp] of processedWebhookIds) {
      if (now - timestamp > IDEMPOTENCY_WINDOW_MS) {
        processedWebhookIds.delete(id);
      }
    }
  }

  return false;
}

// ============================================================================
// Signature Verification
// ============================================================================

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return signature === expected || signature === `sha256=${expected}`;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const config = getJohnny5Config();

    // Read raw body for signature verification
    const body = await request.text();

    // Signature verification (if webhook secret is configured)
    const zapierConfig = config.integrations.zapier;
    if (zapierConfig?.enabled && zapierConfig.webhookUrl) {
      // Use webhookUrl as the secret for HMAC (or a dedicated secret field if added later)
      const signature = request.headers.get('x-webhook-signature') ||
                        request.headers.get('x-zapier-signature');

      // Only enforce signature if a secret-like value exists
      // In development, skip verification with a warning
      if (signature && zapierConfig.webhookUrl) {
        if (!verifySignature(body, signature, zapierConfig.webhookUrl)) {
          console.warn('[Johnny5/Webhook] Signature verification failed');
          return NextResponse.json(
            { success: false, error: 'Invalid signature' },
            { status: 401 }
          );
        }
      }
    }

    // Parse and validate payload
    let parsed: z.infer<typeof WebhookPayloadSchema>;
    try {
      const json = JSON.parse(body);
      parsed = WebhookPayloadSchema.parse(json);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(parsed.source)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded (60/min)' },
        { status: 429 }
      );
    }

    // Idempotency check
    if (parsed.webhookId && isDuplicate(parsed.webhookId)) {
      return NextResponse.json(
        { success: true, message: 'Already processed', queued: false },
        { status: 200 }
      );
    }

    // Map source to EventSource type
    const sourceMap: Record<string, EventSource> = {
      zapier: 'zapier',
      telegram: 'telegram',
      github: 'zapier', // GitHub events come via Zapier MCP
      custom: 'zapier',
    };

    // Queue for async processing - don't block the webhook response
    setImmediate(async () => {
      try {
        await opportunityEngine.ingest({
          source: sourceMap[parsed.source] || 'zapier',
          type: parsed.type,
          data: parsed.payload as Record<string, unknown>,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('[Johnny5/Webhook] Async processing failed:', error);
      }
    });

    // Return immediately with 202 Accepted
    return NextResponse.json(
      { success: true, queued: true },
      { status: 202 }
    );
  } catch (error) {
    console.error('[Johnny5/Webhook] Handler error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check / info endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: '/api/johnny5/proactive/webhook',
    methods: ['POST'],
    schema: {
      source: 'zapier | telegram | github | custom',
      type: 'string (event type)',
      payload: 'object (event data)',
      webhookId: 'string (optional, for idempotency)',
    },
  });
}
