const fs = require('fs').promises;
const path = require('path');

class CustomCommandsService {
  constructor(options) {
    this.logger = options.logger;
    this.claudeBridge = options.claudeBridge;
    
    // Command cache
    this.commandCache = new Map();
    this.projectCommands = new Map();
  }

  async initProject(projectPath) {
    this.logger.info(`🎯 Initializing custom commands for: ${projectPath}`);

    try {
      const claudeDir = path.join(projectPath, '.claude');
      const commandsDir = path.join(claudeDir, 'commands');
      
      // Ensure .claude/commands directory exists
      await fs.mkdir(commandsDir, { recursive: true });
      
      // Load existing custom commands
      const commands = await this.loadProjectCommands(commandsDir);
      this.projectCommands.set(projectPath, commands);
      
      // Create default commands if none exist
      if (commands.size === 0) {
        await this.createDefaultCommands(commandsDir);
        const newCommands = await this.loadProjectCommands(commandsDir);
        this.projectCommands.set(projectPath, newCommands);
      }
      
      this.logger.success(`✅ Custom commands initialized: ${commands.size} commands available`);
      
      return {
        success: true,
        commandsPath: commandsDir,
        commandCount: commands.size,
        commands: Array.from(commands.keys())
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to initialize custom commands for ${projectPath}:`, error);
      throw error;
    }
  }

  async loadProjectCommands(commandsDir) {
    const commands = new Map();
    
    try {
      const files = await fs.readdir(commandsDir);
      const commandFiles = files.filter(file => file.endsWith('.md'));
      
      for (const file of commandFiles) {
        const commandName = path.basename(file, '.md');
        const commandPath = path.join(commandsDir, file);
        
        try {
          const content = await fs.readFile(commandPath, 'utf8');
          const command = this.parseCommandFile(commandName, content);
          commands.set(commandName, command);
        } catch (error) {
          this.logger.warn(`Failed to load command file ${file}:`, error);
        }
      }
      
    } catch (error) {
      // Commands directory doesn't exist or is empty
      this.logger.debug(`No custom commands found in ${commandsDir}`);
    }
    
    return commands;
  }

  parseCommandFile(name, content) {
    const lines = content.split('\n');
    let description = '';
    let prompt = '';
    let metadata = {};
    
    let inMetadata = false;
    let inPrompt = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Parse metadata (YAML front matter)
      if (line === '---') {
        if (!inMetadata && i === 0) {
          inMetadata = true;
          continue;
        } else if (inMetadata) {
          inMetadata = false;
          continue;
        }
      }
      
      if (inMetadata) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
        continue;
      }
      
      // First non-metadata line is description
      if (!description && line && !line.startsWith('#')) {
        description = line;
        continue;
      }
      
      // Everything else is the prompt
      if (line || inPrompt) {
        inPrompt = true;
        prompt += line + '\n';
      }
    }
    
    return {
      name,
      description: metadata.description || description || `Custom command: ${name}`,
      prompt: prompt.trim(),
      metadata: {
        ...metadata,
        category: metadata.category || 'custom',
        tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [],
        args: metadata.args ? metadata.args.split(',').map(a => a.trim()) : []
      }
    };
  }

  async createDefaultCommands(commandsDir) {
    const defaultCommands = [
      {
        name: 'build',
        description: 'Build the project with error handling',
        content: `---
description: Build the project and handle any errors that occur
category: development
tags: build, compile, development
args: target
---

Build this project. If there are any errors:
1. Analyze the error messages
2. Suggest fixes
3. If possible, implement the fixes automatically

Build target: $ARGUMENTS

Please provide clear explanations of any issues found and how they were resolved.`
      },
      {
        name: 'test',
        description: 'Run tests with intelligent analysis',
        content: `---
description: Run project tests and analyze results
category: testing
tags: test, quality, validation
args: pattern
---

Run the test suite for this project. Test pattern: $ARGUMENTS

After running tests:
1. Summarize test results
2. Analyze any failing tests
3. Suggest fixes for failures
4. Identify areas that need more test coverage

Focus on actionable insights to improve code quality.`
      },
      {
        name: 'deploy',
        description: 'Deploy project with pre-flight checks',
        content: `---
description: Deploy the project after running safety checks
category: deployment
tags: deploy, production, release
args: environment
---

Deploy this project to: $ARGUMENTS

Before deployment:
1. Run pre-flight safety checks
2. Verify build is successful
3. Check for any security vulnerabilities
4. Validate environment configuration

Provide step-by-step deployment progress and any issues encountered.`
      },
      {
        name: 'refactor',
        description: 'Intelligent code refactoring',
        content: `---
description: Analyze and refactor code for better quality
category: quality
tags: refactor, cleanup, optimization
args: scope
---

Analyze and refactor the code in: $ARGUMENTS

Focus on:
1. Code readability and maintainability
2. Performance optimizations
3. Removing code duplication
4. Following best practices
5. Improving error handling

Explain each refactoring change and why it improves the code.`
      },
      {
        name: 'debug',
        description: 'Intelligent debugging assistant',
        content: `---
description: Help debug issues in the codebase
category: debugging
tags: debug, troubleshoot, fix
args: issue
---

Help me debug this issue: $ARGUMENTS

Debugging approach:
1. Analyze the problem description
2. Examine relevant code files
3. Look for common patterns that cause this type of issue
4. Suggest debugging steps
5. If possible, identify the root cause and propose fixes

Be systematic and explain your reasoning at each step.`
      },
      {
        name: 'explain',
        description: 'Explain code functionality',
        content: `---
description: Provide detailed explanation of code functionality
category: documentation
tags: explain, documentation, learning
args: code_path
---

Explain how this code works: $ARGUMENTS

Provide:
1. High-level overview of functionality
2. Step-by-step breakdown of key components
3. Explanation of any complex algorithms or patterns
4. Dependencies and interactions with other parts
5. Potential areas for improvement

Make it educational and easy to understand for someone new to the codebase.`
      }
    ];

    for (const cmd of defaultCommands) {
      const filePath = path.join(commandsDir, `${cmd.name}.md`);
      await fs.writeFile(filePath, cmd.content);
    }
    
    this.logger.info(`📝 Created ${defaultCommands.length} default custom commands`);
  }

  async executeCustomCommand(projectPath, commandName, args = []) {
    this.logger.info(`🎯 Executing custom command: ${commandName} with args: ${args.join(', ')}`);

    try {
      const commands = this.projectCommands.get(projectPath);
      if (!commands || !commands.has(commandName)) {
        throw new Error(`Custom command not found: ${commandName}`);
      }

      const command = commands.get(commandName);
      
      // Replace $ARGUMENTS placeholder with actual arguments
      let prompt = command.prompt;
      const argumentsString = args.join(' ') || 'default';
      prompt = prompt.replace(/\$ARGUMENTS/g, argumentsString);
      
      // Execute via Claude Code
      const result = await this.claudeBridge.executeCommand({
        command: prompt,
        workDir: projectPath,
        sessionId: `custom_${commandName}_${Date.now()}`
      });

      this.logger.success(`✅ Custom command completed: ${commandName}`);
      
      return {
        success: true,
        command: commandName,
        args: args,
        result: result.result,
        duration: result.duration,
        metadata: command.metadata
      };
      
    } catch (error) {
      this.logger.error(`❌ Custom command failed: ${commandName}`, error);
      throw error;
    }
  }

  async listCustomCommands(projectPath) {
    const commands = this.projectCommands.get(projectPath);
    if (!commands) {
      return [];
    }

    return Array.from(commands.entries()).map(([name, cmd]) => ({
      name,
      description: cmd.description,
      category: cmd.metadata.category,
      tags: cmd.metadata.tags,
      args: cmd.metadata.args
    }));
  }

  async createCustomCommand(projectPath, name, description, prompt, metadata = {}) {
    this.logger.info(`📝 Creating custom command: ${name}`);

    try {
      const commandsDir = path.join(projectPath, '.claude', 'commands');
      await fs.mkdir(commandsDir, { recursive: true });
      
      const content = this.generateCommandFile(name, description, prompt, metadata);
      const filePath = path.join(commandsDir, `${name}.md`);
      
      await fs.writeFile(filePath, content);
      
      // Update cache
      const commands = this.projectCommands.get(projectPath) || new Map();
      const command = this.parseCommandFile(name, content);
      commands.set(name, command);
      this.projectCommands.set(projectPath, commands);
      
      this.logger.success(`✅ Custom command created: ${name}`);
      
      return {
        success: true,
        command: name,
        filePath,
        metadata: command.metadata
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to create custom command ${name}:`, error);
      throw error;
    }
  }

  generateCommandFile(name, description, prompt, metadata = {}) {
    const frontMatter = {
      description,
      category: metadata.category || 'custom',
      tags: Array.isArray(metadata.tags) ? metadata.tags.join(', ') : (metadata.tags || ''),
      args: Array.isArray(metadata.args) ? metadata.args.join(', ') : (metadata.args || '')
    };
    
    let content = '---\n';
    for (const [key, value] of Object.entries(frontMatter)) {
      if (value) {
        content += `${key}: ${value}\n`;
      }
    }
    content += '---\n\n';
    content += prompt;
    
    return content;
  }

  async deleteCustomCommand(projectPath, commandName) {
    this.logger.info(`🗑️  Deleting custom command: ${commandName}`);

    try {
      const commandsDir = path.join(projectPath, '.claude', 'commands');
      const filePath = path.join(commandsDir, `${commandName}.md`);
      
      await fs.unlink(filePath);
      
      // Update cache
      const commands = this.projectCommands.get(projectPath);
      if (commands) {
        commands.delete(commandName);
      }
      
      this.logger.success(`✅ Custom command deleted: ${commandName}`);
      
      return { success: true, command: commandName };
      
    } catch (error) {
      this.logger.error(`❌ Failed to delete custom command ${commandName}:`, error);
      throw error;
    }
  }

  async syncWithDiscoverPanel(projectPath, panelCommands) {
    this.logger.info(`🔄 Syncing Discover Panel commands with .claude/commands`);

    try {
      const commandsDir = path.join(projectPath, '.claude', 'commands');
      await fs.mkdir(commandsDir, { recursive: true });
      
      let syncedCount = 0;
      
      for (const panelCmd of panelCommands) {
        // Check if command already exists
        const commands = this.projectCommands.get(projectPath) || new Map();
        
        if (!commands.has(panelCmd.name)) {
          await this.createCustomCommand(
            projectPath, 
            panelCmd.name, 
            panelCmd.description, 
            panelCmd.action,
            { category: 'discover-panel', tags: ['ui', 'panel'] }
          );
          syncedCount++;
        }
      }
      
      this.logger.success(`✅ Synced ${syncedCount} commands from Discover Panel`);
      
      return {
        success: true,
        syncedCount,
        totalCommands: this.projectCommands.get(projectPath)?.size || 0
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to sync with Discover Panel:', error);
      throw error;
    }
  }

  async exportCommands(projectPath, format = 'json') {
    const commands = this.projectCommands.get(projectPath);
    if (!commands) {
      return null;
    }

    const exportData = Array.from(commands.entries()).map(([name, cmd]) => ({
      name,
      description: cmd.description,
      prompt: cmd.prompt,
      metadata: cmd.metadata
    }));

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      
      case 'markdown':
        let md = '# Custom Commands\n\n';
        for (const cmd of exportData) {
          md += `## ${cmd.name}\n\n`;
          md += `**Description**: ${cmd.description}\n\n`;
          md += `**Category**: ${cmd.metadata.category}\n\n`;
          if (cmd.metadata.tags.length > 0) {
            md += `**Tags**: ${cmd.metadata.tags.join(', ')}\n\n`;
          }
          md += '**Prompt**:\n```\n' + cmd.prompt + '\n```\n\n';
        }
        return md;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  getProjectCommands(projectPath) {
    return this.projectCommands.get(projectPath) || new Map();
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up Custom Commands Service...');
    
    this.commandCache.clear();
    this.projectCommands.clear();
    
    this.logger.info('✅ Custom Commands Service cleanup complete');
  }
}

module.exports = { CustomCommandsService };