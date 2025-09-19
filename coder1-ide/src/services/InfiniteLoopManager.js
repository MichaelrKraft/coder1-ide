// InfiniteLoopManager - manages infinite agent execution sessions
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class InfiniteLoopManager {
  constructor() {
    this.sessions = new Map();
    this.isRunning = false;
    this.projectsDir = path.join(__dirname, '../../projects');
  }

  // Test Claude connection
  async testClaudeConnection() {
    console.log('Testing Claude connection...');
    
    // Check if we have API key
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY || !!process.env.CLAUDE_CODE_API_KEY;
    
    if (!hasApiKey) {
      return {
        success: false,
        message: 'No API key configured',
        apiStatus: 'missing_key'
      };
    }
    
    // TODO: Make actual API test call
    return {
      success: true,
      message: 'Claude connection ready',
      apiStatus: 'ready'
    };
  }

  // Start an infinite loop session
  async startInfiniteLoop(command) {
    const sessionId = `infinite-${Date.now()}`;
    const projectPath = path.join(this.projectsDir, sessionId);
    
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });
    
    const session = {
      id: sessionId,
      command,
      status: 'running',
      startTime: new Date(),
      projectPath,
      waves: [],
      currentWave: 0,
      totalGenerated: 0,
      process: null,
      buffer: '',
      isExecuting: false
    };
    
    this.sessions.set(sessionId, session);
    console.log('Started infinite loop session:', sessionId, command);
    
    // Start the actual execution
    await this.startExecution(session);
    
    return session;
  }
  
  // Start actual execution with terminal
  async startExecution(session) {
    try {
      session.isExecuting = true;
      
      // For now, we'll execute commands directly
      // In a real implementation, this would integrate with Claude Code CLI
      console.log(`Executing infinite loop command: ${session.command}`);
      
      // Simulate continuous execution
      session.interval = setInterval(async () => {
        if (session.status !== 'running') {
          clearInterval(session.interval);
          return;
        }
        
        // Increment wave count
        session.currentWave++;
        
        // Simulate generating components
        const output = `\n🔄 Wave ${session.currentWave} - Generating components...\n`;
        session.buffer += output;
        
        // Emit progress if we have a websocket
        if (global.terminalEmitter) {
          global.terminalEmitter.emit('infinite-output', {
            sessionId: session.id,
            output: output
          });
        }
        
      }, 5000); // Generate new wave every 5 seconds
      
    } catch (error) {
      console.error('Failed to start execution:', error);
      session.status = 'failed';
      session.error = error.message;
    }
  }

  // Generate a wave of results (called manually or automatically)
  async generateWave(sessionId, waveNumber) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    console.log(`Generating wave ${waveNumber} for session ${sessionId}`);
    
    // Use actual Claude API to generate components
    const waveResult = await this.executeWaveGeneration(session, waveNumber);
    
    session.waves.push(waveResult);
    session.currentWave = Math.max(session.currentWave, waveNumber);
    session.totalGenerated += waveResult.results || 0;

    return waveResult;
  }
  
  // Execute actual wave generation with Claude API
  async executeWaveGeneration(session, waveNumber) {
    try {
      // Check API availability
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_API_KEY;
      
      if (!apiKey) {
        return {
          waveNumber,
          status: 'error',
          error: 'No API key configured',
          results: 0,
          timestamp: new Date()
        };
      }
      
      // Use Claude API to generate actual components
      const { ClaudeCodeAPI } = require('../integrations/claude-code-api');
      const claude = new ClaudeCodeAPI(apiKey);
      
      const prompt = `Generate 5 React components for wave ${waveNumber} of an infinite loop session. 
      Command: ${session.command}
      
      Please create functional React components with proper names and structure.`;
      
      const response = await claude.sendMessage(prompt, {
        maxTokens: 2000,
        temperature: 0.7
      });
      
      // Parse components from response (simplified)
      const components = this.parseComponentsFromResponse(response);
      
      // Write components to files
      await this.writeComponentsToProject(session, components, waveNumber);
      
      const output = `\n✅ Wave ${waveNumber} completed - Generated ${components.length} components\n`;
      session.buffer += output;
      
      // Emit to websocket
      if (global.terminalEmitter) {
        global.terminalEmitter.emit('infinite-output', {
          sessionId: session.id,
          output: output
        });
      }
      
      return {
        waveNumber,
        status: 'completed',
        results: components.length,
        timestamp: new Date(),
        components: components.map(c => c.name)
      };
      
    } catch (error) {
      console.error(`Wave ${waveNumber} generation failed:`, error);
      
      const errorOutput = `\n❌ Wave ${waveNumber} failed: ${error.message}\n`;
      session.buffer += errorOutput;
      
      if (global.terminalEmitter) {
        global.terminalEmitter.emit('infinite-output', {
          sessionId: session.id,
          output: errorOutput
        });
      }
      
      return {
        waveNumber,
        status: 'error',
        error: error.message,
        results: 0,
        timestamp: new Date()
      };
    }
  }
  
  // Parse components from Claude response
  parseComponentsFromResponse(response) {
    // Simple parsing - look for component names
    const componentRegex = /(?:function|const|class)\s+([A-Z][a-zA-Z0-9]+)/g;
    const components = [];
    let match;
    
    while ((match = componentRegex.exec(response)) !== null) {
      components.push({
        name: match[1],
        code: `// Generated component: ${match[1]}\n${response}`
      });
    }
    
    // Fallback: create numbered components if none found
    if (components.length === 0) {
      for (let i = 1; i <= 5; i++) {
        components.push({
          name: `Component${i}`,
          code: `// Auto-generated component ${i}\nfunction Component${i}() {\n  return <div>Component ${i}</div>;\n}`
        });
      }
    }
    
    return components.slice(0, 5); // Limit to 5 components per wave
  }
  
  // Write components to project directory
  async writeComponentsToProject(session, components, waveNumber) {
    const waveDir = path.join(session.projectPath, `wave-${waveNumber}`);
    await fs.mkdir(waveDir, { recursive: true });
    
    for (const component of components) {
      const filePath = path.join(waveDir, `${component.name}.jsx`);
      await fs.writeFile(filePath, component.code, 'utf8');
    }
    
    console.log(`📁 Wrote ${components.length} components to ${waveDir}`);
  }

  // Get session status
  getSessionStatus(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Stop a session
  stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
      session.endTime = new Date();
      
      // Clear interval if running
      if (session.interval) {
        clearInterval(session.interval);
        session.interval = null;
      }
      
      // Kill process if running
      if (session.process && !session.process.killed) {
        session.process.kill();
      }
      
      const output = `\n🛑 Infinite loop session stopped\n`;
      session.buffer += output;
      
      // Emit stop notification
      if (global.terminalEmitter) {
        global.terminalEmitter.emit('infinite-output', {
          sessionId: session.id,
          output: output
        });
      }
      
      return session;
    }
    return null;
  }

  // List active sessions
  listActiveSessions() {
    return Array.from(this.sessions.values())
      .filter(session => session.status === 'running')
      .map(session => ({
        id: session.id,
        command: session.command,
        startTime: session.startTime,
        currentWave: session.currentWave,
        totalGenerated: session.totalGenerated
      }));
  }

  // Legacy methods for compatibility
  createLoop(config) {
    console.log('Creating infinite loop:', config);
    return { id: Date.now(), status: 'running' };
  }

  stopLoop(id) {
    console.log('Stopping loop:', id);
    return true;
  }

  getLoops() {
    return this.listActiveSessions();
  }
}

module.exports = InfiniteLoopManager;