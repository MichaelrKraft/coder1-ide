/**
 * Mock Enhanced Agent Service - Safe Testing Version
 * 
 * This mock service provides all the enhanced agent functionality
 * without any backend dependencies. Perfect for safe development and testing.
 */

export interface MockAgentResponse {
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

export interface MockAgent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  avatar: string;
}

export interface MockTeamData {
  teamId: string;
  status: string;
  agents: MockAgent[];
  progress: {
    overall: number;
  };
  generatedFiles: number;
  requirement: string;
}

class MockEnhancedAgentService {
  private mockAgents: MockAgent[] = [
    {
      id: 'frontend-1',
      name: 'Frontend Specialist',
      role: 'React & UI Expert',
      status: 'idle',
      progress: 0,
      currentTask: 'Analyzing component structure',
      avatar: '🎨'
    },
    {
      id: 'backend-1', 
      name: 'Backend Engineer',
      role: 'API & Database Expert',
      status: 'idle',
      progress: 0,
      currentTask: 'Reviewing authentication flow',
      avatar: '⚙️'
    },
    {
      id: 'qa-1',
      name: 'QA Specialist',
      role: 'Testing & Quality Expert', 
      status: 'idle',
      progress: 0,
      currentTask: 'Preparing test strategies',
      avatar: '🧪'
    }
  ];

  /**
   * Analyze user input and determine if team suggestion should be triggered
   */
  analyzeUserInput(input: string): MockAgentResponse {
    const inputLower = input.toLowerCase();
    
    // Detect complexity indicators
    const complexityKeywords = [
      'build', 'create', 'develop', 'full', 'complete', 'entire',
      'dashboard', 'application', 'system', 'platform', 'auth',
      'backend', 'frontend', 'database', 'deploy', 'production'
    ];
    
    const complexityScore = complexityKeywords.reduce((score, keyword) => {
      return score + (inputLower.includes(keyword) ? 1 : 0);
    }, 0);

    // Simple requests get single agent response
    if (complexityScore < 2) {
      return {
        isTeamSuggestion: false,
        response: this.generateSingleAgentResponse(input),
        memoryInsights: this.generateMockInsights('single')
      };
    }

    // Complex requests get team suggestions
    return {
      isTeamSuggestion: true,
      response: `💡 This looks like a complex request that could benefit from team coordination!`,
      teamSuggestion: this.generateTeamSuggestion(input, complexityScore),
      memoryInsights: this.generateMockInsights('team')
    };
  }

  private generateSingleAgentResponse(input: string): string {
    const responses = [
      `I'll help you with that. Let me analyze the current codebase context...`,
      `Great idea! I can see you're working on something interesting. Let me assist...`,
      `Based on your pattern, I have some suggestions for this request...`,
      `I'll use your established development patterns to handle this efficiently.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateTeamSuggestion(input: string, complexityScore: number) {
    const teams = {
      fullstack: {
        name: 'Full Stack Team',
        agents: ['Frontend Specialist', 'Backend Engineer', 'QA Specialist'],
        description: 'Complete development team for full-stack projects'
      },
      frontend: {
        name: 'Frontend Team', 
        agents: ['Frontend Specialist', 'UI Designer', 'QA Specialist'],
        description: 'Specialized team for React/UI development'
      },
      backend: {
        name: 'Backend Team',
        agents: ['Backend Engineer', 'Database Specialist', 'API Designer'], 
        description: 'Specialized team for API and server development'
      }
    };

    // Choose team based on input content
    let selectedTeam = teams.fullstack;
    if (input.includes('frontend') || input.includes('ui') || input.includes('component')) {
      selectedTeam = teams.frontend;
    } else if (input.includes('backend') || input.includes('api') || input.includes('database')) {
      selectedTeam = teams.backend;
    }

    return {
      triggered: true,
      reason: complexityScore >= 3 
        ? 'Complex project with multiple requirements'
        : 'Multi-domain project detected',
      confidence: Math.min(0.9, complexityScore * 0.2),
      recommendedTeam: selectedTeam,
      benefits: [
        'Parallel development speeds up delivery by 60%',
        'Each specialist uses your established patterns', 
        'Coordinated approach reduces integration issues',
        `Based on similar projects, 85% success rate expected`
      ]
    };
  }

  private generateMockInsights(type: 'single' | 'team') {
    const insights: Array<{
      type: 'pattern' | 'success' | 'warning' | 'suggestion';
      content: string;
      confidence: number;
      source: string;
    }> = [
      {
        type: 'pattern' as const,
        content: 'Using your established pattern: React + TypeScript + Tailwind architecture',
        confidence: 0.9,
        source: 'Your development patterns'
      },
      {
        type: 'success' as const,
        content: 'Your proven approach: Component-first development with testing',
        confidence: 0.85,
        source: 'Session from Dec 15, 2024'
      }
    ];

    if (type === 'team') {
      insights.push({
        type: 'suggestion' as const,
        content: 'Similar projects benefit from coordinated agent teams',
        confidence: 0.8,
        source: 'Your past team successes'
      });
    }

    return insights.slice(0, 2); // Return 2 insights
  }

  /**
   * Generate natural language handoff summary
   */
  generateHandoffSummary(sessionData: any): string {
    const summaries = [
      `📝 Session: feature-development-${Date.now().toString().slice(-6)}
✅ Completed: Component structure, API integration
🔄 In Progress: Testing framework setup (QA Agent, 70%)
⏳ Next: Deployment preparation and optimization
🔗 Handoff URL: /resume-session/${this.generateSessionId()}`,
      
      `📝 Session: dashboard-build-${Date.now().toString().slice(-6)}
✅ Completed: Database schema, authentication flow
🔄 In Progress: Frontend dashboard components (Frontend Agent, 45%)
⏳ Next: API endpoint completion and security review  
🔗 Handoff URL: /resume-session/${this.generateSessionId()}`
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  }

  /**
   * Mock team assembly with realistic agent progression
   */
  async assembleTeam(teamType: string): Promise<MockTeamData> {
    // Simulate realistic delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update agent statuses to "thinking"
    this.mockAgents.forEach(agent => {
      agent.status = 'thinking';
      agent.progress = 5;
    });

    return {
      teamId,
      status: 'assembling',
      agents: [...this.mockAgents],
      progress: { overall: 10 },
      generatedFiles: 0,
      requirement: `Mock ${teamType} development project`
    };
  }

  /**
   * Get updated team status (simulates real-time progress)
   */
  getTeamStatus(teamId: string): MockTeamData {
    // Simulate progressive work
    const now = Date.now();
    const elapsed = (now % 60000) / 1000; // Cycle every minute for demo
    
    this.mockAgents.forEach((agent, index) => {
      const agentProgress = Math.min(95, Math.floor(elapsed * 2 + index * 10));
      
      if (agentProgress < 20) {
        agent.status = 'thinking';
        agent.currentTask = 'Analyzing requirements and planning approach';
      } else if (agentProgress < 60) {
        agent.status = 'working';
        agent.currentTask = 'Implementing core functionality';
      } else if (agentProgress < 90) {
        agent.status = 'working'; 
        agent.currentTask = 'Refining implementation and adding tests';
      } else {
        agent.status = 'completed';
        agent.currentTask = 'Task completed - ready for review';
      }
      
      agent.progress = agentProgress;
    });

    const overallProgress = Math.floor(
      this.mockAgents.reduce((sum, agent) => sum + agent.progress, 0) / this.mockAgents.length
    );

    return {
      teamId,
      status: overallProgress >= 90 ? 'completed' : 'working',
      agents: [...this.mockAgents],
      progress: { overall: overallProgress },
      generatedFiles: Math.floor(overallProgress / 10),
      requirement: 'Mock development project in progress'
    };
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 8);
  }

  /**
   * Check if enhanced agents should be enabled
   */
  isEnabled(): boolean {
    return typeof window !== 'undefined' && 
           localStorage.getItem('coder1-enable-enhanced-agents') === 'true';
  }
}

export const mockEnhancedAgentService = new MockEnhancedAgentService();
export default mockEnhancedAgentService;