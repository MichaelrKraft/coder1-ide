import { NextRequest, NextResponse } from 'next/server';
import { aiOrchestrator } from '@/services/ai-agent-orchestrator';
import { enhancedMemoryContext, type RAGQuery } from '@/services/enhanced-memory-context';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement = 'Build a React authentication system' } = body;

    logger.debug('🚀 Starting Enhanced AI Agent Context Demo');
    logger.debug(`📋 Requirement: ${requirement}`);

    // Step 1: Show what context the AI agent would receive
    const projectContext = aiOrchestrator.parseProjectRequirement(requirement);
    const workflowId = aiOrchestrator.selectWorkflow(projectContext);
    
    logger.debug(`🔍 Parsed context: ${projectContext.projectType}, ${projectContext.framework}`);
    logger.debug(`📋 Selected workflow: ${workflowId}`);

    // Step 2: Simulate RAG query that would be made for the agent
    const ragQuery: RAGQuery = {
      projectType: projectContext.projectType,
      framework: projectContext.framework,
      features: projectContext.features,
      agentType: 'frontend-engineer', // Example agent
      taskDescription: requirement,
      timeframe: 'last_30_days',
      limit: 3
    };

    // Step 3: Get enhanced memory context
    const memoryContext = await enhancedMemoryContext.getMemoryContext(ragQuery);

    // Step 4: Build the enhanced context string that would be sent to Claude
    const contextParts = [
      `Project Requirement: ${requirement}`,
      `Project Type: ${projectContext.projectType}`,
      `Framework: ${projectContext.framework}`,
      `Features: ${projectContext.features.join(', ')}`,
      ''
    ];

    // Add session history context
    if (memoryContext.sessionHistory.length > 0) {
      contextParts.push('## Recent Project History');
      memoryContext.sessionHistory.forEach((session, index) => {
        contextParts.push(`### Session ${index + 1} (${session.timestamp.toLocaleDateString()})`);
        
        if (session.terminal.length > 0) {
          contextParts.push(`Commands: ${session.terminal.slice(0, 3).join(', ')}`);
        }
        
        if (session.fileChanges.length > 0) {
          contextParts.push(`Files: ${session.fileChanges.slice(0, 3).join(', ')}`);
        }
        
        // Extract key learnings from session content
        const keyLines = session.content.split('\n')
          .filter(line => line.includes('##') || line.includes('**') || line.includes('Issue:') || line.includes('Fix:'))
          .slice(0, 2);
        
        if (keyLines.length > 0) {
          contextParts.push(`Key Points: ${keyLines.join(' | ')}`);
        }
        
        contextParts.push('');
      });
    }

    // Add relevant patterns and insights
    if (memoryContext.relevantPatterns.length > 0) {
      contextParts.push('## Your Established Patterns');
      memoryContext.relevantPatterns.forEach(pattern => {
        contextParts.push(`- ${pattern.content} (used ${pattern.usageCount} times)`);
      });
      contextParts.push('');
    }

    // Add successful approaches
    if (memoryContext.successfulApproaches.length > 0) {
      contextParts.push('## Proven Approaches That Worked');
      memoryContext.successfulApproaches.forEach(approach => {
        const duration = approach.timeTaken ? ` (${Math.round(approach.timeTaken / 1000 / 60)}min)` : '';
        contextParts.push(`- ${approach.taskDescription}: ${approach.approachUsed}${duration}`);
        if (approach.filesModified.length > 0) {
          contextParts.push(`  Files: ${approach.filesModified.slice(0, 3).join(', ')}`);
        }
      });
      contextParts.push('');
    }

    // Add common issues to avoid
    if (memoryContext.commonIssues.length > 0) {
      contextParts.push('## Known Issues to Avoid');
      memoryContext.commonIssues.forEach(issue => {
        contextParts.push(`- ${issue.content}`);
      });
      contextParts.push('');
    }

    const enhancedContext = contextParts.join('\n');

    // Step 5: Compare with basic context (what agents had before)
    const basicContext = [
      `Project Requirement: ${requirement}`,
      `Project Type: ${projectContext.projectType}`,
      `Framework: ${projectContext.framework}`,
      `Features: ${projectContext.features.join(', ')}`
    ].join('\n');

    const response = {
      success: true,
      demo: {
        requirement,
        projectContext: {
          type: projectContext.projectType,
          framework: projectContext.framework,
          features: projectContext.features,
          selectedWorkflow: workflowId
        },
        ragQuery,
        memoryStats: {
          sessionHistory: memoryContext.sessionHistory.length,
          relevantPatterns: memoryContext.relevantPatterns.length,
          successfulApproaches: memoryContext.successfulApproaches.length,
          commonIssues: memoryContext.commonIssues.length,
          relatedOutcomes: memoryContext.relatedOutcomes.length
        },
        contextComparison: {
          basic: {
            length: basicContext.length,
            content: basicContext
          },
          enhanced: {
            length: enhancedContext.length,
            content: enhancedContext,
            enhancement: `${Math.round((enhancedContext.length / basicContext.length) * 100)}% more context`
          }
        },
        benefits: [
          `🧠 Agent knows about ${memoryContext.sessionHistory.length} recent development sessions`,
          `📋 Agent has access to ${memoryContext.relevantPatterns.length} established patterns`,
          `✅ Agent knows ${memoryContext.successfulApproaches.length} proven approaches that worked`,
          `⚠️ Agent is aware of ${memoryContext.commonIssues.length} common issues to avoid`,
          `📊 Total context is ${Math.round((enhancedContext.length / basicContext.length) * 100)}% richer than before`
        ],
        samplePrompt: `Frontend Engineer Agent would receive this enhanced context:

${enhancedContext}

## Current Assignment
Build React authentication components and forms

## Expected Output
Please provide:
1. Brief analysis of the requirements
2. Implementation approach based on your established patterns
3. Complete code files for authentication components
4. Any setup instructions or dependencies

Generate production-ready code that follows your proven practices and avoids the known issues listed above.`
      }
    };

    logger.debug('✅ Enhanced AI Agent Context Demo completed');
    logger.debug(`📊 Enhanced context is ${Math.round((enhancedContext.length / basicContext.length) * 100)}% richer`);
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('❌ Enhanced context demo failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Enhanced AI Agent Context Demo API',
    description: 'Demonstrates how AI agents now receive rich context from your project history',
    usage: {
      endpoint: '/api/agent/enhanced-context-demo',
      method: 'POST',
      body: {
        requirement: 'Build a React authentication system'
      }
    },
    features: [
      'Session history integration',
      'Established pattern recognition',
      'Successful approach recommendations',
      'Common issue awareness',
      'RAG-powered context enhancement'
    ]
  });
}