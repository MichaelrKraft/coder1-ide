import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { fileOperations } from '@/lib/claude-config';
import type { ConfigLocation } from '@/lib/claude-config/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = (searchParams.get('location') as ConfigLocation) || 'local';
    
    if (location !== 'local' && location !== 'global') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid location parameter. Must be "local" or "global"'
        },
        { status: 400 }
      );
    }
    
    const configs = await fileOperations.listConfigs(location);
    
    return NextResponse.json({
      success: true,
      configs,
      count: configs.length,
      location
    });
  } catch (error) {
    console.error('[Claude Config API] Failed to list configs:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list configs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
