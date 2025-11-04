import { NextRequest, NextResponse } from 'next/server';
import { contextDatabase } from '@/services/context-database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const stats = await contextDatabase.getStats();
    
    const timeSavedMinutes = stats.totalConversations * 5;
    
    const API_COST_PER_CALL = 0.015;
    const CLI_COST_PER_CALL = 0.0;
    
    const apiCost = stats.totalApiCalls * API_COST_PER_CALL;
    const cliCost = stats.totalCliCalls * CLI_COST_PER_CALL;
    const totalCost = apiCost + cliCost;
    const hypotheticalApiCost = (stats.totalApiCalls + stats.totalCliCalls) * API_COST_PER_CALL;
    const costSavings = hypotheticalApiCost - totalCost;
    
    const analyticsData = {
      totalConversations: stats.totalConversations || 0,
      totalSessions: stats.totalSessions || 0,
      totalPatterns: stats.totalPatterns || 0,
      successRate: stats.successRate || 0,
      timeSavedMinutes,
      timeSavedHours: Math.round(timeSavedMinutes / 60 * 10) / 10,
      avgQualityScore: Math.round(stats.avgQualityScore || 0),
      costTracking: {
        apiCalls: stats.totalApiCalls || 0,
        cliCalls: stats.totalCliCalls || 0,
        apiCost: Math.round(apiCost * 100) / 100,
        cliCost: Math.round(cliCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        savings: Math.round(costSavings * 100) / 100,
        savingsPercent: hypotheticalApiCost > 0 
          ? Math.round((costSavings / hypotheticalApiCost) * 100) 
          : 0
      },
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: analyticsData
    });
    
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve analytics',
        data: {
          totalConversations: 0,
          totalSessions: 0,
          totalPatterns: 0,
          successRate: 0,
          timeSavedMinutes: 0,
          timeSavedHours: 0,
          avgQualityScore: 0,
          costTracking: {
            apiCalls: 0,
            cliCalls: 0,
            apiCost: 0,
            cliCost: 0,
            totalCost: 0,
            savings: 0,
            savingsPercent: 0
          },
          lastUpdated: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  }
}
