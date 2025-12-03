/**
 * POST /api/settings/validate-api-key
 * 
 * Validates API keys for GLM and Anthropic providers.
 */

import { NextRequest, NextResponse } from 'next/server';

interface ValidationRequest {
  provider: 'glm' | 'anthropic';
  apiKey: string;
}

interface ValidationResponse {
  valid: boolean;
  provider: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const { provider, apiKey } = body;

    // Validate request
    if (!provider || !apiKey) {
      return NextResponse.json({
        valid: false,
        provider: provider || 'unknown',
        error: 'Provider and API key are required',
        errorCode: 'MISSING_PARAMS'
      } as ValidationResponse, { status: 400 });
    }

    if (!['glm', 'anthropic'].includes(provider)) {
      return NextResponse.json({
        valid: false,
        provider,
        error: 'Invalid provider. Must be "glm" or "anthropic"',
        errorCode: 'INVALID_PROVIDER'
      } as ValidationResponse, { status: 400 });
    }

    // Validate based on provider
    if (provider === 'glm') {
      return await validateGLMKey(apiKey);
    } else {
      return await validateAnthropicKey(apiKey);
    }

  } catch (error) {
    console.error('[API] Validation error:', error);
    return NextResponse.json({
      valid: false,
      provider: 'unknown',
      error: 'Internal server error during validation',
      errorCode: 'INTERNAL_ERROR'
    } as ValidationResponse, { status: 500 });
  }
}

/**
 * Validate GLM API key
 */
async function validateGLMKey(apiKey: string): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[GLM Validation] 🔍 Starting validation...');
  console.log('[GLM Validation] 📝 Key format:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));
  
  // Basic format check
  const formatRegex = /^[a-f0-9]{32}\.[a-zA-Z0-9]{16}$/;
  if (!apiKey.match(formatRegex)) {
    console.log('[GLM Validation] ❌ Format check failed');
    console.log('[GLM Validation] Expected: 32 hex chars + dot + 16 alphanumeric');
    console.log('[GLM Validation] Got length:', apiKey.length);
    return NextResponse.json({
      valid: false,
      provider: 'glm',
      error: 'Invalid GLM API key format. Expected format: {32-hex}.{16-alphanumeric}',
      errorCode: 'INVALID_FORMAT'
    } as ValidationResponse);
  }
  
  console.log('[GLM Validation] ✅ Format check passed');

  // Test API call
  try {
    console.log('[GLM Validation] 🌐 Making test API call to GLM...');
    const requestBody = {
      model: 'glm-4.6',
      messages: [{
        role: 'user',
        content: 'test'
      }],
      max_tokens: 5
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const elapsed = Date.now() - startTime;
    console.log('[GLM Validation] ⏱️ API call completed in', elapsed, 'ms');
    console.log('[GLM Validation] 📊 Response status:', response.status);
    console.log('[GLM Validation] 📊 Response ok:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('[GLM Validation] ✅ Validation successful!');
      console.log('[GLM Validation] 📦 Response data:', JSON.stringify(data, null, 2));
      return NextResponse.json({
        valid: true,
        provider: 'glm',
        message: 'GLM API key validated successfully'
      } as ValidationResponse);
    }

    // Handle specific error codes
    if (response.status === 401) {
      const errorText = await response.text();
      console.log('[GLM Validation] ❌ 401 Unauthorized');
      console.log('[GLM Validation] Error body:', errorText);
      return NextResponse.json({
        valid: false,
        provider: 'glm',
        error: 'API key authentication failed. Please check your key.',
        errorCode: 'AUTH_FAILED'
      } as ValidationResponse);
    }

    if (response.status === 429) {
      const errorText = await response.text();
      console.log('[GLM Validation] ⚠️ 429 Rate Limited (but key is valid)');
      console.log('[GLM Validation] Error body:', errorText);
      // Rate limit doesn't mean invalid key
      return NextResponse.json({
        valid: true,
        provider: 'glm',
        message: 'GLM API key validated (rate limited, but key is valid)'
      } as ValidationResponse);
    }

    const errorText = await response.text();
    console.log('[GLM Validation] ❌ API error:', response.status);
    console.log('[GLM Validation] Error body:', errorText);
    
    // Try to parse error as JSON
    try {
      const errorJson = JSON.parse(errorText);
      console.log('[GLM Validation] Parsed error:', JSON.stringify(errorJson, null, 2));
    } catch (e) {
      console.log('[GLM Validation] Could not parse error as JSON');
    }
    
    return NextResponse.json({
      valid: false,
      provider: 'glm',
      error: `GLM API error: ${response.status} - ${errorText.substring(0, 200)}`,
      errorCode: 'API_ERROR'
    } as ValidationResponse);

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[GLM Validation] ❌ Exception after', elapsed, 'ms');
    console.error('[GLM Validation] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[GLM Validation] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[GLM Validation] Full error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({
        valid: false,
        provider: 'glm',
        error: 'Validation timeout (30s). GLM API may be slow or unreachable.',
        errorCode: 'TIMEOUT'
      } as ValidationResponse);
    }
    
    return NextResponse.json({
      valid: false,
      provider: 'glm',
      error: 'Network error while validating GLM key. Check your connection.',
      errorCode: 'NETWORK_ERROR'
    } as ValidationResponse);
  }
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(apiKey: string): Promise<NextResponse> {
  // Basic format check
  if (!apiKey.startsWith('sk-ant-')) {
    return NextResponse.json({
      valid: false,
      provider: 'anthropic',
      error: 'Invalid Anthropic API key format. Must start with "sk-ant-"',
      errorCode: 'INVALID_FORMAT'
    } as ValidationResponse);
  }

  // Test API call
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: 'test'
        }]
      })
    });

    if (response.ok) {
      return NextResponse.json({
        valid: true,
        provider: 'anthropic',
        message: 'Anthropic API key validated successfully'
      } as ValidationResponse);
    }

    // Handle specific error codes
    if (response.status === 401) {
      return NextResponse.json({
        valid: false,
        provider: 'anthropic',
        error: 'API key authentication failed. Please check your key.',
        errorCode: 'AUTH_FAILED'
      } as ValidationResponse);
    }

    if (response.status === 429) {
      // Rate limit doesn't mean invalid key
      return NextResponse.json({
        valid: true,
        provider: 'anthropic',
        message: 'Anthropic API key validated (rate limited, but key is valid)'
      } as ValidationResponse);
    }

    const errorText = await response.text();
    return NextResponse.json({
      valid: false,
      provider: 'anthropic',
      error: `Anthropic API error: ${response.status}`,
      errorCode: 'API_ERROR'
    } as ValidationResponse);

  } catch (error) {
    console.error('[Anthropic Validation] Error:', error);
    return NextResponse.json({
      valid: false,
      provider: 'anthropic',
      error: 'Network error while validating Anthropic key. Check your connection.',
      errorCode: 'NETWORK_ERROR'
    } as ValidationResponse);
  }
}
