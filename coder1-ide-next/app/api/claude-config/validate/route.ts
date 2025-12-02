import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validation } from '@/lib/claude-config';
import type { ConfigType, ConfigLocation } from '@/lib/claude-config/types';

interface ValidateConfigRequest {
  name: string;
  description: string;
  content: string;
  type: ConfigType;
  location: ConfigLocation;
  permissions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateConfigRequest = await request.json();
    
    // Validate request body
    if (!body.name || !body.content || !body.type || !body.location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, content, type, location'
        },
        { status: 400 }
      );
    }
    
    const validationResult = validation.validateCompleteConfig(body);
    
    return NextResponse.json({
      success: true,
      validation: validationResult
    });
    
  } catch (error) {
    console.error('[Claude Config API] Failed to validate config:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
