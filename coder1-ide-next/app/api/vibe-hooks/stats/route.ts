/**
 * Vibe Hooks Statistics API Route
 * Provides hook usage statistics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { hooksService } from '@/services/hooks-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const stats = await hooksService.getStats();
    
    // Transform stats for dashboard display
    const dashboardStats = {
      totalHooks: stats.totalHooks,
      activeHooks: stats.activeHooks,
      inactiveHooks: stats.totalHooks - stats.activeHooks,
      totalExecutions: stats.totalExecutions,
      totalTokensSaved: stats.totalTokensSaved,
      totalTimeSaved: stats.totalTimeSaved,
      weeklyTokenSavings: stats.weeklyTokenSavings,
      
      // Calculate additional metrics
      executionRate: stats.totalHooks > 0 
        ? Math.round((stats.totalExecutions / stats.totalHooks) * 100) / 100 
        : 0,
      averageTokensPerExecution: stats.totalExecutions > 0
        ? Math.round(stats.totalTokensSaved / stats.totalExecutions)
        : 0,
      
      // Format time saved
      formattedTimeSaved: formatTimeSaved(stats.totalTimeSaved),
      
      // Top performing hooks
      topHooks: stats.topPerformingHooks.map(hook => ({
        id: hook.id,
        name: hook.name,
        tokensSaved: hook.tokensSaved || 0,
        executions: hook.frequency || 0
      })),
      
      // Recent activity
      recentActivity: stats.recentExecutions.map(exec => ({
        hookName: exec.hookName,
        timestamp: exec.timestamp,
        success: exec.success,
        tokensSaved: exec.tokensSaved,
        timeSaved: exec.timeSaved
      }))
    };
    
    return NextResponse.json({
      success: true,
      stats: dashboardStats
    });
  } catch (error: any) {
    logger.error('Failed to get hooks stats for dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve statistics',
        stats: {
          totalHooks: 0,
          activeHooks: 0,
          inactiveHooks: 0,
          totalExecutions: 0,
          totalTokensSaved: 0,
          totalTimeSaved: 0,
          weeklyTokenSavings: 0,
          executionRate: 0,
          averageTokensPerExecution: 0,
          formattedTimeSaved: '0 minutes',
          topHooks: [],
          recentActivity: []
        }
      },
      { status: 500 }
    );
  }
}

function formatTimeSaved(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}