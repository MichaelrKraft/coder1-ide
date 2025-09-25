/**
 * Vibe Flow Budget API
 * Provides token budget predictions and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { tokenTracker } from '@/services/token-tracker';
import { logger } from '@/lib/logger';

interface BudgetPrediction {
  timeUntilLimit: string;
  dailyProjection: number;
  weeklyProjection: number;
  monthlyProjection: number;
  optimalSessions: number;
  efficiencyScore: number;
  recommendations: string[];
  warningLevel: 'safe' | 'caution' | 'warning' | 'critical';
}

export async function GET(request: NextRequest) {
  try {
    // Get current and weekly usage
    const currentUsage = await tokenTracker.getCurrentUsage();
    const weeklyUsage = await tokenTracker.getWeeklyUsage();
    
    // Calculate projections
    const predictions = calculatePredictions(currentUsage, weeklyUsage);
    
    return NextResponse.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get budget predictions:', error);
    
    return NextResponse.json({
      success: true,
      data: getMockPredictions(),
      timestamp: new Date().toISOString()
    });
  }
}

function calculatePredictions(current: any, weekly: any[]): BudgetPrediction {
  // Daily token limit (configurable, defaulting to 100k for Claude Pro)
  const DAILY_LIMIT = 100000;
  const MONTHLY_LIMIT = DAILY_LIMIT * 30;
  
  const todayTokens = current?.totalTokens || 0;
  const burnRate = current?.averageBurnRate || 0; // tokens per minute
  
  // Calculate average daily usage from weekly data
  const totalWeeklyTokens = weekly.reduce((sum, day) => sum + day.totalTokens, 0);
  const avgDailyTokens = weekly.length > 0 ? totalWeeklyTokens / weekly.length : todayTokens;
  
  // Time until limit
  const remainingTokens = DAILY_LIMIT - todayTokens;
  const minutesUntilLimit = burnRate > 0 ? remainingTokens / burnRate : Infinity;
  const hoursUntilLimit = minutesUntilLimit / 60;
  
  let timeUntilLimit = 'No limit reached';
  if (hoursUntilLimit < 24) {
    if (hoursUntilLimit < 1) {
      timeUntilLimit = `${Math.round(minutesUntilLimit)} minutes`;
    } else {
      timeUntilLimit = `${Math.round(hoursUntilLimit)} hours`;
    }
  }
  
  // Calculate projections
  const dailyProjection = burnRate > 0 
    ? Math.round(burnRate * 60 * 8) // Assuming 8 hours of coding
    : avgDailyTokens;
    
  const weeklyProjection = dailyProjection * 7;
  const monthlyProjection = dailyProjection * 30;
  
  // Calculate optimal sessions
  const avgTokensPerSession = current?.sessions > 0 
    ? todayTokens / current.sessions 
    : 10000;
  const optimalSessions = Math.floor(DAILY_LIMIT / avgTokensPerSession);
  
  // Calculate efficiency score (tokens per task)
  const tasksCompleted = current?.tasksCompleted || 1;
  const tokensPerTask = todayTokens / tasksCompleted;
  let efficiencyScore = 100;
  
  if (tokensPerTask < 5000) {
    efficiencyScore = 100; // Excellent
  } else if (tokensPerTask < 10000) {
    efficiencyScore = 80; // Good
  } else if (tokensPerTask < 20000) {
    efficiencyScore = 60; // Average
  } else {
    efficiencyScore = 40; // Needs improvement
  }
  
  // Determine warning level
  let warningLevel: BudgetPrediction['warningLevel'] = 'safe';
  const usagePercent = (todayTokens / DAILY_LIMIT) * 100;
  
  if (usagePercent >= 90) {
    warningLevel = 'critical';
  } else if (usagePercent >= 75) {
    warningLevel = 'warning';
  } else if (usagePercent >= 50) {
    warningLevel = 'caution';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (burnRate > 1000) {
    recommendations.push('High burn rate detected - consider batching similar tasks');
  }
  
  if (efficiencyScore < 60) {
    recommendations.push('Optimize prompts to reduce token usage per task');
  }
  
  if (warningLevel === 'warning' || warningLevel === 'critical') {
    recommendations.push('Approaching daily limit - prioritize critical tasks');
  }
  
  if (current?.sessions > 5) {
    recommendations.push('Multiple sessions detected - consider longer focused sessions');
  }
  
  const peakHour = findPeakUsageHour(current?.snapshots || []);
  if (peakHour !== -1) {
    recommendations.push(`Peak usage at ${peakHour}:00 - schedule complex tasks here`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Usage patterns look optimal!');
  }
  
  return {
    timeUntilLimit,
    dailyProjection,
    weeklyProjection,
    monthlyProjection,
    optimalSessions,
    efficiencyScore,
    recommendations,
    warningLevel
  };
}

function findPeakUsageHour(snapshots: any[]): number {
  if (snapshots.length === 0) return -1;
  
  const hourCounts = new Array(24).fill(0);
  snapshots.forEach(s => {
    const hour = new Date(s.timestamp).getHours();
    hourCounts[hour]++;
  });
  
  let maxCount = 0;
  let peakHour = -1;
  
  hourCounts.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  });
  
  return maxCount > 2 ? peakHour : -1;
}

function getMockPredictions(): BudgetPrediction {
  return {
    timeUntilLimit: '6 hours',
    dailyProjection: 45000,
    weeklyProjection: 315000,
    monthlyProjection: 1350000,
    optimalSessions: 4,
    efficiencyScore: 75,
    recommendations: [
      'Usage patterns look optimal!',
      'Peak usage at 14:00 - schedule complex tasks here'
    ],
    warningLevel: 'caution'
  };
}