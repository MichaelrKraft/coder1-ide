import { logger } from '../lib/logger';

/**
 * Real Agent Bridge Service
 * Connects the Terminal and Preview Panel to actual AI agents
 * Replaces mock service with real API calls
 */

interface AgentResponse {
  requestType: 'feature' | 'debug' | 'refactor' | 'explain' | 'general';
  confidence: number;
  suggestedTeam: string;
  teamSuggestion?: {
    teamId: string;
    teamName: string;
    description: string;
    requiredAgents: Array<{
      id: string;
      name: string;
      role: string;
      status: 'ready' | 'busy' | 'offline';
      specialty: string;
      reason: string;
    }>;
    estimatedTime: string;
    workflow: Array<{
      phase: string;
      agents: string[];
      duration: string;
    }>;
  };
  memoryInsights: Array<{
    type: 'pattern' | 'success' | 'warning' | 'tip';
    content: string;
    relevance: number;
  }>;
}

class RealAgentBridge {
  private apiUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private activeTeams: Map<string, any> = new Map();

  constructor() {
    // Use Express backend for API calls
    this.apiUrl = process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3000';
    this.wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3000';
  }

  /**
   * Analyze user input and determine agent requirements
   */
  async analyzeUserInput(input: string): Promise<AgentResponse> {
    try {
      // Call the real AI endpoint
      const response = await fetch(`${this.apiUrl}/api/agent/analyze-requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          request: input,
          context: {
            terminalHistory: this.getRecentHistory(),
            activeFile: this.getActiveFile(),
            projectType: this.detectProjectType()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the response to match our interface
      return this.transformApiResponse(data, input);
    } catch (error) {
      logger.error('Error calling real AI agent:', error);
      // Fallback to intelligent defaults
      return this.getFallbackResponse(input);
    }
  }

  /**
   * Assemble a team of agents for complex tasks
   */
  async assembleTeam(teamType: string, requirement?: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/agents/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamType,
          requirement,
          agents: this.getAgentsForTeamType(teamType)
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to assemble team: ${response.status}`);
      }

      const team = await response.json();
      
      // Store team for tracking
      this.activeTeams.set(team.teamId, team);
      
      // Connect WebSocket for real-time updates
      this.connectWebSocket(team.teamId);
      
      return team;
    } catch (error) {
      logger.error('Error assembling team:', error);
      throw error;
    }
  }

  /**
   * Connect WebSocket for real-time agent updates
   */
  private connectWebSocket(teamId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(`${this.wsUrl}/agent-updates`);
      
      this.ws.onopen = () => {
        logger.debug('🔌 Connected to agent WebSocket');
        // Subscribe to team updates
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          teamId
        }));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Dispatch events for Preview Panel to catch
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agent-update', {
            detail: data
          }));
        }
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        logger.debug('WebSocket disconnected');
        // Attempt reconnection after delay
        setTimeout(() => this.connectWebSocket(teamId), 5000);
      };
    } catch (error) {
      logger.error('Failed to connect WebSocket:', error);
    }
  }

  /**
   * Transform API response to match our interface
   */
  private transformApiResponse(apiData: any, input: string): AgentResponse {
    // Determine request type from API response or analyze input
    const requestType = this.detectRequestType(input);
    
    // Build team suggestion if agents are recommended
    const teamSuggestion = apiData.recommendedAgents ? {
      teamId: `team-${Date.now()}`,
      teamName: apiData.teamName || this.generateTeamName(requestType),
      description: apiData.description || `Processing: ${input.substring(0, 50)}...`,
      requiredAgents: this.mapAgentsFromApi(apiData.recommendedAgents),
      estimatedTime: apiData.estimatedTime || '2-5 minutes',
      workflow: apiData.workflow || this.getDefaultWorkflow(requestType)
    } : undefined;

    return {
      requestType,
      confidence: apiData.confidence || 0.85,
      suggestedTeam: apiData.suggestedTeam || 'custom',
      teamSuggestion,
      memoryInsights: this.extractMemoryInsights(apiData)
    };
  }

  /**
   * Detect the type of request from user input
   */
  private detectRequestType(input: string): 'feature' | 'debug' | 'refactor' | 'explain' | 'general' {
    const lower = input.toLowerCase();
    
    if (lower.includes('build') || lower.includes('create') || lower.includes('add')) {
      return 'feature';
    }
    if (lower.includes('fix') || lower.includes('error') || lower.includes('bug')) {
      return 'debug';
    }
    if (lower.includes('refactor') || lower.includes('improve') || lower.includes('optimize')) {
      return 'refactor';
    }
    if (lower.includes('explain') || lower.includes('what') || lower.includes('how')) {
      return 'explain';
    }
    
    return 'general';
  }

  /**
   * Map API agents to our format
   */
  private mapAgentsFromApi(agents: any[]): any[] {
    return agents.map(agent => ({
      id: agent.id || `agent-${Date.now()}`,
      name: agent.name || agent.role,
      role: agent.role,
      status: agent.status || 'ready',
      specialty: agent.specialty || this.getSpecialtyForRole(agent.role),
      reason: agent.reason || `Required for ${agent.role} tasks`
    }));
  }

  /**
   * Extract memory insights from API response
   */
  private extractMemoryInsights(apiData: any): any[] {
    const insights = [];
    
    // Add insights from API if available
    if (apiData.insights) {
      insights.push(...apiData.insights);
    }
    
    // Add pattern recognition
    if (apiData.patterns) {
      apiData.patterns.forEach((pattern: any) => {
        insights.push({
          type: 'pattern',
          content: pattern.description,
          relevance: pattern.relevance || 0.8
        });
      });
    }
    
    // Add warnings if any
    if (apiData.warnings) {
      apiData.warnings.forEach((warning: any) => {
        insights.push({
          type: 'warning',
          content: warning,
          relevance: 0.9
        });
      });
    }
    
    return insights;
  }

  /**
   * Get fallback response when API is unavailable
   */
  private getFallbackResponse(input: string): AgentResponse {
    const requestType = this.detectRequestType(input);
    
    return {
      requestType,
      confidence: 0.7,
      suggestedTeam: 'fallback',
      teamSuggestion: {
        teamId: `fallback-${Date.now()}`,
        teamName: 'Standard Team',
        description: 'Using fallback configuration',
        requiredAgents: [
          {
            id: 'architect',
            name: 'Architect',
            role: 'architect',
            status: 'ready',
            specialty: 'System design and planning',
            reason: 'Core coordinator'
          }
        ],
        estimatedTime: '3-5 minutes',
        workflow: [{
          phase: 'Analysis',
          agents: ['architect'],
          duration: '1 minute'
        }]
      },
      memoryInsights: [{
        type: 'tip',
        content: 'API temporarily unavailable, using fallback mode',
        relevance: 1.0
      }]
    };
  }

  /**
   * Helper methods
   */
  private getRecentHistory(): string[] {
    // This would be connected to actual terminal history
    return [];
  }

  private getActiveFile(): string | null {
    // This would be connected to actual editor state
    return null;
  }

  private detectProjectType(): string {
    // Detect from package.json, etc.
    return 'next.js';
  }

  private generateTeamName(requestType: string): string {
    const names: Record<string, string> = {
      feature: 'Feature Development Team',
      debug: 'Debug Squad',
      refactor: 'Refactoring Team',
      explain: 'Documentation Team',
      general: 'General Purpose Team'
    };
    return names[requestType] || 'Custom Team';
  }

  private getAgentsForTeamType(teamType: string): string[] {
    const teams: Record<string, string[]> = {
      fullstack: ['architect', 'frontend-specialist', 'backend-specialist', 'database-specialist'],
      frontend: ['architect', 'frontend-specialist', 'ui-designer'],
      backend: ['architect', 'backend-specialist', 'database-specialist'],
      debug: ['architect', 'debugger', 'test-engineer'],
      refactor: ['architect', 'refactoring-expert', 'optimizer']
    };
    return teams[teamType] || ['architect'];
  }

  private getSpecialtyForRole(role: string): string {
    const specialties: Record<string, string> = {
      architect: 'System design and coordination',
      'frontend-specialist': 'UI/UX and React development',
      'backend-specialist': 'API and server development',
      'database-specialist': 'Data modeling and optimization',
      debugger: 'Error analysis and fixes',
      optimizer: 'Performance improvements',
      'test-engineer': 'Testing and quality assurance'
    };
    return specialties[role] || 'General development';
  }

  private getDefaultWorkflow(requestType: string): any[] {
    const workflows: Record<string, any[]> = {
      feature: [
        { phase: 'Planning', agents: ['architect'], duration: '1 minute' },
        { phase: 'Implementation', agents: ['frontend-specialist', 'backend-specialist'], duration: '3 minutes' },
        { phase: 'Testing', agents: ['test-engineer'], duration: '1 minute' }
      ],
      debug: [
        { phase: 'Analysis', agents: ['debugger'], duration: '2 minutes' },
        { phase: 'Fix', agents: ['architect'], duration: '2 minutes' }
      ],
      refactor: [
        { phase: 'Analysis', agents: ['architect'], duration: '1 minute' },
        { phase: 'Refactoring', agents: ['refactoring-expert'], duration: '3 minutes' }
      ],
      explain: [
        { phase: 'Documentation', agents: ['architect'], duration: '2 minutes' }
      ],
      general: [
        { phase: 'Processing', agents: ['architect'], duration: '2 minutes' }
      ]
    };
    return workflows[requestType] || workflows.general;
  }

  /**
   * Generate handoff summary (real AI version)
   */
  async generateHandoffSummary(context: any): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/claude/session-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();
      return data.summary;
    } catch (error) {
      logger.error('Error generating handoff summary:', error);
      return 'Failed to generate summary. Please try again.';
    }
  }
}

// Export singleton instance
export const realAgentBridge = new RealAgentBridge();
export type { AgentResponse };