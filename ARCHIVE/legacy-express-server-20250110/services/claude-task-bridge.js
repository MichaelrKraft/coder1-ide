/**
 * Claude Task Bridge Service
 * 
 * Triggers Claude's native Task tool to leverage Claude Code Max subscription
 * for zero-cost agent execution. Returns a formatted request that can be
 * presented to Claude Code to spawn agents using the Task tool.
 * 
 * This replaces external API calls with Claude's built-in capabilities.
 */

class ClaudeTaskBridge {
  constructor() {
    this.activeTask = null;
    this.outputBuffer = [];
  }

  /**
   * Format a request for Claude's Task tool
   * This returns a structured prompt that triggers Claude to use the Task tool
   */
  formatTaskRequest(requirements, agents) {
    const agentDescriptions = agents.map(agent => {
      const roleMap = {
        'frontend-engineer': 'Frontend development with React, TypeScript, and modern UI',
        'backend-engineer': 'Backend API development with Node.js and databases',
        'qa-testing': 'Comprehensive testing and quality assurance',
        'devops-engineer': 'CI/CD pipeline and deployment configuration',
        'security-analyst': 'Security analysis and vulnerability assessment',
        'ux-designer': 'User experience design and interface mockups'
      };
      
      return `- ${agent.name}: ${roleMap[agent.type] || agent.role}`;
    }).join('\n');

    // Format the request for Claude's Task tool
    const taskPrompt = `
Please use the Task tool to coordinate the following specialized agents to implement this project:

**Project Requirements:**
${requirements}

**Team Composition:**
${agentDescriptions}

**Instructions for Task Tool:**
1. Spawn the appropriate specialized agents based on the team composition
2. Delegate specific aspects of the requirements to each agent
3. Coordinate the agents to work on their respective areas
4. Ensure comprehensive implementation covering all requirements
5. Return structured output showing what each agent accomplished

Please execute this as a single Task with multiple sub-agents working in parallel.
The Task description should be: "AI Team implementing project requirements"
`;

    return taskPrompt;
  }

  /**
   * Parse Claude Task output into structured agent activities
   * Extracts what each agent did from the Task result
   */
  parseTaskOutput(taskOutput) {
    const activities = [];
    const lines = taskOutput.split('\n');
    
    let currentAgent = null;
    let currentActivity = [];
    
    for (const line of lines) {
      // Detect agent mentions
      const agentMatch = line.match(/(?:Frontend|Backend|QA|DevOps|Security|UX|Designer|Engineer|Analyst|Testing):/i);
      
      if (agentMatch) {
        // Save previous agent's activity
        if (currentAgent && currentActivity.length > 0) {
          activities.push({
            agent: currentAgent,
            activity: currentActivity.join(' '),
            timestamp: new Date().toISOString()
          });
        }
        
        // Start new agent activity
        currentAgent = agentMatch[0].replace(':', '');
        currentActivity = [line.substring(agentMatch.index + agentMatch[0].length).trim()];
      } else if (currentAgent && line.trim()) {
        // Continue current agent's activity
        currentActivity.push(line.trim());
      } else if (!currentAgent && line.trim()) {
        // General task output
        activities.push({
          agent: 'Task Coordinator',
          activity: line.trim(),
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Save last agent's activity
    if (currentAgent && currentActivity.length > 0) {
      activities.push({
        agent: currentAgent,
        activity: currentActivity.join(' '),
        timestamp: new Date().toISOString()
      });
    }
    
    return activities;
  }

  /**
   * Stream task output to preview panel
   * This would be called as Claude returns Task results
   */
  streamTaskOutput(output, onUpdate) {
    const activities = this.parseTaskOutput(output);
    
    activities.forEach((activity, index) => {
      // Simulate streaming with delays
      setTimeout(() => {
        onUpdate({
          type: 'task-activity',
          agent: activity.agent,
          activity: activity.activity,
          timestamp: activity.timestamp,
          index: this.outputBuffer.length
        });
        
        this.outputBuffer.push(activity);
      }, index * 500); // Stagger updates for streaming effect
    });
  }

  /**
   * Get formatted output for display
   */
  getFormattedOutput() {
    return this.outputBuffer.map(item => {
      const time = new Date(item.timestamp).toLocaleTimeString();
      return `[${time}] ${item.agent}: ${item.activity}`;
    }).join('\n');
  }

  /**
   * Clear the output buffer for a new task
   */
  clearOutput() {
    this.outputBuffer = [];
    this.activeTask = null;
  }

  /**
   * Example integration with dashboard
   * This shows how to connect Task Bridge with the UI
   */
  integrateWithDashboard() {
    return {
      // Start a new task with visual animations
      startTask: async (requirements, agents, callbacks) => {
        // Clear previous output
        this.clearOutput();
        
        // Format the Task request
        const taskPrompt = this.formatTaskRequest(requirements, agents);
        
        // Start visual animations (top tier)
        callbacks.onAnimationStart(agents);
        
        // Show Task prompt in preview (bottom tier)
        callbacks.onTaskStart(taskPrompt);
        
        // Note: Actual Task execution would happen in Claude
        // This is where Claude would use the Task tool
        // For now, we return the formatted prompt
        
        return {
          prompt: taskPrompt,
          bridge: this,
          // Method to feed back Task results
          processResults: (taskOutput) => {
            this.streamTaskOutput(taskOutput, callbacks.onTaskUpdate);
            callbacks.onTaskComplete();
          }
        };
      }
    };
  }
}

module.exports = ClaudeTaskBridge;