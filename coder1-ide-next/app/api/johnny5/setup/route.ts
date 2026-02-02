/**
 * Johnny5 Setup API
 *
 * Handles Johnny5 configuration for self-hosted setup.
 *
 * POST /api/johnny5/setup
 *   - action: 'validate-api-key' - Validate an Anthropic API key
 *   - action: 'save-config' - Save setup configuration
 * GET /api/johnny5/setup - Get current setup status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  loadConfig,
  setApiKey,
  setPermissions,
  setProactivityLevel,
  markSetupComplete,
  getConfigSummary,
  Johnny5Permissions,
} from '@/lib/johnny5-config';

// Force dynamic rendering - setup state changes
export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

interface ValidateApiKeyRequest {
  action: 'validate-api-key';
  apiKey: string;
}

interface SaveConfigRequest {
  action: 'save-config';
  apiKey?: string;
  permissions: Johnny5Permissions;
  proactivityLevel: 'low' | 'medium' | 'high';
}

type SetupRequest = ValidateApiKeyRequest | SaveConfigRequest;

interface ApiKeyValidationResult {
  success: boolean;
  model?: string;
  error?: string;
  errorType?: 'invalid_key' | 'no_credits' | 'rate_limited' | 'network_error' | 'unknown';
}

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Validate an Anthropic API key by making a test call to the Claude API
 */
async function validateAnthropicApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  // Basic format validation first
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      success: false,
      error: 'API key is required',
      errorType: 'invalid_key',
    };
  }

  // Check for Anthropic key format
  if (!apiKey.startsWith('sk-ant-')) {
    return {
      success: false,
      error: 'Invalid API key format. Anthropic keys start with sk-ant-',
      errorType: 'invalid_key',
    };
  }

  if (apiKey.length < 50) {
    return {
      success: false,
      error: 'API key appears to be too short',
      errorType: 'invalid_key',
    };
  }

  try {
    // Make a minimal test request to the Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "ok" and nothing else.',
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        model: data.model || 'claude-3-5-sonnet',
      };
    }

    // Handle specific error cases
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || '';

    if (response.status === 401) {
      return {
        success: false,
        error: 'Invalid API key. Please check your key and try again.',
        errorType: 'invalid_key',
      };
    }

    if (response.status === 403) {
      if (errorMessage.includes('credit') || errorMessage.includes('billing')) {
        return {
          success: false,
          error: 'No credits available. Please add credits to your Anthropic account.',
          errorType: 'no_credits',
        };
      }
      return {
        success: false,
        error: 'API key does not have permission to use this model.',
        errorType: 'invalid_key',
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limited. Please wait a moment and try again.',
        errorType: 'rate_limited',
      };
    }

    if (response.status === 529) {
      return {
        success: false,
        error: 'Claude API is overloaded. Please try again in a few seconds.',
        errorType: 'rate_limited',
      };
    }

    // Generic error
    return {
      success: false,
      error: errorMessage || `API error (${response.status})`,
      errorType: 'unknown',
    };
  } catch (error) {
    console.error('[Johnny5 Setup API] Network error validating API key:', error);
    return {
      success: false,
      error: 'Network error. Please check your internet connection.',
      errorType: 'network_error',
    };
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET - Check setup status
 */
export async function GET() {
  try {
    const summary = getConfigSummary();
    const config = loadConfig();

    return NextResponse.json({
      success: true,
      data: {
        isSetupComplete: summary.setupComplete,
        hasApiKey: summary.hasApiKey,
        permissions: summary.permissions,
        proactivityLevel: summary.proactivityLevel,
        setupCompletedAt: config.setupCompletedAt,
        apiKeyValidatedAt: config.apiKeyValidatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Johnny5 Setup API] Error checking status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Handle setup actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SetupRequest;

    if (body.action === 'validate-api-key') {
      // Validate API key
      const result = await validateAnthropicApiKey(body.apiKey);

      return NextResponse.json({
        success: result.success,
        data: result.success
          ? { model: result.model, validated: true }
          : undefined,
        error: result.error,
        errorType: result.errorType,
        timestamp: new Date().toISOString(),
      });
    }

    if (body.action === 'save-config') {
      // Save the API key if provided
      if (body.apiKey) {
        setApiKey(body.apiKey);
      }

      // Save permissions
      setPermissions(body.permissions);

      // Save proactivity level
      setProactivityLevel(body.proactivityLevel);

      // Mark setup as complete
      markSetupComplete();

      return NextResponse.json({
        success: true,
        message: 'Configuration saved successfully',
        data: getConfigSummary(),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Johnny5 Setup API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Setup failed',
      },
      { status: 500 }
    );
  }
}
