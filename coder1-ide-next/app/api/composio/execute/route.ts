/**
 * Composio Execute Route
 *
 * POST /api/composio/execute
 *
 * Executes deployment platform actions (set_env_var, list_env_vars, etc.)
 * through the Composio SDK. Handles batch operations and service disambiguation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getComposioService, ComposioServiceError } from '@/services/composio';
import type { ComposioPlatform } from '@/services/composio';
import { extractUserId } from '@/lib/auth/extract-user-id';
import { containsSecret, maskSensitiveValue } from '@/lib/env-var-parser';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionName =
  | 'set_env_var'
  | 'set_env_vars_batch'
  | 'list_env_vars'
  | 'delete_env_var'
  | 'list_services'
  | 'trigger_deploy';

interface ExecuteRequest {
  platform: ComposioPlatform;
  action: ActionName;
  serviceId?: string;
  params?: Record<string, unknown>;
}

interface EnvVarParam {
  key: string;
  value: string;
}

interface ProgressStep {
  step: string;
  status: 'complete' | 'in_progress' | 'pending';
  detail?: string;
}

/**
 * Generate progress steps for an action to show in chat.
 */
function getProgressSteps(
  action: ActionName,
  platform: string,
  serviceId?: string,
): ProgressStep[] {
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  const steps: ProgressStep[] = [
    { step: `Authenticated with ${platformName}`, status: 'complete' },
  ];

  if (action === 'list_services') {
    steps.push({ step: 'Fetching service list', status: 'complete' });
  } else if (action === 'list_env_vars') {
    steps.push(
      { step: `Found service: ${serviceId || 'unknown'}`, status: 'complete' },
      { step: 'Fetching environment variables', status: 'complete' },
    );
  } else if (action === 'set_env_var' || action === 'set_env_vars_batch') {
    steps.push(
      { step: `Found service: ${serviceId || 'unknown'}`, status: 'complete' },
      { step: 'Setting environment variable(s)', status: 'complete' },
      { step: 'Variable(s) updated', status: 'complete' },
    );
  } else if (action === 'delete_env_var') {
    steps.push(
      { step: `Found service: ${serviceId || 'unknown'}`, status: 'complete' },
      { step: 'Deleting environment variable', status: 'complete' },
      { step: 'Variable deleted', status: 'complete' },
    );
  } else if (action === 'trigger_deploy') {
    steps.push(
      { step: `Found service: ${serviceId || 'unknown'}`, status: 'complete' },
      { step: 'Triggering deploy', status: 'complete' },
      { step: 'Deploy started', status: 'complete', detail: 'Usually takes 1-2 minutes' },
    );
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Action Mappers
// ---------------------------------------------------------------------------

/**
 * Map our action names to Composio action names.
 * Composio uses platform-prefixed action names like RENDER_SET_ENV_VAR.
 */
function getComposioActionName(platform: ComposioPlatform, action: ActionName): string {
  const platformUpper = platform.toUpperCase();

  const actionMap: Record<ActionName, string> = {
    set_env_var: `${platformUpper}_SET_ENV_VAR`,
    set_env_vars_batch: `${platformUpper}_SET_ENV_VARS_BATCH`,
    list_env_vars: `${platformUpper}_LIST_ENV_VARS`,
    delete_env_var: `${platformUpper}_DELETE_ENV_VAR`,
    list_services: `${platformUpper}_LIST_SERVICES`,
    trigger_deploy: `${platformUpper}_TRIGGER_DEPLOY`,
  };

  return actionMap[action] || `${platformUpper}_${action.toUpperCase()}`;
}

/**
 * Mask sensitive values in action results before returning to client.
 */
function maskResultSecrets(result: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...result };

  // If result contains env vars, mask sensitive values
  if (Array.isArray(masked.envVars)) {
    masked.envVars = (masked.envVars as Array<{ key: string; value: string }>).map((envVar) => ({
      key: envVar.key,
      value: containsSecret(envVar.value, envVar.key)
        ? maskSensitiveValue(envVar.value)
        : envVar.value,
    }));
  }

  return masked;
}

// ---------------------------------------------------------------------------
// Request Validation
// ---------------------------------------------------------------------------

function validateRequest(body: unknown): ExecuteRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const req = body as Record<string, unknown>;

  if (!req.platform || typeof req.platform !== 'string') {
    throw new Error('platform is required');
  }

  if (!['render', 'vercel', 'supabase'].includes(req.platform)) {
    throw new Error(`Unknown platform: ${req.platform}`);
  }

  if (!req.action || typeof req.action !== 'string') {
    throw new Error('action is required');
  }

  const validActions: ActionName[] = [
    'set_env_var',
    'set_env_vars_batch',
    'list_env_vars',
    'delete_env_var',
    'list_services',
    'trigger_deploy',
  ];

  if (!validActions.includes(req.action as ActionName)) {
    throw new Error(`Unknown action: ${req.action}. Valid actions: ${validActions.join(', ')}`);
  }

  return {
    platform: req.platform as ComposioPlatform,
    action: req.action as ActionName,
    serviceId: typeof req.serviceId === 'string' ? req.serviceId : undefined,
    params: typeof req.params === 'object' ? (req.params as Record<string, unknown>) : {},
  };
}

/**
 * Validate env var parameters for set operations.
 */
function validateEnvVarParams(
  action: ActionName,
  params: Record<string, unknown>,
): void {
  if (action === 'set_env_var') {
    if (!params.key || typeof params.key !== 'string') {
      throw new Error('params.key is required for set_env_var');
    }
    if (params.value === undefined) {
      throw new Error('params.value is required for set_env_var');
    }
    // Validate key format (A-Z, 0-9, _ only)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(params.key)) {
      throw new Error(
        `Invalid env var name "${params.key}". Names must start with A-Z or _, followed by A-Z, 0-9, or _.`,
      );
    }
  }

  if (action === 'set_env_vars_batch') {
    if (!Array.isArray(params.envVars)) {
      throw new Error('params.envVars array is required for set_env_vars_batch');
    }
    for (const envVar of params.envVars as EnvVarParam[]) {
      if (!envVar.key || typeof envVar.key !== 'string') {
        throw new Error('Each env var must have a key');
      }
      if (!/^[A-Z_][A-Z0-9_]*$/.test(envVar.key)) {
        throw new Error(
          `Invalid env var name "${envVar.key}". Names must start with A-Z or _, followed by A-Z, 0-9, or _.`,
        );
      }
    }
  }

  if (action === 'delete_env_var') {
    if (!params.key || typeof params.key !== 'string') {
      throw new Error('params.key is required for delete_env_var');
    }
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    const body = await request.json();

    // Validate request
    const { platform, action, serviceId, params = {} } = validateRequest(body);

    // Validate action-specific params
    validateEnvVarParams(action, params);

    const service = getComposioService();

    // Check cache for list_services
    if (action === 'list_services') {
      const cachedServices = service.getCachedServices(userId, platform);
      if (cachedServices) {
        console.log(`[Composio Execute] list_services cache HIT for ${platform}`);
        return NextResponse.json({
          success: true,
          data: { services: cachedServices },
          action,
          platform,
          cached: true,
        });
      }
      console.log(`[Composio Execute] list_services cache MISS for ${platform}`);
    }

    // Build Composio params
    const composioParams: Record<string, unknown> = { ...params };

    // Add serviceId if provided (required for most actions except list_services)
    if (serviceId) {
      composioParams.serviceId = serviceId;
    } else if (action !== 'list_services') {
      // For actions that need a service, check if there's a default
      // This will be handled by the skill layer, but we validate here
      console.log(`[Composio Execute] No serviceId provided for ${action}`);
    }

    // Execute via Composio
    const composioAction = getComposioActionName(platform, action);

    console.log(`[Composio Execute] ${composioAction}`, {
      userId,
      platform,
      action,
      serviceId,
      hasParams: Object.keys(params).length > 0,
    });

    const result = await service.executeAction(userId, platform, composioAction, composioParams);

    // Cache service list results
    if (action === 'list_services' && result.data?.services) {
      service.setCachedServices(
        userId,
        platform,
        result.data.services as Array<{ id: string; name: string; type: string }>,
      );
    }

    // Mask any secrets in the response
    const maskedData = result.data ? maskResultSecrets(result.data) : {};

    // Generate progress steps for display
    const steps = getProgressSteps(action, platform, serviceId);

    return NextResponse.json({
      success: true,
      data: maskedData,
      action,
      platform,
      serviceId,
      steps,
    });
  } catch (err) {
    // Handle known error types
    if (err instanceof ComposioServiceError) {
      const statusMap: Record<string, number> = {
        NOT_CONNECTED: 401,
        TOKEN_EXPIRED: 401,
        PERMISSION_DENIED: 403,
        PLATFORM_NOT_FOUND: 404,
        RATE_LIMITED: 429,
        PLATFORM_ERROR: 502,
      };

      const status = statusMap[err.code] || 400;

      // Provide actionable error messages
      const messageMap: Record<string, string> = {
        NOT_CONNECTED: `Not connected to ${err.platform}. Please connect your account first.`,
        TOKEN_EXPIRED: `Your ${err.platform} connection expired. Please reconnect.`,
        PERMISSION_DENIED: `You don't have permission for this action on ${err.platform}. Check your team role.`,
        PLATFORM_NOT_FOUND: `Service not found on ${err.platform}.`,
        RATE_LIMITED: `${err.platform} is rate limiting requests. Please try again in a minute.`,
        PLATFORM_ERROR: `${err.platform} is having issues. Check their status page.`,
      };

      // For auth errors, include reconnect URL for in-chat flow
      const needsReconnect = err.code === 'NOT_CONNECTED' || err.code === 'TOKEN_EXPIRED';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
      const reconnectUrl = needsReconnect
        ? `${appUrl}/api/composio/connect/${err.platform}`
        : undefined;

      return NextResponse.json(
        {
          success: false,
          error: messageMap[err.code] || err.message,
          code: err.code,
          platform: err.platform,
          reconnectUrl,
          needsReconnect,
        },
        { status },
      );
    }

    // Validation errors
    if (err instanceof Error && err.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: err.message, code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Invalid env var name
    if (err instanceof Error && err.message.includes('Invalid env var name')) {
      return NextResponse.json(
        { success: false, error: err.message, code: 'INVALID_NAME' },
        { status: 422 },
      );
    }

    // Unknown errors
    console.error('[Composio Execute] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.', code: 'UNKNOWN' },
      { status: 500 },
    );
  }
}
