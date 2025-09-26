/**
 * Evolutionary Sandbox API - Similar Experiments
 * 
 * Finds and analyzes similar past experiments to help predict outcomes
 * and provide historical context for new suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getEvolutionaryMemoryManager } from '@/services/evolutionary-memory-manager';

// POST /api/sandbox/evolutionary/similar - Find similar past experiments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestionText, userId, projectPath, limit = 10 } = body;
    
    if (!suggestionText) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'suggestionText is required' 
        },
        { status: 400 }
      );
    }

    const memoryManager = getEvolutionaryMemoryManager();
    const userIdToUse = userId || request.headers.get('x-user-id') || 'default-user';
    
    // Get all experiments for analysis
    const allExperiments = await memoryManager.getExperiments(userIdToUse, {
      limit: 100, // Analyze more to find similar ones
      projectPath
    });

    // Calculate similarity scores
    const similarExperiments = allExperiments
      .map(experiment => ({
        ...experiment,
        similarityScore: calculateTextSimilarity(suggestionText, experiment.suggestionText)
      }))
      .filter(experiment => experiment.similarityScore > 0.2) // 20% similarity threshold
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    // Calculate statistics
    const stats = {
      totalAnalyzed: allExperiments.length,
      similarFound: similarExperiments.length,
      averageSimilarity: similarExperiments.length > 0 
        ? similarExperiments.reduce((acc, exp) => acc + exp.similarityScore, 0) / similarExperiments.length 
        : 0,
      successRate: similarExperiments.length > 0 
        ? similarExperiments.filter(exp => exp.outcome === 'success').length / similarExperiments.length 
        : 0,
      outcomeDistribution: {
        success: similarExperiments.filter(exp => exp.outcome === 'success').length,
        failure: similarExperiments.filter(exp => exp.outcome === 'failure').length,
        pending: similarExperiments.filter(exp => exp.outcome === 'pending').length,
        abandoned: similarExperiments.filter(exp => exp.outcome === 'abandoned').length
      }
    };

    // Generate insights
    const insights = generateInsights(similarExperiments, stats);

    logger.info(`🔍 Found ${similarExperiments.length} similar experiments for suggestion analysis`);

    return NextResponse.json({
      success: true,
      experiments: similarExperiments.map(exp => ({
        id: exp.id,
        suggestionText: exp.suggestionText,
        similarityScore: exp.similarityScore,
        confidenceScore: exp.confidenceScore,
        riskLevel: exp.riskLevel,
        experimentType: exp.experimentType,
        outcome: exp.outcome,
        graduated: exp.graduated,
        createdAt: exp.createdAt,
        completedAt: exp.completedAt,
        executionTimeMs: exp.executionTimeMs,
        filesModified: exp.filesModified ? JSON.parse(exp.filesModified) : [],
        successMetrics: exp.successMetrics ? JSON.parse(exp.successMetrics) : {}
      })),
      stats,
      insights,
      query: {
        suggestionText: suggestionText.substring(0, 100) + (suggestionText.length > 100 ? '...' : ''),
        limit,
        userId: userIdToUse,
        projectPath
      }
    });

  } catch (error) {
    logger.error('❌ Failed to find similar experiments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to find similar experiments',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GET /api/sandbox/evolutionary/similar - Get similarity analysis statistics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || 'default-user';
    const days = parseInt(url.searchParams.get('days') || '30');

    const memoryManager = getEvolutionaryMemoryManager();
    
    // Get recent experiments for analysis
    const experiments = await memoryManager.getExperiments(userId, {
      limit: 1000 // Analyze many experiments for patterns
    });

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentExperiments = experiments.filter(exp => 
      new Date(exp.createdAt) >= cutoffDate
    );

    // Generate similarity analysis statistics
    const stats = {
      totalExperiments: experiments.length,
      recentExperiments: recentExperiments.length,
      dateRange: {
        from: cutoffDate.toISOString(),
        to: new Date().toISOString(),
        days
      },
      patterns: {
        mostCommonTypes: getMostCommonTypes(recentExperiments),
        successRateByType: getSuccessRateByType(recentExperiments),
        averageConfidence: recentExperiments.reduce((acc, exp) => acc + exp.confidenceScore, 0) / recentExperiments.length || 0
      },
      performance: {
        averageExecutionTime: recentExperiments
          .filter(exp => exp.executionTimeMs > 0)
          .reduce((acc, exp) => acc + exp.executionTimeMs, 0) / recentExperiments.filter(exp => exp.executionTimeMs > 0).length || 0,
        graduationRate: recentExperiments.filter(exp => exp.graduated).length / recentExperiments.length || 0
      }
    };

    return NextResponse.json({
      success: true,
      stats,
      service: {
        name: 'Similar Experiments Engine',
        version: '1.0.0',
        status: 'healthy'
      }
    });

  } catch (error) {
    logger.error('❌ Failed to get similarity statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get similarity statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateTextSimilarity(text1: string, text2: string): number {
  // Handle null/undefined inputs
  if (!text1 || !text2) return 0;
  
  // Simple word-based Jaccard similarity
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function generateInsights(experiments: any[], stats: any): string[] {
  const insights: string[] = [];

  if (experiments.length === 0) {
    insights.push('No similar experiments found - this appears to be a novel suggestion');
    return insights;
  }

  if (stats.successRate > 0.8) {
    insights.push(`High success rate (${Math.round(stats.successRate * 100)}%) for similar experiments`);
  } else if (stats.successRate < 0.4) {
    insights.push(`Low success rate (${Math.round(stats.successRate * 100)}%) for similar experiments - proceed with extra caution`);
  }

  if (stats.averageSimilarity > 0.6) {
    insights.push('Found highly similar past experiments');
  }

  const graduatedCount = experiments.filter(exp => exp.graduated).length;
  if (graduatedCount > 0) {
    insights.push(`${graduatedCount} similar experiment${graduatedCount === 1 ? '' : 's'} graduated to production memory`);
  }

  const avgExecutionTime = experiments
    .filter(exp => exp.executionTimeMs > 0)
    .reduce((acc, exp) => acc + exp.executionTimeMs, 0) / experiments.filter(exp => exp.executionTimeMs > 0).length;
  
  if (avgExecutionTime > 30000) {
    insights.push(`Similar experiments took an average of ${Math.round(avgExecutionTime / 1000)}s to complete`);
  }

  return insights;
}

function getMostCommonTypes(experiments: any[]): Array<{type: string, count: number}> {
  const typeCounts: Record<string, number> = {};
  experiments.forEach(exp => {
    typeCounts[exp.experimentType] = (typeCounts[exp.experimentType] || 0) + 1;
  });
  
  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getSuccessRateByType(experiments: any[]): Array<{type: string, successRate: number, total: number}> {
  const typeStats: Record<string, {success: number, total: number}> = {};
  
  experiments.forEach(exp => {
    if (!typeStats[exp.experimentType]) {
      typeStats[exp.experimentType] = { success: 0, total: 0 };
    }
    typeStats[exp.experimentType].total++;
    if (exp.outcome === 'success') {
      typeStats[exp.experimentType].success++;
    }
  });
  
  return Object.entries(typeStats)
    .map(([type, stats]) => ({
      type,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
      total: stats.total
    }))
    .sort((a, b) => b.successRate - a.successRate);
}