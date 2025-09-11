/**
 * Command processing and execution for wcygan commands
 * Handles template processing, parameter substitution, and dual-mode execution
 */

import { WcyganCommand, CommandExecutionMode, CommandExecutionResult, CommandSuggestion } from './types';

export class WcyganCommandProcessor {
  private contextPatterns = {
    frontend: /\.(jsx?|tsx?|css|scss|sass|html)$/i,
    backend: /\.(js|ts|py|go|java|rb|php)$/i,
    database: /\.(sql|prisma|schema)$/i,
    config: /\.(json|yaml|yml|toml|env|config)$/i,
    test: /\.(test|spec)\.(js|ts|jsx|tsx)$/i,
    error: /(error|exception|failed|not found)/i
  };

  /**
   * Process command template with parameter substitution
   */
  processCommandTemplate(
    command: WcyganCommand, 
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): string {
    let processedTemplate = command.template;

    // Substitute $ARGUMENTS pattern
    const argumentsValue = parameters.target || parameters.arguments || '';
    processedTemplate = processedTemplate.replace(/\$ARGUMENTS?/g, argumentsValue);

    // Substitute other variables
    Object.entries(parameters).forEach(([key, value]) => {
      const pattern = new RegExp(`\\$${key.toUpperCase()}`, 'g');
      processedTemplate = processedTemplate.replace(pattern, String(value));
    });

    // Context-based substitutions
    if (context.currentFile) {
      processedTemplate = processedTemplate.replace(/\$FILE/g, context.currentFile);
    }
    
    if (context.terminalOutput) {
      processedTemplate = processedTemplate.replace(/\$ERROR/g, context.terminalOutput);
    }

    if (context.projectName) {
      processedTemplate = processedTemplate.replace(/\$PROJECT/g, context.projectName);
    }

    // Add context information to template
    if (Object.keys(context).length > 0) {
      processedTemplate += `\n\n## Context Information\n`;
      
      if (context.currentFile) {
        processedTemplate += `- Current file: ${context.currentFile}\n`;
      }
      
      if (context.terminalOutput) {
        processedTemplate += `- Terminal output: ${context.terminalOutput.substring(0, 200)}...\n`;
      }
      
      if (context.recentCommands) {
        processedTemplate += `- Recent commands: ${context.recentCommands.slice(0, 3).join(', ')}\n`;
      }
    }

    return processedTemplate;
  }

  /**
   * Execute command in template mode (copy to clipboard)
   */
  async executeTemplateMode(
    command: WcyganCommand,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    try {
      const startTime = Date.now();
      
      const processedTemplate = this.processCommandTemplate(command, parameters, context);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(processedTemplate);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        mode: 'template',
        output: 'Template copied to clipboard',
        executionTime,
        templateProcessed: true
      };
    } catch (error) {
      return {
        success: false,
        mode: 'template',
        error: error instanceof Error ? error.message : 'Failed to copy template'
      };
    }
  }

  /**
   * Execute command through AI agent
   */
  async executeAgentMode(
    command: WcyganCommand,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {},
    agentName?: string
  ): Promise<CommandExecutionResult> {
    try {
      const startTime = Date.now();
      
      // Determine appropriate agent
      const selectedAgent = agentName || this.selectAgentForCommand(command);
      
      // Process template for agent
      const processedTemplate = this.processCommandTemplate(command, parameters, context);
      
      // Enhanced prompt for agent
      const agentPrompt = this.createAgentPrompt(command, processedTemplate, selectedAgent);
      
      // Execute through existing SubAgentManager
      // This would integrate with the existing AI agent system
      const result = await this.executeWithSubAgent(selectedAgent, agentPrompt, context);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        mode: 'agent',
        output: result.output,
        executionTime,
        agentUsed: selectedAgent,
        templateProcessed: true
      };
    } catch (error) {
      return {
        success: false,
        mode: 'agent',
        error: error instanceof Error ? error.message : 'Agent execution failed'
      };
    }
  }

  /**
   * Execute command in hybrid mode (template + agent enhancement)
   */
  async executeHybridMode(
    command: WcyganCommand,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    try {
      const startTime = Date.now();
      
      // First, prepare template
      const processedTemplate = this.processCommandTemplate(command, parameters, context);
      
      // Select appropriate agent
      const agentName = this.selectAgentForCommand(command);
      
      // Create hybrid prompt that includes structured methodology
      const hybridPrompt = `
${processedTemplate}

---

ADDITIONAL INSTRUCTIONS FOR AI AGENT:
You are the ${agentName} agent enhanced with the above structured methodology. 
Follow the systematic approach outlined above while leveraging your specialized knowledge.

Provide both:
1. Structured analysis following the template steps
2. Enhanced insights using your domain expertise

Context: ${JSON.stringify(context, null, 2)}
`;

      // Execute through agent system
      const result = await this.executeWithSubAgent(agentName, hybridPrompt, context);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        mode: 'hybrid',
        output: result.output,
        executionTime,
        agentUsed: agentName,
        templateProcessed: true
      };
    } catch (error) {
      return {
        success: false,
        mode: 'hybrid',
        error: error instanceof Error ? error.message : 'Hybrid execution failed'
      };
    }
  }

  /**
   * Select appropriate agent for command
   */
  private selectAgentForCommand(command: WcyganCommand): string {
    // Map command categories to existing agents
    const agentMapping: Record<string, string> = {
      'debugging': '@debugger',
      'documentation': '@documentation-writer',
      'planning': '@architect',
      'quality': '@code-reviewer',
      'refactoring': '@refactoring-expert',
      'testing': '@test-engineer',
      'optimization': '@performance-optimizer',
      'security': '@security-auditor',
      'deployment': '@devops-engineer',
      'architecture': '@architect',
      'database': '@database-specialist',
      'frontend': '@frontend-specialist',
      'backend': '@backend-specialist',
      'devops': '@devops-engineer',
      'general': '@implementer'
    };

    return agentMapping[command.category] || '@implementer';
  }

  /**
   * Create enhanced prompt for agent
   */
  private createAgentPrompt(
    command: WcyganCommand,
    processedTemplate: string,
    agentName: string
  ): string {
    return `
You are ${agentName}, enhanced with structured methodology from wcygan's command library.

COMMAND: ${command.slashCommand}
CATEGORY: ${command.category}
DESCRIPTION: ${command.description}

STRUCTURED METHODOLOGY TO FOLLOW:
${processedTemplate}

INSTRUCTIONS:
1. Follow the structured approach outlined above
2. Apply your specialized domain knowledge
3. Provide systematic, step-by-step analysis
4. Include specific, actionable recommendations
5. Maintain focus on the methodology while adding expert insights

Your response should combine the systematic approach with your expertise in ${command.category}.
`;
  }

  /**
   * Execute with existing SubAgentManager
   * This is a placeholder - would integrate with actual SubAgentManager
   */
  private async executeWithSubAgent(
    agentName: string,
    prompt: string,
    context: Record<string, any>
  ): Promise<{ output: string }> {
    // This would integrate with the existing SubAgentManager system
    // For now, return a mock response indicating the integration point
    
    return {
      output: `[${agentName}] Enhanced with wcygan methodology:

${prompt}

// This would be processed by your existing SubAgentManager
// with the agent's specialized knowledge and the structured methodology`
    };
  }

  /**
   * Get command suggestions based on context
   */
  getSuggestionsForContext(
    commands: WcyganCommand[],
    context: {
      currentFile?: string;
      terminalOutput?: string;
      recentCommands?: string[];
      openFiles?: string[];
    }
  ): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    // Analyze context for relevant commands
    for (const command of commands) {
      const suggestion = this.analyzeCommandRelevance(command, context);
      if (suggestion.relevanceScore > 0.3) {
        suggestions.push(suggestion);
      }
    }

    // Sort by relevance score
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Analyze command relevance to current context
   */
  private analyzeCommandRelevance(
    command: WcyganCommand,
    context: Record<string, any>
  ): CommandSuggestion {
    let score = 0;
    let reason = '';

    // File type analysis
    if (context.currentFile) {
      const file = context.currentFile.toLowerCase();
      
      if (this.contextPatterns.frontend.test(file) && command.category === 'frontend') {
        score += 0.4;
        reason = 'Frontend file detected';
      }
      
      if (this.contextPatterns.backend.test(file) && command.category === 'backend') {
        score += 0.4;
        reason = 'Backend file detected';
      }
      
      if (this.contextPatterns.test.test(file) && command.category === 'testing') {
        score += 0.5;
        reason = 'Test file detected';
      }
    }

    // Terminal output analysis
    if (context.terminalOutput) {
      const output = context.terminalOutput.toLowerCase();
      
      if (this.contextPatterns.error.test(output)) {
        if (command.category === 'debugging') {
          score += 0.6;
          reason = 'Error detected in terminal';
        }
      }
      
      if (output.includes('test') && command.category === 'testing') {
        score += 0.4;
        reason = 'Testing activity detected';
      }
      
      if (output.includes('build') && command.category === 'deployment') {
        score += 0.3;
        reason = 'Build process detected';
      }
    }

    // Recent commands analysis
    if (context.recentCommands) {
      const commands = context.recentCommands.join(' ').toLowerCase();
      
      if (commands.includes('git') && command.name.includes('commit')) {
        score += 0.3;
        reason = 'Git activity detected';
      }
      
      if (commands.includes('npm') && command.category === 'deployment') {
        score += 0.2;
        reason = 'Package management detected';
      }
    }

    // Command name matching
    if (context.currentFile && command.tags.some(tag => 
      context.currentFile?.toLowerCase().includes(tag)
    )) {
      score += 0.2;
      reason = reason || 'Relevant to current file';
    }

    return {
      command,
      relevanceScore: Math.min(score, 1.0), // Cap at 1.0
      reason: reason || 'General relevance',
      context
    };
  }

  /**
   * Search commands by query
   */
  searchCommands(
    commands: WcyganCommand[],
    query: string,
    category?: string
  ): WcyganCommand[] {
    const searchTerm = query.toLowerCase();
    
    return commands
      .filter(command => {
        // Category filter
        if (category && command.category !== category) {
          return false;
        }
        
        // Search in name, description, and tags
        return (
          command.name.toLowerCase().includes(searchTerm) ||
          command.description.toLowerCase().includes(searchTerm) ||
          command.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
          command.template.toLowerCase().includes(searchTerm)
        );
      })
      .sort((a, b) => {
        // Prioritize exact name matches
        if (a.name.toLowerCase() === searchTerm) return -1;
        if (b.name.toLowerCase() === searchTerm) return 1;
        
        // Then sort by name contains query
        const aNameMatch = a.name.toLowerCase().includes(searchTerm);
        const bNameMatch = b.name.toLowerCase().includes(searchTerm);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (bNameMatch && !aNameMatch) return 1;
        
        // Finally sort alphabetically
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Get usage statistics for commands
   */
  getCommandStats(commands: WcyganCommand[]): {
    totalCommands: number;
    categoryCounts: Record<string, number>;
    complexityDistribution: Record<string, number>;
    averageEstimatedTime: string;
  } {
    const categoryCounts: Record<string, number> = {};
    const complexityDistribution: Record<string, number> = {};
    
    commands.forEach(command => {
      // Category counts
      categoryCounts[command.category] = (categoryCounts[command.category] || 0) + 1;
      
      // Complexity distribution
      complexityDistribution[command.complexity] = (complexityDistribution[command.complexity] || 0) + 1;
    });

    return {
      totalCommands: commands.length,
      categoryCounts,
      complexityDistribution,
      averageEstimatedTime: '10-15 minutes' // Could calculate this properly
    };
  }
}