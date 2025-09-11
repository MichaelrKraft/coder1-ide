/**
 * Memory-Enhanced Single Agent Service
 * Provides intelligent single-agent responses with memory context and smart team suggestions
 */

import { enhancedMemoryContext, type RAGQuery, type MemoryContext } from './enhanced-memory-context';
import type { AIProjectContext } from '@/types/session';

export interface MemoryInsight {
  type: 'pattern' | 'success' | 'warning' | 'suggestion';
  content: string;
  confidence: number;
  usageCount?: number;
  source: string;
}

export interface TeamSuggestion {
  triggered: boolean;
  reason: string;
  confidence: number;
  recommendedTeam: {
    name: string;
    agents: string[];
    description: string;
    successRate?: number;
    previousUse?: string;
  };
  benefits: string[];
}

export interface EnhancedAgentResponse {
  response: string;
  memoryInsights: MemoryInsight[];
  teamSuggestion?: TeamSuggestion;
  contextEnhancement: {
    patternsApplied: number;
    historicalReferences: number;
    personalizedElements: number;
  };
}

class MemoryEnhancedAgent {
  /**
   * Analyze user request and determine if memory context should be applied
   */
  private async shouldUseMemoryContext(userRequest: string): Promise<boolean> {
    const memoryTriggers = [
      'project', 'app', 'build', 'create', 'implement', 'develop',
      'react', 'node', 'typescript', 'javascript', 'api', 'database',
      'authentication', 'dashboard', 'form', 'component'
    ];
    
    const requestLower = userRequest.toLowerCase();
    return memoryTriggers.some(trigger => requestLower.includes(trigger));
  }

  /**
   * Extract project context from user request
   */
  private extractProjectContext(userRequest: string): Partial<AIProjectContext> {
    const requestLower = userRequest.toLowerCase();
    
    // Framework detection
    let framework = 'react'; // default
    if (requestLower.includes('vue')) framework = 'vue';
    if (requestLower.includes('angular')) framework = 'angular';
    if (requestLower.includes('node')) framework = 'nodejs';
    if (requestLower.includes('next')) framework = 'nextjs';
    if (requestLower.includes('svelte')) framework = 'svelte';

    // Project type detection  
    let projectType = 'web-application';
    if (requestLower.includes('dashboard')) projectType = 'dashboard';
    if (requestLower.includes('api') && !requestLower.includes('web')) projectType = 'api';
    if (requestLower.includes('mobile')) projectType = 'mobile-app';
    if (requestLower.includes('desktop')) projectType = 'desktop-app';

    // Feature detection
    const features: string[] = [];
    if (requestLower.includes('auth')) features.push('authentication');
    if (requestLower.includes('database') || requestLower.includes('db')) features.push('database');
    if (requestLower.includes('api')) features.push('api');
    if (requestLower.includes('form')) features.push('forms');
    if (requestLower.includes('chart') || requestLower.includes('analytics')) features.push('data-visualization');
    if (requestLower.includes('test')) features.push('testing');
    if (requestLower.includes('deploy')) features.push('deployment');

    return { projectType, framework, features };
  }

  /**
   * Determine if team suggestion should be triggered
   */
  private async analyzeTeamNeed(
    userRequest: string,
    projectContext: Partial<AIProjectContext>,
    memoryContext: MemoryContext
  ): Promise<TeamSuggestion | undefined> {
    const requestLower = userRequest.toLowerCase();
    
    // Complexity indicators that suggest team work
    const complexityIndicators = [
      'full', 'complete', 'entire', 'whole', 'full-stack',
      'backend', 'frontend', 'database', 'api', 'authentication',
      'deploy', 'production', 'scale', 'multiple'
    ];

    const complexityScore = complexityIndicators.reduce((score, indicator) => {
      return score + (requestLower.includes(indicator) ? 1 : 0);
    }, 0);

    // Multi-domain detection
    const domains = {
      frontend: ['react', 'vue', 'angular', 'ui', 'component', 'styling', 'tailwind'],
      backend: ['api', 'server', 'database', 'node', 'express', 'fastify'],
      database: ['database', 'postgres', 'mysql', 'mongodb', 'sql'],
      testing: ['test', 'testing', 'jest', 'cypress', 'playwright'],
      deployment: ['deploy', 'production', 'docker', 'aws', 'vercel']
    };

    const detectedDomains = Object.entries(domains).filter(([domain, keywords]) =>
      keywords.some(keyword => requestLower.includes(keyword))
    ).map(([domain]) => domain);

    // Check if user has successful team patterns for similar projects
    const similarSuccessfulTeams = memoryContext.successfulApproaches.filter(approach =>
      approach.agentType === 'coordinator' || approach.taskDescription.includes('team')
    );

    // Trigger team suggestion if:
    // 1. High complexity (3+ indicators)
    // 2. Multiple domains detected (2+)  
    // 3. User has successful team history for similar projects
    const shouldSuggestTeam = 
      complexityScore >= 3 || 
      detectedDomains.length >= 2 || 
      similarSuccessfulTeams.length > 0;

    if (!shouldSuggestTeam) return undefined;

    // Determine recommended team based on detected domains and user history
    let recommendedTeam = {
      name: 'Full Stack Team',
      agents: ['frontend-specialist', 'backend-engineer', 'qa-agent'],
      description: 'Complete development team for full-stack projects',
      successRate: undefined as number | undefined,
      previousUse: undefined as string | undefined
    };

    // Customize based on detected domains
    if (detectedDomains.includes('frontend') && !detectedDomains.includes('backend')) {
      recommendedTeam = {
        name: 'Frontend Team',
        agents: ['frontend-specialist', 'ui-designer', 'qa-agent'],
        description: 'Specialized team for React/UI development',
        successRate: undefined,
        previousUse: undefined
      };
    } else if (detectedDomains.includes('backend') && !detectedDomains.includes('frontend')) {
      recommendedTeam = {
        name: 'Backend Team',
        agents: ['backend-engineer', 'database-specialist', 'api-designer'],
        description: 'Specialized team for API and server development',
        successRate: undefined,
        previousUse: undefined
      };
    }

    // Add historical context if available
    if (similarSuccessfulTeams.length > 0) {
      const successRate = similarSuccessfulTeams.reduce((acc, team) => 
        acc + (team.successRating || 0), 0) / similarSuccessfulTeams.length;
      recommendedTeam.successRate = Math.round(successRate * 100);
      recommendedTeam.previousUse = `Used successfully in ${similarSuccessfulTeams.length} similar projects`;
    }

    const benefits = [
      `Parallel development speeds up delivery by 60%`,
      `Each specialist uses your established patterns`,
      `Coordinated approach reduces integration issues`
    ];

    if (recommendedTeam.successRate) {
      benefits.unshift(`${recommendedTeam.successRate}% success rate in your similar projects`);
    }

    return {
      triggered: true,
      reason: complexityScore >= 3 
        ? 'Complex project with multiple requirements' 
        : detectedDomains.length >= 2
        ? 'Multi-domain project detected'
        : 'Based on your successful team patterns',
      confidence: Math.min(0.9, (complexityScore + detectedDomains.length) * 0.2),
      recommendedTeam,
      benefits
    };
  }

  /**
   * Generate memory insights for display
   */
  private generateMemoryInsights(
    memoryContext: MemoryContext,
    projectContext: Partial<AIProjectContext>
  ): MemoryInsight[] {
    const insights: MemoryInsight[] = [];

    // Pattern insights
    if (memoryContext.relevantPatterns.length > 0) {
      const topPattern = memoryContext.relevantPatterns[0];
      insights.push({
        type: 'pattern',
        content: `Using your established pattern: ${topPattern.content.substring(0, 80)}...`,
        confidence: topPattern.confidence,
        usageCount: topPattern.usageCount,
        source: 'Your development patterns'
      });
    }

    // Success insights
    if (memoryContext.successfulApproaches.length > 0) {
      const topSuccess = memoryContext.successfulApproaches[0];
      const timeSaved = topSuccess.timeTaken ? 
        ` (saved ~${Math.round(topSuccess.timeTaken / 1000 / 60)} minutes last time)` : '';
      insights.push({
        type: 'success',
        content: `Your proven approach: ${topSuccess.approachUsed}${timeSaved}`,
        confidence: topSuccess.successRating || 0.8,
        source: `Session from ${new Date(topSuccess.createdAt).toLocaleDateString()}`
      });
    }

    // Warning insights
    if (memoryContext.commonIssues.length > 0) {
      const topIssue = memoryContext.commonIssues[0];
      insights.push({
        type: 'warning',
        content: `Heads up: ${topIssue.content.substring(0, 80)}...`,
        confidence: topIssue.confidence,
        usageCount: topIssue.usageCount,
        source: 'Your past experiences'
      });
    }

    // Session history insights
    if (memoryContext.sessionHistory.length > 0) {
      const recentSession = memoryContext.sessionHistory[0];
      insights.push({
        type: 'suggestion',
        content: `I see you worked on something similar ${recentSession.timestamp.toLocaleDateString()}`,
        confidence: 0.7,
        source: `Session ${recentSession.sessionId}`
      });
    }

    return insights.slice(0, 3); // Limit to top 3 insights
  }

  /**
   * Enhance agent response with memory context
   */
  async enhanceAgentResponse(
    userRequest: string,
    baseResponse: string,
    agentType: string = 'frontend-engineer'
  ): Promise<EnhancedAgentResponse> {
    // Check if memory context should be applied
    const useMemory = await this.shouldUseMemoryContext(userRequest);
    
    if (!useMemory) {
      return {
        response: baseResponse,
        memoryInsights: [],
        contextEnhancement: {
          patternsApplied: 0,
          historicalReferences: 0,
          personalizedElements: 0
        }
      };
    }

    // Extract project context and get memory data
    const projectContext = this.extractProjectContext(userRequest);
    
    const ragQuery: RAGQuery = {
      projectType: projectContext.projectType,
      framework: projectContext.framework,
      features: projectContext.features,
      agentType,
      taskDescription: userRequest,
      timeframe: 'last_30_days',
      limit: 3
    };

    const memoryContext = await enhancedMemoryContext.getMemoryContext(ragQuery);

    // Generate insights and team suggestion
    const memoryInsights = this.generateMemoryInsights(memoryContext, projectContext);
    const teamSuggestion = await this.analyzeTeamNeed(userRequest, projectContext, memoryContext);

    // Enhance the base response with memory context
    const enhancedParts = [baseResponse];

    // Add memory context to response
    if (memoryContext.relevantPatterns.length > 0) {
      const pattern = memoryContext.relevantPatterns[0];
      enhancedParts.push(`\n💡 I'll use your established pattern: ${pattern.content.substring(0, 100)}... (used ${pattern.usageCount} times successfully)`);
    }

    if (memoryContext.successfulApproaches.length > 0) {
      const approach = memoryContext.successfulApproaches[0];
      enhancedParts.push(`\n🎯 Based on your past success: ${approach.approachUsed}`);
    }

    if (memoryContext.sessionHistory.length > 0) {
      const session = memoryContext.sessionHistory[0];
      enhancedParts.push(`\n📚 Building on your recent work from ${session.timestamp.toLocaleDateString()}`);
    }

    const enhancedResponse = enhancedParts.join('');

    return {
      response: enhancedResponse,
      memoryInsights,
      teamSuggestion,
      contextEnhancement: {
        patternsApplied: memoryContext.relevantPatterns.length,
        historicalReferences: memoryContext.sessionHistory.length,
        personalizedElements: memoryInsights.length
      }
    };
  }

  /**
   * Get contextual team recommendations based on project type
   */
  async getContextualTeamRecommendations(projectContext: Partial<AIProjectContext>): Promise<{
    name: string;
    description: string;
    successRate?: number;
    lastUsed?: string;
    agents: string[];
  }[]> {
    const ragQuery: RAGQuery = {
      projectType: projectContext.projectType,
      framework: projectContext.framework,
      features: projectContext.features,
      taskDescription: 'team coordination',
      timeframe: 'all',
      limit: 10
    };

    const memoryContext = await enhancedMemoryContext.getMemoryContext(ragQuery);

    // Analyze successful team approaches
    const teamOutcomes = memoryContext.successfulApproaches.filter(approach =>
      approach.agentType === 'coordinator' || approach.taskDescription.includes('team')
    );

    const recommendations = [
      {
        name: 'Frontend Team',
        description: 'Your React + Tailwind patterns',
        agents: ['frontend-specialist', 'ui-designer', 'qa-agent']
      },
      {
        name: 'Backend Team', 
        description: 'Your Node.js + PostgreSQL setup',
        agents: ['backend-engineer', 'database-specialist', 'api-designer']
      },
      {
        name: 'Full Stack Team',
        description: 'Your proven architecture',
        agents: ['frontend-specialist', 'backend-engineer', 'qa-agent']
      },
      {
        name: 'Debug Squad',
        description: 'Knows your common issues',
        agents: ['debugger', 'qa-agent', 'performance-optimizer']
      }
    ];

    // Enhance with historical data if available
    return recommendations.map(rec => {
      const relevantOutcomes = teamOutcomes.filter(outcome =>
        outcome.taskDescription.toLowerCase().includes(rec.name.toLowerCase().split(' ')[0])
      );

      if (relevantOutcomes.length > 0) {
        const avgSuccessRate = relevantOutcomes.reduce((acc, outcome) => 
          acc + (outcome.successRating || 0), 0) / relevantOutcomes.length;
        const mostRecent = new Date(Math.max(...relevantOutcomes.map(o => o.createdAt)));

        return {
          ...rec,
          successRate: Math.round(avgSuccessRate * 100),
          lastUsed: mostRecent.toLocaleDateString()
        };
      }

      return rec;
    });
  }
}

export const memoryEnhancedAgent = new MemoryEnhancedAgent();
export default memoryEnhancedAgent;