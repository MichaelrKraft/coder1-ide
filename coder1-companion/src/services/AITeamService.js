const { spawn } = require('child_process');
const pty = require('node-pty');
const EventEmitter = require('events');

class AITeamService extends EventEmitter {
  constructor(options) {
    super();
    this.logger = options.logger;
    this.claudeBridge = options.claudeBridge;
    this.sessionManager = options.sessionManager;
    
    // Team management
    this.activeTeams = new Map();
    this.teamWorkflows = new Map();
    
    // Agent roles and specializations
    this.agentRoles = {
      architect: {
        name: 'Senior Architect',
        expertise: 'System design, architecture decisions, technical planning',
        prompt: 'You are a senior software architect. Focus on system design, scalability, and architectural best practices.'
      },
      frontend: {
        name: 'Frontend Developer',
        expertise: 'UI/UX implementation, React, TypeScript, styling',
        prompt: 'You are a frontend developer expert in React, TypeScript, and modern UI development. Focus on user experience and clean interfaces.'
      },
      backend: {
        name: 'Backend Developer', 
        expertise: 'API development, databases, server architecture',
        prompt: 'You are a backend developer expert in Node.js, APIs, databases, and server infrastructure. Focus on scalability and performance.'
      },
      fullstack: {
        name: 'Full-Stack Developer',
        expertise: 'End-to-end development, integration, deployment',
        prompt: 'You are a full-stack developer capable of both frontend and backend development. Focus on integration and end-to-end solutions.'
      },
      qa: {
        name: 'QA Engineer',
        expertise: 'Testing, quality assurance, bug detection',
        prompt: 'You are a QA engineer focused on testing, quality assurance, and identifying potential issues. Prioritize reliability and edge cases.'
      },
      devops: {
        name: 'DevOps Engineer',
        expertise: 'Deployment, CI/CD, infrastructure, monitoring',
        prompt: 'You are a DevOps engineer expert in deployment, CI/CD, infrastructure, and monitoring. Focus on automation and reliability.'
      }
    };

    // Workflow templates for different project types
    this.workflowTemplates = {
      'component': {
        name: 'React Component Development',
        roles: ['architect', 'frontend', 'qa'],
        phases: [
          { name: 'Analysis', primary: 'architect', supporting: [] },
          { name: 'Implementation', primary: 'frontend', supporting: ['architect'] },
          { name: 'Testing', primary: 'qa', supporting: ['frontend'] },
          { name: 'Review', primary: 'architect', supporting: ['frontend', 'qa'] }
        ]
      },
      'api': {
        name: 'API Development',
        roles: ['architect', 'backend', 'qa'],
        phases: [
          { name: 'Design', primary: 'architect', supporting: [] },
          { name: 'Implementation', primary: 'backend', supporting: ['architect'] },
          { name: 'Testing', primary: 'qa', supporting: ['backend'] },
          { name: 'Documentation', primary: 'backend', supporting: ['architect'] }
        ]
      },
      'fullstack': {
        name: 'Full-Stack Feature',
        roles: ['architect', 'frontend', 'backend', 'qa', 'devops'],
        phases: [
          { name: 'Planning', primary: 'architect', supporting: [] },
          { name: 'Backend', primary: 'backend', supporting: ['architect'] },
          { name: 'Frontend', primary: 'frontend', supporting: ['backend'] },
          { name: 'Integration', primary: 'fullstack', supporting: ['frontend', 'backend'] },
          { name: 'Testing', primary: 'qa', supporting: ['fullstack'] },
          { name: 'Deployment', primary: 'devops', supporting: ['qa'] }
        ]
      },
      'deployment': {
        name: 'Production Deployment',
        roles: ['devops', 'qa', 'architect'],
        phases: [
          { name: 'Preparation', primary: 'devops', supporting: [] },
          { name: 'Testing', primary: 'qa', supporting: ['devops'] },
          { name: 'Review', primary: 'architect', supporting: ['devops', 'qa'] },
          { name: 'Deploy', primary: 'devops', supporting: [] }
        ]
      },
      'debug': {
        name: 'Bug Investigation & Fix',
        roles: ['qa', 'fullstack', 'architect'],
        phases: [
          { name: 'Investigation', primary: 'qa', supporting: [] },
          { name: 'Analysis', primary: 'architect', supporting: ['qa'] },
          { name: 'Fix', primary: 'fullstack', supporting: ['architect'] },
          { name: 'Verification', primary: 'qa', supporting: ['fullstack'] }
        ]
      }
    };
  }

  async spawnTeam(requirement, options = {}) {
    const teamId = this.generateTeamId();
    
    this.logger.info(`🚀 Spawning AI Team: ${teamId} for requirement: ${requirement}`);

    try {
      // Analyze requirement to determine optimal workflow
      const workflow = await this.analyzeRequirement(requirement, options);
      
      // Create team structure
      const team = {
        id: teamId,
        requirement,
        workflow,
        agents: new Map(),
        status: 'initializing',
        startTime: new Date(),
        currentPhase: 0,
        results: [],
        communication: [],
        sessionId: options.sessionId
      };

      // Initialize agents for the selected workflow
      await this.initializeAgents(team);
      
      // Store team
      this.activeTeams.set(teamId, team);
      
      // Start workflow execution
      this.executeWorkflow(teamId);
      
      this.logger.success(`✅ AI Team spawned: ${teamId} with ${team.agents.size} agents`);
      
      return {
        success: true,
        teamId,
        workflow: workflow.name,
        agents: Array.from(team.agents.keys()),
        phases: workflow.phases.map(p => p.name),
        estimatedDuration: this.estimateDuration(workflow),
        status: 'active'
      };

    } catch (error) {
      this.logger.error(`❌ Failed to spawn AI team:`, error);
      throw error;
    }
  }

  async analyzeRequirement(requirement, options) {
    this.logger.info('🔍 Analyzing requirement to determine optimal workflow...');

    try {
      const analysisPrompt = `Analyze this development requirement and suggest the best workflow approach:

REQUIREMENT: ${requirement}

PROJECT CONTEXT:
${options.projectPath ? `- Project Path: ${options.projectPath}` : ''}
${options.technologies ? `- Technologies: ${options.technologies.join(', ')}` : ''}
${options.urgency ? `- Urgency: ${options.urgency}` : ''}

Available workflows:
1. component - React Component Development (architect, frontend, qa)
2. api - API Development (architect, backend, qa) 
3. fullstack - Full-Stack Feature (architect, frontend, backend, qa, devops)
4. deployment - Production Deployment (devops, qa, architect)
5. debug - Bug Investigation & Fix (qa, fullstack, architect)

Please respond with JSON:
{
  "workflowType": "component|api|fullstack|deployment|debug",
  "reasoning": "Why this workflow is optimal",
  "customizations": {
    "additionalRoles": ["role1", "role2"],
    "skipPhases": ["phase1"],
    "priority": "high|medium|low"
  }
}`;

      const result = await this.claudeBridge.executeCommand({
        command: analysisPrompt,
        sessionId: options.sessionId
      });

      return this.parseWorkflowAnalysis(result.result, options);

    } catch (error) {
      this.logger.warn('Workflow analysis failed, using default:', error);
      return this.getDefaultWorkflow(requirement);
    }
  }

  parseWorkflowAnalysis(result, options) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        const baseWorkflow = this.workflowTemplates[analysis.workflowType];
        
        if (baseWorkflow) {
          // Apply customizations
          const workflow = { ...baseWorkflow };
          
          if (analysis.customizations?.additionalRoles) {
            workflow.roles = [...workflow.roles, ...analysis.customizations.additionalRoles];
          }
          
          if (analysis.customizations?.skipPhases) {
            workflow.phases = workflow.phases.filter(
              phase => !analysis.customizations.skipPhases.includes(phase.name.toLowerCase())
            );
          }
          
          workflow.reasoning = analysis.reasoning;
          workflow.priority = analysis.customizations?.priority || 'medium';
          
          return workflow;
        }
      }
      
      return this.getDefaultWorkflow('');
    } catch (error) {
      return this.getDefaultWorkflow('');
    }
  }

  getDefaultWorkflow(requirement) {
    // Simple heuristics for workflow selection
    const req = requirement.toLowerCase();
    
    if (req.includes('component') || req.includes('ui') || req.includes('frontend')) {
      return this.workflowTemplates.component;
    }
    if (req.includes('api') || req.includes('backend') || req.includes('server')) {
      return this.workflowTemplates.api;
    }
    if (req.includes('deploy') || req.includes('production') || req.includes('build')) {
      return this.workflowTemplates.deployment;
    }
    if (req.includes('bug') || req.includes('error') || req.includes('fix') || req.includes('debug')) {
      return this.workflowTemplates.debug;
    }
    
    // Default to full-stack for complex requirements
    return this.workflowTemplates.fullstack;
  }

  async initializeAgents(team) {
    this.logger.info(`👥 Initializing ${team.workflow.roles.length} agents for team ${team.id}`);

    for (const roleKey of team.workflow.roles) {
      const role = this.agentRoles[roleKey];
      if (!role) {
        this.logger.warn(`Unknown role: ${roleKey}, skipping...`);
        continue;
      }

      try {
        const agent = await this.createAgent(roleKey, role, team);
        team.agents.set(roleKey, agent);
        
        this.logger.debug(`✅ Agent initialized: ${role.name} (${roleKey})`);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize agent ${roleKey}:`, error);
        throw error;
      }
    }
  }

  async createAgent(roleKey, role, team) {
    const agentId = `${team.id}_${roleKey}`;
    
    return {
      id: agentId,
      role: roleKey,
      name: role.name,
      expertise: role.expertise,
      prompt: role.prompt,
      status: 'ready',
      currentTask: null,
      results: [],
      conversationHistory: []
    };
  }

  async executeWorkflow(teamId) {
    const team = this.activeTeams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    this.logger.info(`🎬 Starting workflow execution for team ${teamId}`);
    
    try {
      team.status = 'executing';
      this.emit('team-status-change', { teamId, status: 'executing' });

      for (let phaseIndex = 0; phaseIndex < team.workflow.phases.length; phaseIndex++) {
        const phase = team.workflow.phases[phaseIndex];
        team.currentPhase = phaseIndex;
        
        this.logger.info(`📍 Phase ${phaseIndex + 1}/${team.workflow.phases.length}: ${phase.name}`);
        
        const phaseResult = await this.executePhase(team, phase, phaseIndex);
        team.results.push(phaseResult);
        
        this.emit('phase-complete', { teamId, phase: phase.name, result: phaseResult });
        
        // Short pause between phases
        await this.sleep(1000);
      }

      // Workflow completed
      team.status = 'completed';
      team.endTime = new Date();
      
      this.logger.success(`🎉 Workflow completed for team ${teamId}`);
      
      // Generate final summary
      const summary = await this.generateTeamSummary(team);
      team.summary = summary;
      
      this.emit('team-complete', { teamId, summary });
      
      return summary;

    } catch (error) {
      team.status = 'error';
      team.error = error.message;
      
      this.logger.error(`❌ Workflow execution failed for team ${teamId}:`, error);
      this.emit('team-error', { teamId, error: error.message });
      
      throw error;
    }
  }

  async executePhase(team, phase, phaseIndex) {
    this.logger.info(`🎯 Executing phase: ${phase.name} (Primary: ${phase.primary})`);

    try {
      const primaryAgent = team.agents.get(phase.primary);
      const supportingAgents = phase.supporting.map(role => team.agents.get(role)).filter(Boolean);
      
      if (!primaryAgent) {
        throw new Error(`Primary agent not found: ${phase.primary}`);
      }

      // Build context from previous phases
      const context = this.buildPhaseContext(team, phaseIndex);
      
      // Create phase-specific prompt
      const prompt = this.buildPhasePrompt(team, phase, context, primaryAgent);
      
      // Execute primary agent task
      primaryAgent.status = 'working';
      primaryAgent.currentTask = phase.name;
      
      const primaryResult = await this.executeAgentTask(primaryAgent, prompt, team);
      
      // Get supporting agent input if needed
      const supportingResults = [];
      for (const supportAgent of supportingAgents) {
        const supportPrompt = this.buildSupportPrompt(phase, context, primaryResult, supportAgent);
        const supportResult = await this.executeAgentTask(supportAgent, supportPrompt, team);
        supportingResults.push(supportResult);
      }
      
      // Combine results
      const phaseResult = {
        phase: phase.name,
        primary: {
          agent: primaryAgent.name,
          result: primaryResult
        },
        supporting: supportingResults.map((result, index) => ({
          agent: supportingAgents[index].name,
          result
        })),
        timestamp: new Date().toISOString()
      };
      
      // Update agent statuses
      primaryAgent.status = 'ready';
      primaryAgent.currentTask = null;
      primaryAgent.results.push(primaryResult);
      
      return phaseResult;

    } catch (error) {
      this.logger.error(`❌ Phase execution failed: ${phase.name}`, error);
      throw error;
    }
  }

  buildPhaseContext(team, phaseIndex) {
    const previousResults = team.results.slice(0, phaseIndex);
    
    return {
      requirement: team.requirement,
      workflow: team.workflow.name,
      completedPhases: previousResults.map(r => r.phase),
      previousResults,
      currentPhaseIndex: phaseIndex,
      totalPhases: team.workflow.phases.length
    };
  }

  buildPhasePrompt(team, phase, context, agent) {
    let prompt = `${agent.prompt}\n\n`;
    prompt += `TEAM MISSION: ${team.requirement}\n\n`;
    prompt += `CURRENT PHASE: ${phase.name} (${context.currentPhaseIndex + 1}/${context.totalPhases})\n`;
    prompt += `YOUR ROLE: Primary responsibility for this phase\n\n`;
    
    if (context.previousResults.length > 0) {
      prompt += `PREVIOUS PHASES COMPLETED:\n`;
      context.previousResults.forEach(result => {
        prompt += `- ${result.phase}: ${result.primary.result.summary || 'Completed'}\n`;
      });
      prompt += '\n';
    }
    
    prompt += `PHASE OBJECTIVE: Execute ${phase.name} phase for the requirement above.\n`;
    prompt += `Focus on your expertise: ${agent.expertise}\n\n`;
    prompt += `Provide a clear, actionable result that the next phase can build upon.`;
    
    return prompt;
  }

  buildSupportPrompt(phase, context, primaryResult, supportAgent) {
    let prompt = `${supportAgent.prompt}\n\n`;
    prompt += `TEAM PHASE: ${phase.name}\n`;
    prompt += `YOUR ROLE: Supporting the primary agent's work\n\n`;
    prompt += `PRIMARY AGENT RESULT:\n${primaryResult.content || primaryResult.summary}\n\n`;
    prompt += `Please provide supporting insights, suggestions, or validation from your perspective as ${supportAgent.name}.`;
    
    return prompt;
  }

  async executeAgentTask(agent, prompt, team) {
    try {
      const result = await this.claudeBridge.executeCommand({
        command: prompt,
        sessionId: team.sessionId,
        workDir: team.projectPath
      });

      // Parse and structure result
      const taskResult = {
        agent: agent.name,
        role: agent.role,
        content: result.result.content || result.result.raw,
        summary: this.extractSummary(result.result),
        duration: result.duration,
        timestamp: new Date().toISOString()
      };

      // Add to agent's conversation history
      agent.conversationHistory.push({
        prompt: prompt.substring(0, 200) + '...',
        result: taskResult,
        timestamp: new Date().toISOString()
      });

      return taskResult;

    } catch (error) {
      throw new Error(`Agent task failed for ${agent.name}: ${error.message}`);
    }
  }

  extractSummary(result) {
    const content = result.content || result.raw || '';
    
    // Try to find a summary in the response
    const summaryMatch = content.match(/summary:?\s*(.+?)(?:\n|$)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
    
    // Fallback to first sentence or first 100 characters
    const firstSentence = content.match(/^[^.!?]*[.!?]/);
    if (firstSentence) {
      return firstSentence[0];
    }
    
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  }

  async generateTeamSummary(team) {
    try {
      const prompt = `Generate a comprehensive summary of this AI team collaboration:

TEAM: ${team.id}
REQUIREMENT: ${team.requirement}
WORKFLOW: ${team.workflow.name}
DURATION: ${((team.endTime - team.startTime) / 1000 / 60).toFixed(1)} minutes

PHASES COMPLETED:
${team.results.map((result, index) => {
  return `${index + 1}. ${result.phase}: ${result.primary.result.summary}`;
}).join('\n')}

AGENTS INVOLVED:
${Array.from(team.agents.values()).map(agent => `- ${agent.name} (${agent.role})`).join('\n')}

Please provide a JSON summary:
{
  "executiveSummary": "High-level overview of what the team accomplished",
  "keyDeliverables": ["deliverable 1", "deliverable 2"],
  "teamPerformance": {
    "efficiency": "high|medium|low",
    "collaboration": "excellent|good|fair|poor",
    "qualityScore": 0.85
  },
  "recommendations": ["recommendation 1", "recommendation 2"],
  "nextSteps": ["next step 1", "next step 2"]
}`;

      const result = await this.claudeBridge.executeCommand({
        command: prompt,
        sessionId: team.sessionId
      });

      return this.parseTeamSummary(result.result);

    } catch (error) {
      this.logger.warn('Failed to generate team summary:', error);
      return this.fallbackTeamSummary(team);
    }
  }

  parseTeamSummary(result) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.fallbackTeamSummary(null);
    } catch (error) {
      return this.fallbackTeamSummary(null);
    }
  }

  fallbackTeamSummary(team) {
    return {
      executiveSummary: 'AI team collaboration completed successfully',
      keyDeliverables: team ? [`Completed ${team.workflow.name} workflow`] : ['Workflow completed'],
      teamPerformance: {
        efficiency: 'medium',
        collaboration: 'good',
        qualityScore: 0.75
      },
      recommendations: ['Review team output', 'Plan next iteration'],
      nextSteps: ['Implement recommendations', 'Monitor results']
    };
  }

  estimateDuration(workflow) {
    // Rough estimates in minutes
    const phaseEstimates = {
      'Analysis': 5,
      'Planning': 7,
      'Design': 8,
      'Implementation': 15,
      'Backend': 12,
      'Frontend': 10,
      'Integration': 8,
      'Testing': 10,
      'Review': 5,
      'Documentation': 6,
      'Deployment': 8,
      'Preparation': 5,
      'Investigation': 8,
      'Fix': 10,
      'Verification': 5
    };
    
    const totalMinutes = workflow.phases.reduce((sum, phase) => {
      return sum + (phaseEstimates[phase.name] || 5);
    }, 0);
    
    return {
      minutes: totalMinutes,
      display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    };
  }

  async getTeamStatus(teamId) {
    const team = this.activeTeams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    const progress = team.workflow.phases.length > 0 
      ? (team.currentPhase / team.workflow.phases.length) * 100 
      : 0;

    return {
      id: team.id,
      status: team.status,
      progress: Math.round(progress),
      currentPhase: team.workflow.phases[team.currentPhase]?.name || 'Completed',
      totalPhases: team.workflow.phases.length,
      agents: Array.from(team.agents.values()).map(agent => ({
        name: agent.name,
        role: agent.role,
        status: agent.status,
        currentTask: agent.currentTask
      })),
      results: team.results.length,
      startTime: team.startTime,
      endTime: team.endTime
    };
  }

  generateTeamId() {
    return `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up AI Team Service...');
    
    // Stop all active teams gracefully
    for (const [teamId, team] of this.activeTeams) {
      if (team.status === 'executing') {
        team.status = 'stopped';
        this.logger.info(`⏹️  Stopped team: ${teamId}`);
      }
    }
    
    this.activeTeams.clear();
    this.teamWorkflows.clear();
    
    this.logger.info('✅ AI Team Service cleanup complete');
  }
}

module.exports = { AITeamService };