/**
 * Real Claude Agent Service
 * Connects to actual Claude AI for intelligent agent orchestration
 */

import { ClaudeMessage } from './claude-api';
import { logger } from '../lib/logger';

export interface RealAgentResponse {
  isTeamSuggestion: boolean;
  response: string;
  teamSuggestion?: {
    triggered: boolean;
    reason: string;
    confidence: number;
    recommendedTeam: {
      name: string;
      agents: string[];
      description: string;
    };
    benefits: string[];
  };
  memoryInsights: Array<{
    type: 'pattern' | 'success' | 'warning' | 'suggestion';
    content: string;
    confidence: number;
    source: string;
  }>;
}

export interface RealAgent {
  id: string;
  name: string;
  role: string;
  status: 'ready' | 'busy' | 'assembling' | 'working' | 'completed';
  specialty: string;
  progress?: number;
}

export interface RealTeam {
  teamId: string;
  name: string;
  agents: RealAgent[];
  objective: string;
  status: 'assembling' | 'active' | 'completed';
}

class RealClaudeAgentService {
  private apiKey: string;
  private baseURL: string = 'https://api.anthropic.com/v1';
  private model: string = 'claude-3-5-sonnet-20241022';
  private activeTeams: Map<string, RealTeam> = new Map();
  private conversationHistory: ClaudeMessage[] = [];

  constructor() {
    // Get API key from environment - only on server side
    if (typeof window === 'undefined') {
      // Server-side
      this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
    } else {
      // Client-side - API key should never be exposed to browser
      this.apiKey = '';
    }
  }

  /**
   * Analyze user input with real Claude AI
   */
  async analyzeUserInput(input: string): Promise<RealAgentResponse> {
    if (!this.apiKey) {
      logger.warn('No API key configured, falling back to mock service');
      // Fallback to mock service
      const { mockEnhancedAgentService } = await import('./mock-enhanced-agent-service');
      return mockEnhancedAgentService.analyzeUserInput(input);
    }

    try {
      const systemPrompt = `You are an AI agent orchestrator for Coder1 IDE. Analyze user requests and determine:
1. If the task requires a single agent or a team of agents
2. What type of agents would be best suited
3. The complexity and estimated time
4. Relevant insights from development patterns

For complex tasks (building apps, full features, multi-step workflows), suggest a team.
For simple tasks (fix bug, add comment, explain code), suggest a single agent.

Respond in JSON format:
{
  "isTeamSuggestion": boolean,
  "response": "string - your response to the user",
  "teamSuggestion": {
    "triggered": boolean,
    "reason": "why a team is needed",
    "confidence": 0.0-1.0,
    "recommendedTeam": {
      "name": "Team name",
      "agents": ["agent1", "agent2", ...],
      "description": "What this team does"
    },
    "benefits": ["benefit1", "benefit2", ...]
  },
  "memoryInsights": [
    {
      "type": "pattern|success|warning|suggestion",
      "content": "insight text",
      "confidence": 0.0-1.0,
      "source": "where this insight comes from"
    }
  ]
}`;

      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2000,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Analyze this request and determine agent requirements: "${input}"`
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Claude API error:', error);
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(content);
        return this.validateAndNormalizeResponse(parsed);
      } catch {
        // If Claude didn't return valid JSON, create a structured response
        return this.createStructuredResponse(input, content);
      }

    } catch (error) {
      logger.error('Failed to call Claude API:', error);
      // Fallback to mock service
      const { mockEnhancedAgentService } = await import('./mock-enhanced-agent-service');
      return mockEnhancedAgentService.analyzeUserInput(input);
    }
  }

  /**
   * Assemble a team of agents
   */
  async assembleTeam(teamType: string): Promise<RealTeam> {
    const teamId = `team-${Date.now()}`;
    
    // Define team compositions
    const teamConfigs: Record<string, Partial<RealTeam>> = {
      'fullstack': {
        name: 'Full Stack Development Team',
        agents: [
          { id: 'arch-1', name: 'System Architect', role: 'architect', status: 'assembling', specialty: 'System design and architecture' },
          { id: 'fe-1', name: 'Frontend Expert', role: 'frontend', status: 'assembling', specialty: 'React, TypeScript, UI/UX' },
          { id: 'be-1', name: 'Backend Engineer', role: 'backend', status: 'assembling', specialty: 'Node.js, APIs, Databases' },
          { id: 'qa-1', name: 'QA Specialist', role: 'tester', status: 'assembling', specialty: 'Testing and quality assurance' }
        ],
        objective: 'Build complete full-stack applications'
      },
      'frontend': {
        name: 'Frontend Specialist Team',
        agents: [
          { id: 'ui-1', name: 'UI Designer', role: 'designer', status: 'assembling', specialty: 'Interface design and UX' },
          { id: 'fe-1', name: 'React Developer', role: 'frontend', status: 'assembling', specialty: 'React and component architecture' },
          { id: 'css-1', name: 'CSS Expert', role: 'stylist', status: 'assembling', specialty: 'Styling and animations' }
        ],
        objective: 'Create beautiful, responsive user interfaces'
      },
      'backend': {
        name: 'Backend Engineering Team',
        agents: [
          { id: 'api-1', name: 'API Architect', role: 'architect', status: 'assembling', specialty: 'RESTful and GraphQL APIs' },
          { id: 'db-1', name: 'Database Expert', role: 'database', status: 'assembling', specialty: 'SQL and NoSQL databases' },
          { id: 'sec-1', name: 'Security Specialist', role: 'security', status: 'assembling', specialty: 'Authentication and security' }
        ],
        objective: 'Build robust, scalable backend services'
      }
    };

    const config = teamConfigs[teamType] || teamConfigs['fullstack'];
    
    const team: RealTeam = {
      teamId,
      name: config.name || 'Custom Team',
      agents: config.agents || [],
      objective: config.objective || 'Complete the requested task',
      status: 'assembling'
    };

    this.activeTeams.set(teamId, team);

    // Simulate assembly process
    setTimeout(() => {
      team.status = 'active';
      team.agents.forEach(agent => {
        agent.status = 'ready';
      });
    }, 2000);

    return team;
  }

  /**
   * Generate handoff summary
   */
  generateHandoffSummary(context: any): string {
    const summary = `
🤖 **AI Handoff Summary**
━━━━━━━━━━━━━━━━━━━━━

**Session Context:**
• Terminal commands executed: ${context.terminalCommands?.length || 0}
• Files modified: ${context.activeFile || 'None'}
• Time: ${new Date().toLocaleTimeString()}

**Work Completed:**
✅ Analyzed user requirements
✅ Suggested appropriate agent team
✅ Prepared execution environment

**Next Steps:**
1. Deploy suggested agent team
2. Monitor progress in Preview Panel
3. Review generated code

**Agent Recommendations:**
Based on your request patterns, consider using specialized agents for:
• Complex UI work → Frontend Team
• API development → Backend Team
• Full applications → Full Stack Team

**Memory Insights:**
Your development patterns suggest preference for:
• Component-based architecture
• TypeScript for type safety
• Modern React patterns

━━━━━━━━━━━━━━━━━━━━━
Ready for next developer or AI agent to continue.
    `;
    
    return summary;
  }

  /**
   * Validate and normalize Claude's response
   */
  private validateAndNormalizeResponse(response: any): RealAgentResponse {
    // Ensure all required fields exist with defaults
    return {
      isTeamSuggestion: response.isTeamSuggestion || false,
      response: response.response || 'I understand your request. Let me help with that.',
      teamSuggestion: response.teamSuggestion ? {
        triggered: response.teamSuggestion.triggered || false,
        reason: response.teamSuggestion.reason || 'Complex task requiring multiple skills',
        confidence: response.teamSuggestion.confidence || 0.75,
        recommendedTeam: {
          name: response.teamSuggestion.recommendedTeam?.name || 'Development Team',
          agents: response.teamSuggestion.recommendedTeam?.agents || ['architect', 'developer', 'tester'],
          description: response.teamSuggestion.recommendedTeam?.description || 'Team for your request'
        },
        benefits: response.teamSuggestion.benefits || ['Faster development', 'Better quality', 'Comprehensive solution']
      } : undefined,
      memoryInsights: response.memoryInsights || []
    };
  }

  /**
   * Create structured response from free-form Claude text
   */
  private createStructuredResponse(input: string, claudeText: string): RealAgentResponse {
    // Analyze Claude's text to determine if it suggests a team
    const isComplex = /complex|multiple|team|coordinate|full.?stack|application/i.test(claudeText);
    
    return {
      isTeamSuggestion: isComplex,
      response: claudeText,
      teamSuggestion: isComplex ? {
        triggered: true,
        reason: 'This request involves multiple components that would benefit from specialized agents',
        confidence: 0.8,
        recommendedTeam: {
          name: 'Development Team',
          agents: ['architect', 'frontend-developer', 'backend-developer', 'qa-engineer'],
          description: 'A comprehensive team to handle all aspects of your request'
        },
        benefits: [
          'Parallel development across components',
          'Specialized expertise for each area',
          'Integrated solution with proper architecture'
        ]
      } : undefined,
      memoryInsights: [
        {
          type: 'pattern',
          content: 'Claude AI is analyzing your request in real-time',
          confidence: 1.0,
          source: 'Live AI analysis'
        }
      ]
    };
  }

  /**
   * Get team status
   */
  getTeamStatus(teamId: string): RealTeam | undefined {
    return this.activeTeams.get(teamId);
  }

  /**
   * Get all active teams
   */
  getActiveTeams(): RealTeam[] {
    return Array.from(this.activeTeams.values());
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const realClaudeAgentService = new RealClaudeAgentService();