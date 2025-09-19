const fs = require('fs').promises;
const path = require('path');

class CommandRouter {
  constructor(options) {
    this.claudeBridge = options.claudeBridge;
    this.fileSync = options.fileSync;
    this.logger = options.logger;
    
    // Command handlers
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  registerDefaultHandlers() {
    // CheckPoint commands
    this.handlers.set('checkpoint:create', this.handleCheckpointCreate.bind(this));
    this.handlers.set('checkpoint:list', this.handleCheckpointList.bind(this));
    this.handlers.set('checkpoint:restore', this.handleCheckpointRestore.bind(this));

    // Session commands
    this.handlers.set('session:summary', this.handleSessionSummary.bind(this));
    this.handlers.set('session:timeline', this.handleSessionTimeline.bind(this));
    this.handlers.set('session:export', this.handleSessionExport.bind(this));

    // File operations
    this.handlers.set('files:sync', this.handleFileSync.bind(this));
    this.handlers.set('files:watch', this.handleFileWatch.bind(this));

    // Custom commands (.claude/commands integration)
    this.handlers.set('custom:execute', this.handleCustomCommand.bind(this));
    this.handlers.set('custom:list', this.handleListCustomCommands.bind(this));
    this.handlers.set('custom:create', this.handleCreateCustomCommand.bind(this));
  }

  async routeCommand(command, data, context) {
    this.logger.info(`🎯 Routing command: ${command}`);

    try {
      const handler = this.handlers.get(command);
      
      if (!handler) {
        throw new Error(`Unknown command: ${command}`);
      }

      const result = await handler(data, context);
      
      this.logger.success(`✅ Command completed: ${command}`);
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Command failed: ${command}`, error);
      throw error;
    }
  }

  // CheckPoint System - Enhanced with Claude Intelligence
  async handleCheckpointCreate(data, context) {
    const { sessionId, projectPath, files, terminal, metadata } = data;
    
    this.logger.info(`📸 Creating intelligent checkpoint for session: ${sessionId}`);

    try {
      // Step 1: Gather context for Claude analysis
      const checkpointContext = await this.gatherCheckpointContext(projectPath, files, terminal);
      
      // Step 2: Generate intelligent checkpoint name and description via Claude
      const analysis = await this.claudeBridge.executeCommand({
        command: this.buildCheckpointAnalysisPrompt(checkpointContext),
        workDir: projectPath,
        sessionId
      });

      const checkpointData = this.parseCheckpointAnalysis(analysis.result);
      
      // Step 3: Create checkpoint with Claude-generated metadata
      const checkpoint = {
        id: this.generateCheckpointId(),
        sessionId,
        timestamp: new Date().toISOString(),
        projectPath,
        metadata: {
          ...metadata,
          name: checkpointData.name,
          description: checkpointData.description,
          significance: checkpointData.significance,
          tags: checkpointData.tags
        },
        snapshot: {
          files: files || {},
          terminal: terminal || '',
          git: await this.getGitSnapshot(projectPath)
        }
      };

      // Step 4: Save checkpoint
      await this.saveCheckpoint(checkpoint);
      
      this.logger.success(`✅ Intelligent checkpoint created: ${checkpoint.metadata.name}`);
      
      return {
        success: true,
        checkpoint: {
          id: checkpoint.id,
          name: checkpoint.metadata.name,
          description: checkpoint.metadata.description,
          timestamp: checkpoint.timestamp
        }
      };

    } catch (error) {
      this.logger.error('Failed to create checkpoint:', error);
      throw error;
    }
  }

  async gatherCheckpointContext(projectPath, files, terminal) {
    const context = {
      projectPath,
      timestamp: new Date().toISOString(),
      files: [],
      recentCommands: [],
      gitStatus: null,
      packageJson: null
    };

    try {
      // Get recent file changes
      if (files && typeof files === 'object') {
        context.files = Object.entries(files).map(([path, content]) => ({
          path,
          size: typeof content === 'string' ? content.length : 0,
          modified: true
        }));
      }

      // Extract recent terminal commands
      if (terminal) {
        const lines = terminal.split('\n');
        const commands = lines
          .filter(line => line.includes('$ ') || line.includes('> '))
          .slice(-10); // Last 10 commands
        context.recentCommands = commands;
      }

      // Get git status
      try {
        const gitStatus = await this.getGitStatus(projectPath);
        context.gitStatus = gitStatus;
      } catch (error) {
        // Git not available or not a git repo
      }

      // Check package.json for project type
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        context.packageJson = JSON.parse(packageContent);
      } catch (error) {
        // No package.json or not readable
      }

      return context;

    } catch (error) {
      this.logger.warn('Error gathering checkpoint context:', error);
      return context; // Return partial context
    }
  }

  buildCheckpointAnalysisPrompt(context) {
    return `Analyze this development session and create a checkpoint with intelligent naming:

PROJECT CONTEXT:
- Path: ${context.projectPath}
- Project Type: ${context.packageJson?.name || 'Unknown'}
- Framework: ${this.detectFramework(context.packageJson)}

RECENT CHANGES:
- Files modified: ${context.files.length}
- Key files: ${context.files.slice(0, 5).map(f => f.path).join(', ')}

RECENT COMMANDS:
${context.recentCommands.join('\n')}

GIT STATUS:
${context.gitStatus ? JSON.stringify(context.gitStatus, null, 2) : 'Not available'}

Please provide a JSON response with:
{
  "name": "Brief descriptive name (max 50 chars)",
  "description": "Detailed description of what was accomplished",
  "significance": "low|medium|high",
  "tags": ["tag1", "tag2", "tag3"]
}

Focus on what was actually accomplished, not just what files changed.`;
  }

  parseCheckpointAnalysis(analysisResult) {
    try {
      // Try to extract JSON from Claude's response
      let jsonStr = analysisResult.raw || analysisResult.content || '';
      
      // Look for JSON in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          name: parsed.name || `Checkpoint ${new Date().toLocaleTimeString()}`,
          description: parsed.description || 'Development checkpoint',
          significance: parsed.significance || 'medium',
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['development']
        };
      }
      
      // Fallback to text analysis
      return this.fallbackAnalysis(jsonStr);
      
    } catch (error) {
      this.logger.warn('Failed to parse checkpoint analysis, using fallback');
      return this.fallbackAnalysis('');
    }
  }

  fallbackAnalysis(content) {
    const timestamp = new Date().toLocaleTimeString();
    return {
      name: `Checkpoint ${timestamp}`,
      description: content.substring(0, 200) || 'Development checkpoint',
      significance: 'medium',
      tags: ['development', 'checkpoint']
    };
  }

  detectFramework(packageJson) {
    if (!packageJson || !packageJson.dependencies) return 'Unknown';
    
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react) return 'React';
    if (deps.vue) return 'Vue';
    if (deps.angular) return 'Angular';
    if (deps.next) return 'Next.js';
    if (deps.express) return 'Express';
    if (deps.typescript) return 'TypeScript';
    
    return 'JavaScript';
  }

  async getGitStatus(projectPath) {
    try {
      const { execSync } = require('child_process');
      
      const status = execSync('git status --porcelain', {
        cwd: projectPath,
        encoding: 'utf8'
      });
      
      const branch = execSync('git branch --show-current', {
        cwd: projectPath,
        encoding: 'utf8'
      }).trim();
      
      return {
        branch,
        status: status.split('\n').filter(line => line.trim()),
        hasChanges: status.trim() !== ''
      };
      
    } catch (error) {
      return null;
    }
  }

  async getGitSnapshot(projectPath) {
    try {
      const { execSync } = require('child_process');
      
      return {
        branch: execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf8' }).trim(),
        commit: execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf8' }).trim(),
        status: execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf8' })
      };
    } catch (error) {
      return null;
    }
  }

  generateCheckpointId() {
    return `ckpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  async saveCheckpoint(checkpoint) {
    const checkpointsDir = path.join(require('os').homedir(), '.coder1-companion', 'checkpoints');
    await fs.mkdir(checkpointsDir, { recursive: true });
    
    const filePath = path.join(checkpointsDir, `${checkpoint.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2));
    
    // Also maintain an index
    const indexPath = path.join(checkpointsDir, 'index.json');
    let index = [];
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexContent);
    } catch (error) {
      // Index doesn't exist yet
    }
    
    index.unshift({
      id: checkpoint.id,
      sessionId: checkpoint.sessionId,
      name: checkpoint.metadata.name,
      description: checkpoint.metadata.description,
      timestamp: checkpoint.timestamp,
      significance: checkpoint.metadata.significance,
      tags: checkpoint.metadata.tags
    });
    
    // Keep only last 100 checkpoints
    if (index.length > 100) {
      index = index.slice(0, 100);
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  // Session Timeline - Enhanced with Claude Analysis
  async handleSessionTimeline(data, context) {
    const { sessionId } = data;
    
    this.logger.info(`📊 Generating intelligent timeline for session: ${sessionId}`);

    try {
      // Get session history from Claude Bridge
      const history = await this.claudeBridge.getSessionHistory(sessionId);
      
      if (!history || history.length === 0) {
        return {
          success: true,
          timeline: [],
          message: 'No session history found'
        };
      }

      // Enhance timeline with Claude analysis
      const timelineAnalysis = await this.claudeBridge.executeCommand({
        command: this.buildTimelineAnalysisPrompt(history),
        sessionId
      });

      const analysis = this.parseTimelineAnalysis(timelineAnalysis.result);
      
      // Build enhanced timeline
      const timeline = history.map((entry, index) => ({
        ...entry,
        index: index + 1,
        category: this.categorizeCommand(entry.command),
        significance: analysis.commandSignificance?.[index] || 'low'
      }));

      return {
        success: true,
        timeline,
        analysis: {
          totalCommands: history.length,
          totalDuration: history.reduce((sum, entry) => sum + (entry.duration || 0), 0),
          categories: analysis.categories,
          keyMilestones: analysis.keyMilestones,
          summary: analysis.summary
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate session timeline:', error);
      throw error;
    }
  }

  buildTimelineAnalysisPrompt(history) {
    const commands = history.map((entry, index) => 
      `${index + 1}. [${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.command} (${entry.duration}ms)`
    ).join('\n');

    return `Analyze this development session timeline and provide insights:

SESSION COMMANDS:
${commands}

Please provide a JSON response with:
{
  "summary": "Brief summary of what was accomplished in this session",
  "categories": {
    "development": 0,
    "debugging": 0,
    "testing": 0,
    "deployment": 0,
    "research": 0
  },
  "keyMilestones": ["milestone 1", "milestone 2"],
  "commandSignificance": ["high", "medium", "low", ...]
}`;
  }

  parseTimelineAnalysis(result) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.fallbackTimelineAnalysis();
    } catch (error) {
      return this.fallbackTimelineAnalysis();
    }
  }

  fallbackTimelineAnalysis() {
    return {
      summary: 'Development session',
      categories: { development: 1 },
      keyMilestones: [],
      commandSignificance: []
    };
  }

  categorizeCommand(command) {
    const cmd = command.toLowerCase();
    
    if (cmd.includes('test') || cmd.includes('jest') || cmd.includes('mocha')) return 'testing';
    if (cmd.includes('debug') || cmd.includes('error') || cmd.includes('fix')) return 'debugging';
    if (cmd.includes('deploy') || cmd.includes('build') || cmd.includes('publish')) return 'deployment';
    if (cmd.includes('research') || cmd.includes('explain') || cmd.includes('help')) return 'research';
    
    return 'development';
  }

  // Additional handlers (placeholder implementations)
  async handleCheckpointList(data, context) {
    // Implementation for listing checkpoints
    return { success: true, checkpoints: [] };
  }

  async handleCheckpointRestore(data, context) {
    // Implementation for restoring checkpoints
    return { success: true, message: 'Checkpoint restored' };
  }

  async handleSessionSummary(data, context) {
    // Implementation for session summary (will be enhanced in Phase 3)
    return { success: true, summary: 'Session summary' };
  }

  async handleSessionExport(data, context) {
    // Implementation for session export
    return { success: true, exportPath: '/tmp/session-export.json' };
  }

  async handleFileSync(data, context) {
    // Delegate to FileSync service
    return await this.fileSync.syncFiles(context.projectPath, data.files);
  }

  async handleFileWatch(data, context) {
    // Implementation for file watching
    return { success: true, watching: true };
  }

  async handleCustomCommand(data, context) {
    // Implementation for custom .claude/commands
    return { success: true, result: 'Custom command executed' };
  }

  async handleListCustomCommands(data, context) {
    // Implementation for listing custom commands
    return { success: true, commands: [] };
  }

  async handleCreateCustomCommand(data, context) {
    // Implementation for creating custom commands
    return { success: true, message: 'Custom command created' };
  }
}

module.exports = { CommandRouter };