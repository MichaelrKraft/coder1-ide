/**
 * API endpoint for tracking Claude usage over time
 * Collects current usage and stores it with timestamp for historical tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

// Model pricing per 1K tokens
const MODEL_PRICING = {
  'claude-3-opus': { input: 0.015, output: 0.075 },    // $15/$75 per million
  'claude-3-sonnet': { input: 0.003, output: 0.015 },  // $3/$15 per million
  'claude-3-haiku': { input: 0.00025, output: 0.00125 }, // $0.25/$1.25 per million
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 }, // Latest Sonnet pricing
  'gpt-4': { input: 0.03, output: 0.06 },              // For comparison
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
};

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { model = 'claude-3-5-sonnet', sessionId } = body;
    
    // Get current usage from ccusage command
    const { stdout, stderr } = await execAsync('ccusage 2>/dev/null || echo "0"');
    
    if (stderr && !stderr.includes('command not found')) {
      logger.error('ccusage error:', stderr);
    }
    
    // Parse token count
    const usage = stdout.trim();
    let tokens = 0;
    
    const parsedUsage = parseInt(usage, 10);
    if (!isNaN(parsedUsage)) {
      tokens = parsedUsage;
    }
    
    // Calculate cost based on model (assuming 30% input, 70% output for typical usage)
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['claude-3-5-sonnet'];
    const inputTokens = tokens * 0.3;
    const outputTokens = tokens * 0.7;
    const cost = ((inputTokens * pricing.input + outputTokens * pricing.output) / 1000);
    
    // Create snapshot
    const snapshot: UsageSnapshot = {
      timestamp: new Date().toISOString(),
      tokens,
      cost,
      model,
      sessionId
    };
    
    // Calculate burn rate (tokens per hour) based on previous snapshot
    const previousSnapshot = await getPreviousSnapshot();
    if (previousSnapshot) {
      const timeDiff = Date.now() - new Date(previousSnapshot.timestamp).getTime();
      const tokenDiff = tokens - previousSnapshot.tokens;
      const hoursElapsed = timeDiff / (1000 * 60 * 60);
      if (hoursElapsed > 0 && tokenDiff > 0) {
        snapshot.burnRate = Math.round(tokenDiff / hoursElapsed);
      }
    }
    
    // Store snapshot
    await storeSnapshot(snapshot);
    
    // Get current day's usage summary
    const dailyUsage = await getDailyUsage();
    
    return NextResponse.json({
      success: true,
      current: {
        tokens,
        cost: cost.toFixed(4),
        formattedCost: `$${cost.toFixed(4)}`,
        model,
        burnRate: snapshot.burnRate || 0
      },
      daily: {
        totalTokens: dailyUsage.totalTokens,
        totalCost: dailyUsage.totalCost,
        sessions: dailyUsage.sessions,
        averageBurnRate: dailyUsage.averageBurnRate
      },
      timestamp: snapshot.timestamp
    });
  } catch (error) {
    logger.error('Failed to track usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to track usage',
      timestamp: new Date().toISOString()
    });
  }
}

async function getPreviousSnapshot(): Promise<UsageSnapshot | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dataDir = path.join(process.cwd(), 'data', 'usage');
    const filePath = path.join(dataDir, `${today}.json`);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data: DailyUsage = JSON.parse(fileContent);
    
    if (data.snapshots && data.snapshots.length > 0) {
      return data.snapshots[data.snapshots.length - 1];
    }
  } catch (error) {
    // File doesn't exist or is empty
  }
  
  return null;
}

async function storeSnapshot(snapshot: UsageSnapshot): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const dataDir = path.join(process.cwd(), 'data', 'usage');
  const filePath = path.join(dataDir, `${today}.json`);
  
  // Ensure directory exists
  await fs.mkdir(dataDir, { recursive: true });
  
  let dailyData: DailyUsage;
  
  try {
    // Try to read existing file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    dailyData = JSON.parse(fileContent);
  } catch (error) {
    // Create new daily data structure
    dailyData = {
      date: today,
      snapshots: [],
      totalTokens: 0,
      totalCost: 0,
      sessions: 0,
      peakBurnRate: 0,
      averageBurnRate: 0
    };
  }
  
  // Add new snapshot
  dailyData.snapshots.push(snapshot);
  
  // Update daily statistics
  dailyData.totalTokens = snapshot.tokens;
  dailyData.totalCost = snapshot.cost;
  
  // Count unique sessions
  const uniqueSessions = new Set(dailyData.snapshots.map(s => s.sessionId).filter(Boolean));
  dailyData.sessions = uniqueSessions.size;
  
  // Calculate burn rates
  const burnRates = dailyData.snapshots.map(s => s.burnRate || 0).filter(r => r > 0);
  if (burnRates.length > 0) {
    dailyData.peakBurnRate = Math.max(...burnRates);
    dailyData.averageBurnRate = Math.round(burnRates.reduce((a, b) => a + b, 0) / burnRates.length);
  }
  
  // Write updated data
  await fs.writeFile(filePath, JSON.stringify(dailyData, null, 2));
  
  logger.debug(`Usage tracked: ${snapshot.tokens} tokens, $${snapshot.cost.toFixed(4)}`);
}

async function getDailyUsage(): Promise<DailyUsage> {
  const today = new Date().toISOString().split('T')[0];
  const dataDir = path.join(process.cwd(), 'data', 'usage');
  const filePath = path.join(dataDir, `${today}.json`);
  
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return {
      date: today,
      snapshots: [],
      totalTokens: 0,
      totalCost: 0,
      sessions: 0,
      peakBurnRate: 0,
      averageBurnRate: 0
    };
  }
}

// GET endpoint to retrieve current tracked data
export async function GET(request: NextRequest) {
  try {
    const dailyUsage = await getDailyUsage();
    const latestSnapshot = dailyUsage.snapshots[dailyUsage.snapshots.length - 1];
    
    return NextResponse.json({
      success: true,
      current: latestSnapshot || { tokens: 0, cost: 0, model: 'claude-3-5-sonnet' },
      daily: dailyUsage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get tracked usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get tracked usage',
      timestamp: new Date().toISOString()
    });
  }
}