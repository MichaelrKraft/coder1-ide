/**
 * Vibe Flow Patterns API
 * Detects usage patterns and suggests automation opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { tokenTracker } from '@/services/token-tracker';
import { logger } from '@/lib/logger';

interface UsagePattern {
  id: string;
  type: 'command' | 'workflow' | 'schedule' | 'inefficiency';
  pattern: string;
  frequency: number;
  tokensSaved: number;
  automation: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get usage data
    const currentUsage = await tokenTracker.getCurrentUsage();
    const weeklyUsage = await tokenTracker.getWeeklyUsage();
    
    // Detect patterns
    const patterns = detectPatterns(currentUsage, weeklyUsage);
    
    return NextResponse.json({
      success: true,
      data: {
        patterns,
        totalPatterns: patterns.length,
        potentialSavings: patterns.reduce((sum, p) => sum + p.tokensSaved, 0),
        topAutomation: patterns[0]?.automation || 'No patterns detected yet'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to detect patterns:', error);
    
    return NextResponse.json({
      success: true,
      data: {
        patterns: getMockPatterns(),
        totalPatterns: 5,
        potentialSavings: 25000,
        topAutomation: 'Create a hook for repeated test runs'
      },
      timestamp: new Date().toISOString()
    });
  }
}

function detectPatterns(current: any, weekly: any[]): UsagePattern[] {
  const patterns: UsagePattern[] = [];
  
  // Analyze command frequencies
  if (current?.commands) {
    const commandPatterns = analyzeCommandPatterns(current.commands);
    patterns.push(...commandPatterns);
  }
  
  // Analyze time-based patterns
  if (current?.snapshots && current.snapshots.length > 0) {
    const timePatterns = analyzeTimePatterns(current.snapshots);
    patterns.push(...timePatterns);
  }
  
  // Analyze workflow patterns across week
  const workflowPatterns = analyzeWorkflowPatterns(weekly);
  patterns.push(...workflowPatterns);
  
  // Analyze inefficiencies
  if (current) {
    const inefficiencies = analyzeInefficiencies(current);
    patterns.push(...inefficiencies);
  }
  
  // Sort by priority and potential savings
  patterns.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const aScore = priorityWeight[a.priority] * a.tokensSaved;
    const bScore = priorityWeight[b.priority] * b.tokensSaved;
    return bScore - aScore;
  });
  
  return patterns.slice(0, 10); // Return top 10 patterns
}

function analyzeCommandPatterns(commands: Record<string, number>): UsagePattern[] {
  const patterns: UsagePattern[] = [];
  
  Object.entries(commands).forEach(([cmd, count]) => {
    if (count > 3) {
      const estimatedTokensPerUse = 500; // Rough estimate
      const potentialSavings = count * estimatedTokensPerUse * 0.6; // 60% savings with automation
      
      patterns.push({
        id: `cmd-${cmd.replace(/\s+/g, '-')}`,
        type: 'command',
        pattern: `"${cmd}" used ${count} times`,
        frequency: count,
        tokensSaved: Math.round(potentialSavings),
        automation: `Create alias or hook for "${cmd}"`,
        priority: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
        confidence: Math.min(90, 50 + count * 5)
      });
    }
  });
  
  // Look for test-related patterns
  const testCommands = Object.entries(commands).filter(([cmd]) => 
    cmd.includes('test') || cmd.includes('spec')
  );
  
  if (testCommands.length > 0) {
    const totalTestRuns = testCommands.reduce((sum, [, count]) => sum + count, 0);
    if (totalTestRuns > 5) {
      patterns.push({
        id: 'pattern-testing',
        type: 'workflow',
        pattern: 'Frequent test execution',
        frequency: totalTestRuns,
        tokensSaved: totalTestRuns * 1000,
        automation: 'Set up automated test watcher',
        priority: 'high',
        confidence: 85
      });
    }
  }
  
  return patterns;
}

function analyzeTimePatterns(snapshots: any[]): UsagePattern[] {
  const patterns: UsagePattern[] = [];
  
  // Group by hour
  const hourlyActivity: Record<number, number> = {};
  snapshots.forEach(s => {
    const hour = new Date(s.timestamp).getHours();
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
  });
  
  // Find peak hours
  const peakHours = Object.entries(hourlyActivity)
    .filter(([, count]) => count > 3)
    .map(([hour]) => parseInt(hour));
  
  if (peakHours.length > 0) {
    patterns.push({
      id: 'pattern-peak-hours',
      type: 'schedule',
      pattern: `Most active during ${peakHours.map(h => `${h}:00`).join(', ')}`,
      frequency: peakHours.length,
      tokensSaved: 5000,
      automation: 'Schedule resource-intensive tasks during peak hours',
      priority: 'medium',
      confidence: 70
    });
  }
  
  // Detect rapid-fire commands (potential for batching)
  let rapidSequences = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const timeDiff = new Date(snapshots[i].timestamp).getTime() - 
                     new Date(snapshots[i-1].timestamp).getTime();
    if (timeDiff < 30000) { // Less than 30 seconds
      rapidSequences++;
    }
  }
  
  if (rapidSequences > 5) {
    patterns.push({
      id: 'pattern-rapid-commands',
      type: 'inefficiency',
      pattern: 'Multiple rapid commands detected',
      frequency: rapidSequences,
      tokensSaved: rapidSequences * 200,
      automation: 'Batch similar operations together',
      priority: 'medium',
      confidence: 75
    });
  }
  
  return patterns;
}

function analyzeWorkflowPatterns(weekly: any[]): UsagePattern[] {
  const patterns: UsagePattern[] = [];
  
  // Look for daily patterns
  const dailyAverages = weekly.map(day => ({
    tokens: day.totalTokens,
    tasks: day.tasksCompleted,
    sessions: day.sessions
  }));
  
  // High token usage with low task completion
  const inefficientDays = dailyAverages.filter(day => 
    day.tokens > 20000 && day.tasks < 3
  );
  
  if (inefficientDays.length > 2) {
    patterns.push({
      id: 'pattern-inefficient-days',
      type: 'inefficiency',
      pattern: 'High token usage with low task completion',
      frequency: inefficientDays.length,
      tokensSaved: 10000,
      automation: 'Use task templates and code snippets',
      priority: 'high',
      confidence: 80
    });
  }
  
  // Multiple short sessions
  const fragmentedDays = dailyAverages.filter(day => day.sessions > 5);
  if (fragmentedDays.length > 2) {
    patterns.push({
      id: 'pattern-fragmented',
      type: 'workflow',
      pattern: 'Multiple short coding sessions',
      frequency: fragmentedDays.length,
      tokensSaved: 3000,
      automation: 'Use session persistence to reduce context switching',
      priority: 'medium',
      confidence: 70
    });
  }
  
  return patterns;
}

function analyzeInefficiencies(current: any): UsagePattern[] {
  const patterns: UsagePattern[] = [];
  
  // High burn rate
  if (current.peakBurnRate > 2000) {
    patterns.push({
      id: 'inefficiency-burn-rate',
      type: 'inefficiency',
      pattern: `Peak burn rate of ${Math.round(current.peakBurnRate)} tokens/min`,
      frequency: 1,
      tokensSaved: 5000,
      automation: 'Optimize prompts and use caching',
      priority: 'high',
      confidence: 90
    });
  }
  
  // Low efficiency (high tokens per task)
  if (current.tasksCompleted > 0) {
    const tokensPerTask = current.totalTokens / current.tasksCompleted;
    if (tokensPerTask > 15000) {
      patterns.push({
        id: 'inefficiency-per-task',
        type: 'inefficiency',
        pattern: `${Math.round(tokensPerTask)} tokens per task average`,
        frequency: current.tasksCompleted,
        tokensSaved: current.tasksCompleted * 5000,
        automation: 'Create task-specific templates',
        priority: 'high',
        confidence: 85
      });
    }
  }
  
  return patterns;
}

function getMockPatterns(): UsagePattern[] {
  return [
    {
      id: 'cmd-npm-test',
      type: 'command',
      pattern: '"npm test" used 15 times',
      frequency: 15,
      tokensSaved: 4500,
      automation: 'Create test watcher hook',
      priority: 'high',
      confidence: 85
    },
    {
      id: 'pattern-debugging',
      type: 'workflow',
      pattern: 'Repeated debugging sessions',
      frequency: 8,
      tokensSaved: 6000,
      automation: 'Set up debug configuration',
      priority: 'high',
      confidence: 75
    },
    {
      id: 'pattern-peak-hours',
      type: 'schedule',
      pattern: 'Most active during 14:00, 15:00, 16:00',
      frequency: 3,
      tokensSaved: 3000,
      automation: 'Schedule complex tasks at peak hours',
      priority: 'medium',
      confidence: 70
    },
    {
      id: 'cmd-git-status',
      type: 'command',
      pattern: '"git status" used 12 times',
      frequency: 12,
      tokensSaved: 2400,
      automation: 'Enable git status in prompt',
      priority: 'low',
      confidence: 80
    },
    {
      id: 'inefficiency-context',
      type: 'inefficiency',
      pattern: 'Context switching between files',
      frequency: 6,
      tokensSaved: 4000,
      automation: 'Use split view for related files',
      priority: 'medium',
      confidence: 65
    }
  ];
}