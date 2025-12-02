import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { fileOperations, validation } from '@/lib/claude-config';
import type { ConfigType, ConfigLocation } from '@/lib/claude-config/types';

interface SaveConfigRequest {
  name: string;
  type: ConfigType;
  content: string;
  location: ConfigLocation;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveConfigRequest = await request.json();
    
    // Validate request body
    if (!body.name || !body.type || !body.content || !body.location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type, content, location'
        },
        { status: 400 }
      );
    }
    
    // Validate config type
    const validTypes: ConfigType[] = ['agent', 'hook', 'skill', 'command'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid config type. Must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      );
    }
    
    // Validate location
    if (body.location !== 'local' && body.location !== 'global') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid location. Must be "local" or "global"'
        },
        { status: 400 }
      );
    }
    
    // Validate config content
    const validationResult = validation.validateCompleteConfig({
      name: body.name,
      description: body.description || '',
      content: body.content,
      type: body.type,
      location: body.location
    });
    
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Config validation failed',
          validation: validationResult
        },
        { status: 400 }
      );
    }
    
    // Save the config
    const result = await fileOperations.createConfig(
      body.name,
      body.type,
      body.content,
      body.location
    );
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to save config'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Config saved successfully',
      path: result.path,
      location: body.location
    });
    
  } catch (error) {
    console.error('[Claude Config API] Failed to save config:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
