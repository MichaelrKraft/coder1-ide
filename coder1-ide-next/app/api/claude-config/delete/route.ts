import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { fileOperations } from '@/lib/claude-config';
import type { ConfigLocation } from '@/lib/claude-config/types';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');
    const location = (searchParams.get('location') as ConfigLocation) || 'local';
    
    if (!configId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: id'
        },
        { status: 400 }
      );
    }
    
    if (location !== 'local' && location !== 'global') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid location parameter. Must be "local" or "global"'
        },
        { status: 400 }
      );
    }
    
    const result = await fileOperations.deleteConfig(configId, location);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to delete config'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Config deleted successfully',
      backupPath: result.backupPath,
      location
    });
    
  } catch (error) {
    console.error('[Claude Config API] Failed to delete config:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
