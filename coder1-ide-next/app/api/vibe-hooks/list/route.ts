/**
 * Vibe Hooks List API Route
 * Dashboard-specific endpoint for listing hooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { hooksService } from '@/services/hooks-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const hooks = await hooksService.getAllHooks();
    
    // Transform hooks for dashboard display
    const dashboardHooks = hooks.map(hook => ({
      id: hook.id,
      name: hook.name,
      description: hook.description || '',
      enabled: hook.enabled,
      trigger: hook.trigger,
      prompt: hook.prompt,
      category: hook.category || 'custom',
      frequency: hook.frequency || 0,
      tokensSaved: hook.tokensSaved || 0,
      timeSaved: hook.timeSaved || 0,
      lastTriggered: hook.lastTriggered || null,
      confidence: hook.confidence || 0.7,
      icon: getCategoryIcon(hook.category),
      status: hook.enabled ? 'active' : 'inactive'
    }));
    
    return NextResponse.json({
      success: true,
      hooks: dashboardHooks,
      count: dashboardHooks.length
    });
  } catch (error: any) {
    logger.error('Failed to get hooks list for dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve hooks',
        hooks: [] // Return empty array to prevent dashboard errors
      },
      { status: 500 }
    );
  }
}

function getCategoryIcon(category?: string): string {
  const iconMap: Record<string, string> = {
    'error-fixing': '🔧',
    'formatting': '✨',
    'testing': '🧪',
    'documentation': '📝',
    'refactoring': '🔄',
    'security': '🔒',
    'performance': '⚡',
    'custom': '🪝'
  };
  
  return iconMap[category || 'custom'] || '🪝';
}