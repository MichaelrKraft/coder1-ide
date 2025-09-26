/**
 * AI Recommendations API Route
 * Provides AI-powered hook recommendations based on usage patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { hooksService } from '@/services/hooks-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const recommendations = await hooksService.getAIRecommendations();
    const healthScore = await hooksService.getHealthScore();
    
    // Transform recommendations for dashboard
    const dashboardRecommendations = recommendations.map(rec => ({
      id: generateRecommendationId(rec.name),
      name: rec.name,
      description: rec.description,
      suggestedPrompt: rec.suggestedPrompt,
      estimatedSavings: rec.estimatedSavings,
      confidence: rec.confidence,
      confidencePercentage: Math.round(rec.confidence * 100),
      pattern: rec.pattern,
      frequency: rec.frequency,
      lastSeen: rec.lastSeen || 'Recently',
      
      // Visual indicators
      priority: getPriority(rec.estimatedSavings, rec.confidence),
      icon: getPatternIcon(rec.pattern),
      color: getConfidenceColor(rec.confidence),
      
      // Action helpers
      canAutomate: rec.confidence > 0.8,
      suggestedTrigger: getSuggestedTrigger(rec.pattern)
    }));
    
    return NextResponse.json({
      success: true,
      recommendations: dashboardRecommendations,
      healthScore,
      healthStatus: getHealthStatus(healthScore),
      summary: {
        totalRecommendations: dashboardRecommendations.length,
        highConfidence: dashboardRecommendations.filter(r => r.confidence > 0.8).length,
        potentialSavings: dashboardRecommendations.reduce((sum, r) => sum + r.estimatedSavings, 0),
        topPattern: dashboardRecommendations[0]?.pattern || 'none'
      }
    });
  } catch (error: any) {
    logger.error('Failed to get AI recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate recommendations',
        recommendations: [],
        healthScore: 50,
        healthStatus: 'unknown',
        summary: {
          totalRecommendations: 0,
          highConfidence: 0,
          potentialSavings: 0,
          topPattern: 'none'
        }
      },
      { status: 500 }
    );
  }
}

// POST /api/hooks/ai-recommendations - Create hook from recommendation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.recommendationId || !body.name || !body.prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields'
        },
        { status: 400 }
      );
    }
    
    // Create hook from recommendation
    const hook = await hooksService.createHook({
      id: body.recommendationId,
      name: body.name,
      description: body.description,
      trigger: body.trigger || 'manual',
      prompt: body.prompt,
      enabled: true,
      category: body.pattern || 'custom',
      confidence: body.confidence || 0.7
    });
    
    return NextResponse.json({
      success: true,
      hook,
      message: 'Hook created from recommendation successfully'
    });
  } catch (error: any) {
    logger.error('Failed to create hook from recommendation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create hook'
      },
      { status: 500 }
    );
  }
}

function generateRecommendationId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getPriority(savings: number, confidence: number): 'high' | 'medium' | 'low' {
  const score = (savings * confidence) / 100;
  if (score > 5) return 'high';
  if (score > 2) return 'medium';
  return 'low';
}

function getPatternIcon(pattern: string): string {
  const iconMap: Record<string, string> = {
    'import-errors': '📦',
    'documentation': '📝',
    'typescript-conversion': '🔄',
    'error-fixing': '🔧',
    'formatting': '✨',
    'testing': '🧪',
    'security': '🔒',
    'performance': '⚡',
    'default': '🤖'
  };
  return iconMap[pattern] || iconMap.default;
}

function getConfidenceColor(confidence: number): string {
  if (confidence > 0.85) return 'green';
  if (confidence > 0.7) return 'blue';
  if (confidence > 0.5) return 'yellow';
  return 'gray';
}

function getSuggestedTrigger(pattern: string): string {
  const triggerMap: Record<string, string> = {
    'import-errors': 'on-import-error',
    'documentation': 'on-function-complete',
    'typescript-conversion': 'on-file-save',
    'error-fixing': 'on-error',
    'formatting': 'on-save',
    'testing': 'on-function-complete',
    'security': 'on-commit',
    'performance': 'on-build'
  };
  return triggerMap[pattern] || 'manual';
}

function getHealthStatus(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'needs-attention';
}