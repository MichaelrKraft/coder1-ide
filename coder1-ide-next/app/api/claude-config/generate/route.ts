import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { aiGenerator, validation } from '@/lib/claude-config';
import type { ConfigType } from '@/lib/claude-config/types';

interface GenerateConfigRequest {
  prompt: string;
  type?: ConfigType;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateConfigRequest = await request.json();
    
    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: prompt'
        },
        { status: 400 }
      );
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'ANTHROPIC_API_KEY not configured. Please add your API key to .env.local'
        },
        { status: 500 }
      );
    }
    
    const result = await aiGenerator.generateConfig(body.prompt, body.type);
    
    if (!result.success || !result.config) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate config'
        },
        { status: 500 }
      );
    }
    
    const configType = result.type!;
    const parsedConfig = aiGenerator.parseResponse(result.config, configType);
    
    const isValid = aiGenerator.validateGenerated(parsedConfig, configType);
    
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Generated config failed validation. Please try rephrasing your prompt.',
          rawConfig: parsedConfig
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      config: parsedConfig,
      type: configType,
      metadata: result.metadata,
      validation: {
        isValid: true,
        message: 'Config generated successfully and passed validation'
      }
    });
    
  } catch (error) {
    console.error('[Claude Config API] Failed to generate config:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
