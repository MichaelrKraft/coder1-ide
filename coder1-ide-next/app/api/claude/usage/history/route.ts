/**
 * API endpoint for retrieving historical Claude usage data
 * Returns usage data for specified time ranges with aggregation
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface UsageSnapshot {
  timestamp: string;
  tokens: number;
  cost: number;
  model: string;
  sessionId?: string;
  burnRate?: number;
}

interface DailyUsage {
  date: string;
  snapshots: UsageSnapshot[];
  totalTokens: number;
  totalCost: number;
  sessions: number;
  peakBurnRate: number;
  averageBurnRate: number;
}

interface HistoricalData {
  daily: DailyUsage[];
  weekly: {
    week: string;
    totalTokens: number;
    totalCost: number;
    averageDailyTokens: number;
    averageDailyCost: number;
  }[];
  monthly: {
    month: string;
    totalTokens: number;
    totalCost: number;
    averageDailyTokens: number;
    averageDailyCost: number;
  };
  summary: {
    totalTokens: number;
    totalCost: number;
    averageBurnRate: number;
    peakBurnRate: number;
    totalSessions: number;
    mostUsedModel: string;
    efficiency: number; // tokens per session
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 24h, 7d, 30d, all
    const groupBy = searchParams.get('groupBy') || 'day'; // hour, day, week
    
    const dataDir = path.join(process.cwd(), 'data', 'usage');
    
    // Ensure directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Get all usage files
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
    
    // Determine date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }
    
    // Load and filter data
    const dailyData: DailyUsage[] = [];
    
    for (const file of jsonFiles) {
      const dateStr = file.replace('.json', '');
      const fileDate = new Date(dateStr);
      
      if (fileDate >= startDate) {
        try {
          const filePath = path.join(dataDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          dailyData.push(data);
        } catch (error) {
          logger.error(`Failed to read usage file ${file}:`, error);
        }
      }
    }
    
    // Sort by date
    dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate aggregated data
    const historical = calculateHistoricalData(dailyData, groupBy);
    
    // Format for Chart.js
    const chartData = formatChartData(dailyData, groupBy);
    
    // Calculate project breakdown (mock for now, can be enhanced later)
    const projectBreakdown = calculateProjectBreakdown(dailyData);
    
    // Calculate patterns for automation recommendations
    const patterns = detectUsagePatterns(dailyData);
    
    return NextResponse.json({
      success: true,
      data: {
        range,
        historical,
        chartData,
        projectBreakdown,
        patterns,
        raw: dailyData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get usage history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve usage history',
      timestamp: new Date().toISOString()
    });
  }
}

function calculateHistoricalData(dailyData: DailyUsage[], groupBy: string): HistoricalData {
  const summary = {
    totalTokens: 0,
    totalCost: 0,
    averageBurnRate: 0,
    peakBurnRate: 0,
    totalSessions: 0,
    mostUsedModel: 'claude-3-5-sonnet',
    efficiency: 0
  };
  
  const modelCounts: Record<string, number> = {};
  const allBurnRates: number[] = [];
  const allSessions = new Set<string>();
  
  dailyData.forEach(day => {
    summary.totalTokens += day.totalTokens;
    summary.totalCost += day.totalCost;
    
    if (day.peakBurnRate > summary.peakBurnRate) {
      summary.peakBurnRate = day.peakBurnRate;
    }
    
    if (day.averageBurnRate > 0) {
      allBurnRates.push(day.averageBurnRate);
    }
    
    day.snapshots.forEach(snapshot => {
      if (snapshot.sessionId) {
        allSessions.add(snapshot.sessionId);
      }
      if (snapshot.model) {
        modelCounts[snapshot.model] = (modelCounts[snapshot.model] || 0) + 1;
      }
    });
  });
  
  summary.totalSessions = allSessions.size;
  
  if (allBurnRates.length > 0) {
    summary.averageBurnRate = Math.round(
      allBurnRates.reduce((a, b) => a + b, 0) / allBurnRates.length
    );
  }
  
  // Find most used model
  let maxCount = 0;
  for (const [model, count] of Object.entries(modelCounts)) {
    if (count > maxCount) {
      maxCount = count;
      summary.mostUsedModel = model;
    }
  }
  
  // Calculate efficiency
  if (summary.totalSessions > 0) {
    summary.efficiency = Math.round(summary.totalTokens / summary.totalSessions);
  }
  
  // Calculate weekly aggregates
  const weekly = calculateWeeklyData(dailyData);
  
  // Calculate monthly aggregate
  const monthly = calculateMonthlyData(dailyData);
  
  return {
    daily: dailyData,
    weekly,
    monthly,
    summary
  };
}

function calculateWeeklyData(dailyData: DailyUsage[]) {
  const weeks: Record<string, { tokens: number; cost: number; days: number }> = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = { tokens: 0, cost: 0, days: 0 };
    }
    
    weeks[weekKey].tokens += day.totalTokens;
    weeks[weekKey].cost += day.totalCost;
    weeks[weekKey].days += 1;
  });
  
  return Object.entries(weeks).map(([week, data]) => ({
    week,
    totalTokens: data.tokens,
    totalCost: data.cost,
    averageDailyTokens: Math.round(data.tokens / data.days),
    averageDailyCost: data.cost / data.days
  }));
}

function calculateMonthlyData(dailyData: DailyUsage[]) {
  let totalTokens = 0;
  let totalCost = 0;
  let days = dailyData.length;
  
  dailyData.forEach(day => {
    totalTokens += day.totalTokens;
    totalCost += day.totalCost;
  });
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  return {
    month: currentMonth,
    totalTokens,
    totalCost,
    averageDailyTokens: days > 0 ? Math.round(totalTokens / days) : 0,
    averageDailyCost: days > 0 ? totalCost / days : 0
  };
}

function formatChartData(dailyData: DailyUsage[], groupBy: string) {
  if (groupBy === 'hour') {
    // For hourly view, we need to extract snapshots
    const hourlyData: Record<string, { tokens: number; cost: number }> = {};
    
    dailyData.forEach(day => {
      day.snapshots.forEach(snapshot => {
        const hour = new Date(snapshot.timestamp).toISOString().slice(0, 13);
        if (!hourlyData[hour]) {
          hourlyData[hour] = { tokens: 0, cost: 0 };
        }
        hourlyData[hour].tokens = snapshot.tokens;
        hourlyData[hour].cost = snapshot.cost;
      });
    });
    
    return Object.entries(hourlyData).map(([hour, data]) => ({
      label: new Date(hour + ':00:00').toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      }),
      tokens: data.tokens,
      cost: data.cost
    }));
  } else {
    // Daily view
    return dailyData.map(day => ({
      label: new Date(day.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      tokens: day.totalTokens,
      cost: day.totalCost,
      burnRate: day.averageBurnRate
    }));
  }
}

function calculateProjectBreakdown(dailyData: DailyUsage[]) {
  // This is a placeholder - in a real implementation, you'd track project IDs
  // For now, we'll create mock project data based on sessions
  const projects = [
    { name: 'Coder1 IDE', tokens: 0, cost: 0, percentage: 0 },
    { name: 'Vibe Dashboard', tokens: 0, cost: 0, percentage: 0 },
    { name: 'Agent System', tokens: 0, cost: 0, percentage: 0 },
    { name: 'Other', tokens: 0, cost: 0, percentage: 0 }
  ];
  
  let totalTokens = 0;
  dailyData.forEach(day => {
    totalTokens += day.totalTokens;
  });
  
  if (totalTokens > 0) {
    // Distribute tokens across projects (mock distribution)
    projects[0].tokens = Math.round(totalTokens * 0.4);
    projects[1].tokens = Math.round(totalTokens * 0.25);
    projects[2].tokens = Math.round(totalTokens * 0.2);
    projects[3].tokens = Math.round(totalTokens * 0.15);
    
    projects.forEach(project => {
      project.percentage = Math.round((project.tokens / totalTokens) * 100);
      project.cost = (project.tokens / 1000) * 0.003; // Assuming Sonnet pricing
    });
  }
  
  return projects;
}

function detectUsagePatterns(dailyData: DailyUsage[]) {
  const patterns = [];
  
  // Detect high usage times
  const hourlyUsage: Record<number, number> = {};
  dailyData.forEach(day => {
    day.snapshots.forEach(snapshot => {
      const hour = new Date(snapshot.timestamp).getHours();
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + snapshot.tokens;
    });
  });
  
  // Find peak hours
  const peakHours = Object.entries(hourlyUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
  
  if (peakHours.length > 0) {
    patterns.push({
      type: 'peak_hours',
      description: `Most active during ${peakHours.map(h => `${h}:00`).join(', ')}`,
      recommendation: 'Consider scheduling complex tasks during these productive hours',
      potentialSaving: Math.round(dailyData.reduce((sum, day) => sum + day.totalTokens, 0) * 0.1)
    });
  }
  
  // Detect burn rate patterns
  const avgBurnRate = dailyData.reduce((sum, day) => sum + day.averageBurnRate, 0) / dailyData.length;
  if (avgBurnRate > 500) {
    patterns.push({
      type: 'high_burn_rate',
      description: `Average burn rate of ${Math.round(avgBurnRate)} tokens/hour`,
      recommendation: 'Consider using templates or automation for repetitive tasks',
      potentialSaving: Math.round(avgBurnRate * 24 * 0.2) // 20% potential reduction
    });
  }
  
  // Detect session efficiency
  const totalSessions = dailyData.reduce((sum, day) => sum + day.sessions, 0);
  const totalTokens = dailyData.reduce((sum, day) => sum + day.totalTokens, 0);
  if (totalSessions > 0) {
    const tokensPerSession = totalTokens / totalSessions;
    if (tokensPerSession > 1000) {
      patterns.push({
        type: 'long_sessions',
        description: `Average ${Math.round(tokensPerSession)} tokens per session`,
        recommendation: 'Break down tasks into smaller, focused sessions',
        potentialSaving: Math.round(tokensPerSession * 0.15)
      });
    }
  }
  
  return patterns;
}