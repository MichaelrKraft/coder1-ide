/**
 * Template Recommendation API Endpoint
 * 
 * POST /api/templates/recommend
 * 
 * Accepts user requirements and returns recommended SaaS templates
 * with compatibility scores and match reasons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTemplateRecommender } from '@/services/template-recommender';
import { DetailedRequirements } from '@/services/requirements-gatherer';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    const { requirements, limit, minScore } = body;

    // Validate requirements
    if (!requirements) {
      return NextResponse.json(
        {
          success: false,
          error: 'Requirements are required'
        },
        { status: 400 }
      );
    }

    // Validate requirements structure
    if (!requirements.initialRequest && !requirements.features) {
      return NextResponse.json(
        {
          success: false,
          error: 'Requirements must include initialRequest or features'
        },
        { status: 400 }
      );
    }

    logger.info(`📥 Template recommendation request: "${requirements.initialRequest?.substring(0, 50)}..."`);

    // Get recommender service
    const recommender = getTemplateRecommender();

    // Convert request requirements to DetailedRequirements format
    const detailedReqs: DetailedRequirements = {
      initialRequest: requirements.initialRequest || '',
      projectType: requirements.projectType || 'web-application',
      features: requirements.features || [],
      targetAudience: requirements.targetAudience || 'General users',
      techStack: requirements.techStack || {},
      designRequirements: requirements.designRequirements || {
        responsive: true,
        accessibility: true
      },
      scope: requirements.scope || 'mvp',
      constraints: requirements.constraints || [],
      specificGoals: requirements.specificGoals || [],
      conversationHistory: requirements.conversationHistory || []
    };

    // Get recommendations
    const recommendations = await recommender.getRecommendations(
      detailedReqs,
      limit || 5,
      minScore || 50
    );

    const processingTime = Date.now() - startTime;

    // Calculate average score
    const averageScore = recommendations.length > 0
      ? recommendations.reduce((sum, rec) => sum + rec.compatibilityScore, 0) / recommendations.length
      : 0;

    // Calculate performance metrics
    const totalTemplates = recommender.getAllTemplates().length;
    const perTemplateAvg = totalTemplates > 0 ? processingTime / totalTemplates : 0;
    const topScore = recommendations.length > 0 ? recommendations[0].compatibilityScore : 0;

    logger.info(`✅ Returned ${recommendations.length} recommendations in ${processingTime}ms`);
    logger.info(`📊 Performance: ${perTemplateAvg.toFixed(1)}ms per template, top score: ${topScore}%`);

    return NextResponse.json({
      success: true,
      templates: recommendations,
      totalCount: recommendations.length,
      averageScore: Math.round(averageScore),
      processingTime,
      catalogVersion: recommender.getCatalogVersion(),
      performanceMetrics: {
        totalProcessingTime: processingTime,
        perTemplateAverage: Math.round(perTemplateAvg * 100) / 100,
        templatesEvaluated: totalTemplates,
        recommendationsReturned: recommendations.length,
        topScore,
        cacheHitRate: 'N/A' // Placeholder for future cache analytics
      }
    });

  } catch (error) {
    logger.error('❌ Template recommendation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        templates: [],
        totalCount: 0
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/templates/recommend
 * 
 * Returns all available templates (no filtering)
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('📥 GET all templates request');

    const recommender = getTemplateRecommender();
    const allTemplates = recommender.getAllTemplates();

    return NextResponse.json({
      success: true,
      templates: allTemplates.map(template => ({
        template,
        compatibilityScore: 0,
        matchReasons: []
      })),
      totalCount: allTemplates.length,
      catalogVersion: recommender.getCatalogVersion()
    });

  } catch (error) {
    logger.error('❌ Get templates error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        templates: [],
        totalCount: 0
      },
      { status: 500 }
    );
  }
}
