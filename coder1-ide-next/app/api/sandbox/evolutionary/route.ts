/**
 * Evolutionary Sandbox API - Main Experiment Management
 * 
 * Handles creation, management, and analysis of sandbox experiments
 * for the Evolutionary Sandbox Memory System
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getEvolutionaryMemoryManager, type ExperimentCreationConfig } from '@/services/evolutionary-memory-manager';

// GET /api/sandbox/evolutionary - List user's experiments with filtering
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Parse query parameters
    const projectPath = url.searchParams.get('projectPath');
    const outcome = url.searchParams.get('outcome');
    const experimentType = url.searchParams.get('experimentType');
    const graduated = url.searchParams.get('graduated');
    const limit = url.searchParams.get('limit');

    const memoryManager = getEvolutionaryMemoryManager();
    
    const filters = {
      projectPath: projectPath || undefined,
      outcome: outcome as any || undefined,
      experimentType: experimentType as any || undefined,
      graduated: graduated !== null ? graduated === 'true' : undefined,
      limit: limit ? parseInt(limit) : undefined
    };

    const experiments = await memoryManager.getExperiments(userId, filters);
    
    // Get summary statistics
    const stats = await memoryManager.getConfidenceStats();

    return NextResponse.json({
      success: true,
      experiments,
      count: experiments.length,
      stats,
      filters: {
        userId,
        ...filters
      }
    });

  } catch (error) {
    logger.error('❌ Failed to list experiments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list experiments',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST /api/sandbox/evolutionary - Create new sandbox experiment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const { 
      suggestionText, 
      sandboxId, 
      projectPath,
      experimentType = 'general',
      riskLevel,
      contextData 
    } = body;
    
    if (!suggestionText || !sandboxId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'suggestionText and sandboxId are required' 
        },
        { status: 400 }
      );
    }

    const memoryManager = getEvolutionaryMemoryManager();
    
    const config: ExperimentCreationConfig = {
      suggestionText,
      sandboxId,
      userId,
      projectPath: projectPath || '/current-project',
      experimentType,
      riskLevel,
      contextData
    };

    const experiment = await memoryManager.createExperiment(config);
    
    logger.info(`🧪 Created sandbox experiment: ${experiment.id} (confidence: ${Math.round(experiment.confidenceScore * 100)}%)`);

    return NextResponse.json({
      success: true,
      experiment: {
        id: experiment.id,
        sandboxId: experiment.sandboxId,
        suggestionText: experiment.suggestionText,
        confidenceScore: experiment.confidenceScore,
        riskLevel: experiment.riskLevel,
        experimentType: experiment.experimentType,
        createdAt: experiment.createdAt,
        outcome: experiment.outcome
      }
    });

  } catch (error) {
    logger.error('❌ Failed to create experiment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create experiment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// PUT /api/sandbox/evolutionary - Update experiment outcome
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      experimentId,
      outcome,
      filesModified,
      commandsRun,
      errorMessages,
      successMetrics,
      executionTimeMs 
    } = body;
    
    if (!experimentId || !outcome) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'experimentId and outcome are required' 
        },
        { status: 400 }
      );
    }

    const memoryManager = getEvolutionaryMemoryManager();
    
    await memoryManager.updateExperimentOutcome(experimentId, outcome, {
      filesModified,
      commandsRun,
      errorMessages,
      successMetrics,
      executionTimeMs
    });
    
    logger.info(`🎯 Updated experiment outcome: ${experimentId} → ${outcome}`);

    return NextResponse.json({
      success: true,
      experimentId,
      outcome,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Failed to update experiment outcome:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update experiment outcome',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sandbox/evolutionary - Cleanup old experiments
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const olderThanDays = parseInt(url.searchParams.get('olderThanDays') || '30');
    
    if (olderThanDays < 1 || olderThanDays > 365) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'olderThanDays must be between 1 and 365' 
        },
        { status: 400 }
      );
    }

    const memoryManager = getEvolutionaryMemoryManager();
    const deletedCount = await memoryManager.cleanup(olderThanDays);
    
    logger.info(`🧹 Cleaned up ${deletedCount} old experiments`);

    return NextResponse.json({
      success: true,
      deletedCount,
      olderThanDays
    });

  } catch (error) {
    logger.error('❌ Failed to cleanup experiments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup experiments',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}