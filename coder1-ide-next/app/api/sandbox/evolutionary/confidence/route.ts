/**
 * Evolutionary Sandbox API - Confidence Scoring
 * 
 * Analyzes AI suggestions and provides confidence scores, risk assessments,
 * and recommendations for safe experimentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getConfidenceScoringEngine, type ConfidenceContext } from '@/services/confidence-scoring-engine';

// POST /api/sandbox/evolutionary/confidence - Analyze suggestion confidence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      suggestionText,
      experimentType,
      currentFiles,
      recentCommands,
      errorContext,
      projectContext,
      userExperience 
    } = body;
    
    if (!suggestionText) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'suggestionText is required' 
        },
        { status: 400 }
      );
    }

    const confidenceEngine = getConfidenceScoringEngine();
    
    const context: ConfidenceContext = {
      suggestionText,
      experimentType,
      currentFiles: currentFiles || [],
      recentCommands: recentCommands || [],
      errorContext,
      projectContext,
      userExperience: userExperience || 'intermediate'
    };

    const analysis = await confidenceEngine.analyzeConfidence(context);
    
    logger.info(`🎯 Confidence analysis complete: ${Math.round(analysis.confidenceScore * 100)}% (${analysis.confidenceLevel})`);

    return NextResponse.json({
      success: true,
      analysis: {
        confidenceScore: analysis.confidenceScore,
        confidenceLevel: analysis.confidenceLevel,
        riskLevel: analysis.riskLevel,
        reasoning: analysis.reasoning,
        historicalMatch: analysis.historicalMatch,
        similarExperiments: analysis.similarExperiments,
        patternMatches: analysis.patternMatches,
        recommendations: analysis.recommendations,
        adjustmentFactors: analysis.adjustmentFactors
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        suggestionLength: suggestionText.length,
        contextProvided: {
          files: (currentFiles || []).length > 0,
          commands: (recentCommands || []).length > 0,
          error: !!errorContext,
          project: !!projectContext
        }
      }
    });

  } catch (error) {
    logger.error('❌ Failed to analyze confidence:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze confidence',
        details: error instanceof Error ? error.message : String(error),
        // Return safe fallback analysis
        analysis: {
          confidenceScore: 0.5,
          confidenceLevel: 'medium',
          riskLevel: 'medium',
          reasoning: ['Unable to analyze - using default confidence'],
          historicalMatch: false,
          similarExperiments: 0,
          patternMatches: [],
          recommendations: ['Proceed with caution - analysis unavailable'],
          adjustmentFactors: {
            patternMatch: 0,
            complexity: 0,
            risk: 0,
            historical: 0,
            context: 0
          }
        }
      },
      { status: 500 }
    );
  }
}

// GET /api/sandbox/evolutionary/confidence - Get confidence statistics and patterns
export async function GET(request: NextRequest) {
  try {
    const confidenceEngine = getConfidenceScoringEngine();
    
    // Get overall confidence statistics (this would be implemented in the engine)
    const stats = {
      totalAnalyses: 0, // Would come from database
      averageConfidence: 0.65, // Placeholder
      accuracyRate: 0.78, // How often our predictions match reality
      patternCount: 10 // Number of learned patterns
    };

    // Get recent confidence patterns
    const recentPatterns = [
      {
        pattern: 'simple_file_edit',
        successRate: 0.85,
        usage: 45,
        lastUsed: new Date().toISOString()
      },
      {
        pattern: 'package_install',
        successRate: 0.75,
        usage: 23,
        lastUsed: new Date().toISOString()
      }
      // More patterns would be fetched from database
    ];

    return NextResponse.json({
      success: true,
      stats,
      recentPatterns,
      service: {
        name: 'Confidence Scoring Engine',
        version: '1.0.0',
        status: 'healthy'
      }
    });

  } catch (error) {
    logger.error('❌ Failed to get confidence statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get confidence statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}