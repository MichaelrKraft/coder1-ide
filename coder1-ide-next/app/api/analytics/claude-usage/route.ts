/**
 * Analytics endpoint for Claude usage data
 * This is what VibeDashboard expects to call
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { calculateCost, formatCost, calculateBurnRate, getEfficiencyRating, calculateMonthlyProjection } from '@/lib/cost-calculator';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Get current usage from ccusage command
    let currentTokens = 0;
    try {
      const { stdout } = await execAsync('ccusage 2>/dev/null || echo "0"');
      const parsedUsage = parseInt(stdout.trim(), 10);
      if (!isNaN(parsedUsage)) {
        currentTokens = parsedUsage;
      }
    } catch (error) {
      logger.debug('ccusage command not available, using stored data');
    }

    // Get historical data
    const dataDir = path.join(process.cwd(), 'data', 'usage');
    const today = new Date().toISOString().split('T')[0];
    const dailyPath = path.join(dataDir, `${today}.json`);
    
    let dailyData: any = {
      date: today,
      snapshots: [],
      totalTokens: currentTokens,
      totalCost: 0,
      sessions: 0,
      peakBurnRate: 0,
      averageBurnRate: 0
    };

    try {
      const fileContent = await fs.readFile(dailyPath, 'utf-8');
      dailyData = JSON.parse(fileContent);
      
      // Update with latest if we got fresh data
      if (currentTokens > dailyData.totalTokens) {
        dailyData.totalTokens = currentTokens;
      }
    } catch (error) {
      // File doesn't exist yet, use defaults
    }

    // Calculate current cost
    const currentCost = calculateCost(dailyData.totalTokens, 'claude-3-5-sonnet');
    dailyData.totalCost = currentCost;

    // Get weekly data
    const weeklyData = await getWeeklyData();
    
    // Calculate statistics
    const totalTokensWeek = weeklyData.reduce((sum, day) => sum + day.totalTokens, 0);
    const totalCostWeek = weeklyData.reduce((sum, day) => sum + day.totalCost, 0);
    const avgDailyTokens = weeklyData.length > 0 ? totalTokensWeek / weeklyData.length : 0;
    
    // Calculate burn rate
    let burnRate = dailyData.averageBurnRate || 0;
    if (dailyData.snapshots.length > 1) {
      const firstSnapshot = dailyData.snapshots[0];
      const lastSnapshot = dailyData.snapshots[dailyData.snapshots.length - 1];
      const timeElapsed = new Date(lastSnapshot.timestamp).getTime() - new Date(firstSnapshot.timestamp).getTime();
      burnRate = calculateBurnRate(lastSnapshot.tokens, firstSnapshot.tokens, timeElapsed);
    }

    // Get efficiency rating
    const sessionsCount = dailyData.sessions || 1;
    const tokensPerSession = Math.round(dailyData.totalTokens / sessionsCount);
    const efficiency = getEfficiencyRating(tokensPerSession);

    // Calculate monthly projection
    const monthlyProjection = calculateMonthlyProjection(avgDailyTokens);

    // Format response for VibeDashboard
    const response = {
      success: true,
      data: {
        // Current usage
        current: {
          tokens: dailyData.totalTokens,
          cost: currentCost,
          formattedCost: formatCost(currentCost),
          burnRate: burnRate,
          efficiency: efficiency.rating,
          efficiencyTip: efficiency.recommendation
        },
        
        // Daily stats
        daily: {
          tokens: dailyData.totalTokens,
          cost: dailyData.totalCost,
          sessions: dailyData.sessions,
          averageBurnRate: dailyData.averageBurnRate,
          peakBurnRate: dailyData.peakBurnRate
        },
        
        // Weekly stats
        weekly: {
          totalTokens: totalTokensWeek,
          totalCost: totalCostWeek,
          averageDailyTokens: Math.round(avgDailyTokens),
          averageDailyCost: totalCostWeek / 7,
          data: weeklyData.map(day => ({
            date: day.date,
            tokens: day.totalTokens,
            cost: day.totalCost
          }))
        },
        
        // Monthly projection
        monthly: {
          projectedTokens: monthlyProjection.tokens,
          projectedCost: monthlyProjection.cost,
          formattedCost: monthlyProjection.formatted
        },
        
        // Chart data for VibeDashboard
        chartData: {
          labels: weeklyData.map(day => new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
          datasets: [{
            label: 'Tokens',
            data: weeklyData.map(day => day.totalTokens),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        
        // Usage patterns (for pattern detection tab)
        patterns: [
          {
            type: 'peak_usage',
            description: `Most active: ${burnRate > 500 ? 'High activity periods' : 'Moderate usage'}`,
            recommendation: burnRate > 500 ? 'Consider batching similar tasks' : 'Usage pattern is optimal'
          },
          {
            type: 'efficiency',
            description: `${tokensPerSession} tokens per session average`,
            recommendation: efficiency.recommendation
          }
        ],
        
        // Budget predictions (for predictions tab)
        predictions: {
          dailyBudget: formatCost(avgDailyTokens * 0.003), // Rough estimate
          weeklyBudget: formatCost(totalCostWeek),
          monthlyBudget: monthlyProjection.formatted,
          recommendedDailyLimit: Math.round(avgDailyTokens * 1.2) // 20% buffer
        }
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get analytics data:', error);
    
    // Return mock data as fallback (same structure VibeDashboard expects)
    return NextResponse.json({
      success: true,
      data: {
        current: {
          tokens: 0,
          cost: 0,
          formattedCost: '$0.00',
          burnRate: 0,
          efficiency: 'good',
          efficiencyTip: 'No usage data available yet'
        },
        daily: {
          tokens: 0,
          cost: 0,
          sessions: 0,
          averageBurnRate: 0,
          peakBurnRate: 0
        },
        weekly: {
          totalTokens: 0,
          totalCost: 0,
          averageDailyTokens: 0,
          averageDailyCost: 0,
          data: []
        },
        monthly: {
          projectedTokens: 0,
          projectedCost: 0,
          formattedCost: '$0.00'
        },
        chartData: {
          labels: [],
          datasets: []
        },
        patterns: [],
        predictions: {
          dailyBudget: '$0.00',
          weeklyBudget: '$0.00',
          monthlyBudget: '$0.00',
          recommendedDailyLimit: 0
        }
      },
      timestamp: new Date().toISOString()
    });
  }
}

async function getWeeklyData() {
  const dataDir = path.join(process.cwd(), 'data', 'usage');
  const weekData = [];
  
  try {
    await fs.mkdir(dataDir, { recursive: true });
    
    // Get last 7 days of data
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(dataDir, `${dateStr}.json`);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const dayData = JSON.parse(content);
        weekData.push(dayData);
      } catch (error) {
        // Day file doesn't exist, add empty data
        weekData.push({
          date: dateStr,
          totalTokens: 0,
          totalCost: 0,
          sessions: 0,
          averageBurnRate: 0,
          peakBurnRate: 0
        });
      }
    }
  } catch (error) {
    logger.error('Failed to get weekly data:', error);
  }
  
  return weekData.reverse(); // Return in chronological order
}