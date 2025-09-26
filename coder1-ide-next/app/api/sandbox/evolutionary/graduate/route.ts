/**
 * Evolutionary Sandbox API - Memory Graduation
 * 
 * Handles the graduation of successful experiment memories to production memory,
 * including user decisions on what to promote, reject, or learn from
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getEvolutionaryMemoryManager, type MemoryGraduationDecision } from '@/services/evolutionary-memory-manager';

// POST /api/sandbox/evolutionary/graduate - Graduate experiment memories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      experimentId,
      decision, // 'accept' or 'reject'
      reason,
      selectedMemoryIds, // Optional: specific memories to graduate
      targetSessionId // Optional: target session for promoted memories
    } = body;
    
    if (!experimentId || !decision || !reason) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'experimentId, decision, and reason are required' 
        },
        { status: 400 }
      );
    }

    if (!['accept', 'reject'].includes(decision)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'decision must be "accept" or "reject"' 
        },
        { status: 400 }
      );
    }

    const memoryManager = getEvolutionaryMemoryManager();
    
    const graduationDecision: MemoryGraduationDecision = {
      experimentId,
      decision,
      reason,
      selectedMemoryIds,
      targetSessionId
    };

    const graduations = await memoryManager.graduateMemories(graduationDecision);
    
    // Get updated experiment details
    const experiments = await memoryManager.getExperiments('default-user', {
      limit: 1
    });
    const updatedExperiment = experiments.find(exp => exp.id === experimentId);

    logger.info(`🎓 Memory graduation ${decision}: ${experimentId} (${graduations.length} memories processed)`);

    return NextResponse.json({
      success: true,
      graduation: {
        experimentId,
        decision,
        reason,
        processedMemories: graduations.length,
        graduatedAt: new Date().toISOString(),
        targetSessionId
      },
      graduations: graduations.map(grad => ({
        id: grad.id,
        memoryId: grad.memoryId,
        type: grad.graduationType,
        reason: grad.decisionReason,
        graduatedAt: grad.graduatedAt
      })),
      experiment: updatedExperiment ? {
        id: updatedExperiment.id,
        graduated: updatedExperiment.graduated,
        graduationDecision: updatedExperiment.graduationDecision,
        graduationAt: updatedExperiment.graduationAt
      } : null
    });

  } catch (error) {
    logger.error('❌ Failed to graduate memories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to graduate memories',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GET /api/sandbox/evolutionary/graduate - Get graduation candidates and history
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || 'default-user';
    const experimentId = url.searchParams.get('experimentId');
    const showHistory = url.searchParams.get('history') === 'true';

    const memoryManager = getEvolutionaryMemoryManager();

    let response: any = { success: true };

    // If specific experiment requested, get its graduation details
    if (experimentId) {
      const experiments = await memoryManager.getExperiments(userId);
      const experiment = experiments.find(exp => exp.id === experimentId);
      
      if (!experiment) {
        return NextResponse.json(
          { success: false, error: 'Experiment not found' },
          { status: 404 }
        );
      }

      // Get experiment memories
      const memories = await memoryManager.getExperimentMemories(experimentId);
      
      response.experiment = {
        ...experiment,
        memoryCount: memories.length,
        ungraduatedMemories: memories.filter(mem => !mem.graduatedToMain).length,
        eligibleForGraduation: experiment.outcome === 'success' && !experiment.graduated
      };

      response.memories = memories.map(memory => ({
        id: memory.id,
        type: memory.memoryType,
        content: memory.content.substring(0, 200) + (memory.content.length > 200 ? '...' : ''),
        relevanceScore: memory.relevanceScore,
        graduatedToMain: memory.graduatedToMain,
        graduationDate: memory.graduationDate,
        contextData: memory.contextData
      }));
    } else {
      // Get graduation candidates (successful, ungraduated experiments)
      const candidates = await memoryManager.getExperiments(userId, {
        outcome: 'success',
        graduated: false,
        limit: 20
      });

      response.candidates = await Promise.all(
        candidates.map(async (experiment) => {
          const memories = await memoryManager.getExperimentMemories(experiment.id);
          return {
            ...experiment,
            memoryCount: memories.length,
            ungraduatedMemories: memories.filter(mem => !mem.graduatedToMain).length,
            hasValuableMemories: memories.some(mem => 
              mem.memoryType === 'success_pattern' || 
              mem.memoryType === 'lesson_learned' ||
              mem.relevanceScore > 0.7
            )
          };
        })
      );
    }

    // Add graduation history if requested
    if (showHistory) {
      // This would be implemented to show past graduation decisions
      response.history = {
        totalGraduated: 0, // Would come from database query
        recentGraduations: [], // Recent graduation records
        stats: {
          acceptanceRate: 0.75, // Placeholder
          averageMemoriesPerGraduation: 3.2 // Placeholder
        }
      };
    }

    // Add graduation statistics
    response.stats = await memoryManager.getConfidenceStats();

    return NextResponse.json(response);

  } catch (error) {
    logger.error('❌ Failed to get graduation data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get graduation data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE /api/sandbox/evolutionary/graduate - Bulk reject experiment memories
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const experimentIds = url.searchParams.get('experimentIds')?.split(',') || [];
    const reason = url.searchParams.get('reason') || 'Bulk rejection';

    if (experimentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one experimentId is required' },
        { status: 400 }
      );
    }

    const memoryManager = getEvolutionaryMemoryManager();
    const results = [];

    for (const experimentId of experimentIds) {
      try {
        const graduationDecision: MemoryGraduationDecision = {
          experimentId: experimentId.trim(),
          decision: 'reject',
          reason: `Bulk rejection: ${reason}`
        };

        const graduations = await memoryManager.graduateMemories(graduationDecision);
        results.push({
          experimentId: experimentId.trim(),
          success: true,
          processedMemories: graduations.length
        });
      } catch (error) {
        results.push({
          experimentId: experimentId.trim(),
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info(`🗑️ Bulk graduation rejection: ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        reason
      }
    });

  } catch (error) {
    logger.error('❌ Failed to bulk reject graduations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to bulk reject graduations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}