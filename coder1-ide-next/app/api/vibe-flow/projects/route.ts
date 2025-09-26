/**
 * Project Analytics API Endpoint
 * Provides project-level usage and activity metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectTracker } from '@/services/project-tracker';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get current project data
    const projectData = await projectTracker.getProjectData();
    
    // Transform for dashboard display
    const response = {
      success: true,
      data: {
        projects: projectData.projects.slice(0, 10), // Top 10 projects
        summary: {
          totalProjects: projectData.totalProjects,
          totalTokens: projectData.totalTokens,
          mostActiveProject: projectData.mostActive,
          averageTokensPerProject: projectData.totalProjects > 0 
            ? Math.round(projectData.totalTokens / projectData.totalProjects)
            : 0
        },
        chartData: {
          labels: projectData.projects.slice(0, 5).map(p => p.name),
          datasets: [{
            label: 'Token Usage',
            data: projectData.projects.slice(0, 5).map(p => p.tokensUsed),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',  // Blue
              'rgba(16, 185, 129, 0.8)',  // Green
              'rgba(251, 146, 60, 0.8)',  // Orange
              'rgba(147, 51, 234, 0.8)',  // Purple
              'rgba(236, 72, 153, 0.8)',  // Pink
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(251, 146, 60, 1)',
              'rgba(147, 51, 234, 1)',
              'rgba(236, 72, 153, 1)',
            ],
            borderWidth: 1
          }]
        },
        activityTimeline: projectData.snapshots.slice(-20).map(snapshot => ({
          timestamp: snapshot.timestamp,
          activeProjects: snapshot.projects.length,
          totalTokens: snapshot.projects.reduce((sum, p) => sum + p.tokensUsed, 0)
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to fetch project data:', error);
    
    // Return mock data for development
    return NextResponse.json({
      success: true,
      data: {
        projects: [
          {
            id: 'coder1-ide-next',
            name: 'coder1-ide-next',
            path: '/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next',
            tokensUsed: 0,
            commandsRun: 0,
            filesEdited: 0,
            sessionsCount: 0,
            timeSpent: 0,
            lastActivity: new Date().toISOString(),
            percentageOfTotal: 0
          }
        ],
        summary: {
          totalProjects: 1,
          totalTokens: 0,
          mostActiveProject: null,
          averageTokensPerProject: 0
        },
        chartData: {
          labels: ['coder1-ide-next'],
          datasets: [{
            label: 'Token Usage',
            data: [0],
            backgroundColor: ['rgba(59, 130, 246, 0.8)'],
            borderColor: ['rgba(59, 130, 246, 1)'],
            borderWidth: 1
          }]
        },
        activityTimeline: []
      },
      timestamp: new Date().toISOString()
    });
  }
}

// POST endpoint to track project activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, operation, sessionId } = body;
    
    if (!filePath || !operation) {
      return NextResponse.json(
        { error: 'filePath and operation are required' },
        { status: 400 }
      );
    }
    
    // Track the file operation
    await projectTracker.trackFileOperation(filePath, operation, sessionId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Project activity tracked'
    });
  } catch (error) {
    logger.error('Failed to track project activity:', error);
    return NextResponse.json(
      { error: 'Failed to track project activity' },
      { status: 500 }
    );
  }
}