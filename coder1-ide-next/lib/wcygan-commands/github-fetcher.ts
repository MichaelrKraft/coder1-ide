/**
 * GitHub API integration for fetching wcygan's command library
 * Fetches, parses, and caches the 88 structured Claude commands
 */

import { WcyganCommand, CommandLibrary, GitHubFile, GitHubRepository, CommandCategory } from './types';
import { logger } from '../logger';

export class WcyganCommandFetcher {
  private readonly repository: GitHubRepository = {
    owner: 'wcygan',
    repo: 'dotfiles',
    branch: 'd8ab6b9f5a7a81007b7f5fa3025d4f83ce12cc02',
    path: 'claude/commands'
  };

  private readonly cacheKey = 'wcygan-commands-library';
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private cachedLibrary: CommandLibrary | null = null;

  /**
   * Get the complete command library (cached or fresh)
   */
  async getCommandLibrary(forceRefresh = false): Promise<CommandLibrary> {
    try {
      // Return cached library if available and not forcing refresh
      if (!forceRefresh && this.cachedLibrary) {
        return this.cachedLibrary;
      }

      // Try to load from localStorage cache first
      const cached = this.loadFromCache();
      if (!forceRefresh && cached && !this.isCacheExpired(cached)) {
        this.cachedLibrary = cached;
        return cached;
      }

      logger.debug('[WcyganFetcher] Fetching fresh command library from GitHub...');

      // Fetch fresh data from GitHub
      const commands = await this.fetchCommandsFromGitHub();
      const library = this.buildCommandLibrary(commands);

      // Cache the results
      this.saveToCache(library);
      this.cachedLibrary = library;

      logger.debug(`[WcyganFetcher] Successfully loaded ${commands.length} commands`);
      return library;

    } catch (error) {
      logger.error('[WcyganFetcher] Failed to fetch command library:', error);
      
      // Try to return cached version as fallback
      const cached = this.loadFromCache();
      if (cached) {
        logger.warn('[WcyganFetcher] Using cached version as fallback');
        return cached;
      }

      // Return minimal fallback library
      return this.createFallbackLibrary();
    }
  }

  /**
   * Fetch command files from GitHub API
   */
  private async fetchCommandsFromGitHub(): Promise<WcyganCommand[]> {
    const baseUrl = `https://api.github.com/repos/${this.repository.owner}/${this.repository.repo}/contents/${this.repository.path}`;
    const url = `${baseUrl}?ref=${this.repository.branch}`;

    // Get directory listing
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Coder1-IDE-wcygan-integration'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const files: GitHubFile[] = await response.json();
    const mdFiles = files.filter(file => file.name.endsWith('.md'));

    logger.debug(`[WcyganFetcher] Found ${mdFiles.length} command files`);

    // Fetch and parse each command file
    const commands: WcyganCommand[] = [];
    
    for (const file of mdFiles) {
      try {
        const command = await this.fetchAndParseCommand(file);
        if (command) {
          commands.push(command);
        }
      } catch (error) {
        logger.warn(`[WcyganFetcher] Failed to parse ${file.name}:`, error);
      }
    }

    return commands;
  }

  /**
   * Fetch and parse a single command file
   */
  private async fetchAndParseCommand(file: GitHubFile): Promise<WcyganCommand | null> {
    const response = await fetch(file.download_url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${file.name}: ${response.status}`);
    }

    const content = await response.text();
    return this.parseCommandFile(file.name, content);
  }

  /**
   * Parse markdown command file into structured command
   */
  private parseCommandFile(fileName: string, content: string): WcyganCommand | null {
    try {
      const commandName = fileName.replace('.md', '');
      const slashCommand = `/${commandName}`;

      // Extract basic info from content
      const description = this.extractDescription(content);
      const category = this.inferCategory(commandName, content);
      const parameters = this.extractParameters(content);
      const complexity = this.inferComplexity(content);
      const tags = this.extractTags(commandName, content);
      
      return {
        id: commandName,
        name: commandName,
        slashCommand,
        category,
        description,
        template: content,
        parameters,
        usage: this.generateUsageExample(slashCommand, parameters),
        tags,
        complexity,
        estimatedTime: this.estimateTime(complexity)
      };
    } catch (error) {
      logger.error(`[WcyganFetcher] Error parsing ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Extract description from command content
   */
  private extractDescription(content: string): string {
    // Look for common patterns in wcygan's commands
    const lines = content.split('\n').slice(0, 10); // Check first 10 lines
    
    // Pattern 1: "Help [action] [target]: $ARGUMENTS"
    const helpPattern = lines.find(line => line.startsWith('Help '));
    if (helpPattern) {
      return helpPattern.replace('$ARGUMENTS', '').replace('Help ', '').trim();
    }

    // Pattern 2: "Provide [description]"
    const providePattern = lines.find(line => line.startsWith('Provide '));
    if (providePattern) {
      return providePattern.replace('$ARGUMENTS', '').replace('Provide ', '').trim();
    }

    // Pattern 3: First meaningful line
    const meaningfulLine = lines.find(line => 
      line.length > 10 && 
      !line.startsWith('#') && 
      !line.startsWith('---') &&
      line.trim().length > 0
    );

    return meaningfulLine?.trim() || 'Structured AI command workflow';
  }

  /**
   * Infer category from command name and content
   */
  private inferCategory(commandName: string, content: string): CommandCategory {
    const name = commandName.toLowerCase();
    const text = content.toLowerCase();

    // Direct matches
    if (name.includes('debug') || name.includes('fix') || name.includes('error')) return 'debugging';
    if (name.includes('explain') || name.includes('doc')) return 'documentation';
    if (name.includes('plan') || name.includes('design') || name.includes('architect')) return 'planning';
    if (name.includes('review') || name.includes('audit') || name.includes('quality')) return 'quality';
    if (name.includes('refactor') || name.includes('improve') || name.includes('optimize')) return 'refactoring';
    if (name.includes('test') || name.includes('spec') || name.includes('validate')) return 'testing';
    if (name.includes('security') || name.includes('secure')) return 'security';
    if (name.includes('deploy') || name.includes('release')) return 'deployment';
    if (name.includes('database') || name.includes('db') || name.includes('sql')) return 'database';
    if (name.includes('frontend') || name.includes('ui') || name.includes('react')) return 'frontend';
    if (name.includes('backend') || name.includes('api') || name.includes('server')) return 'backend';
    if (name.includes('devops') || name.includes('ci') || name.includes('cd')) return 'devops';

    // Content-based inference
    if (text.includes('performance') || text.includes('speed') || text.includes('memory')) return 'optimization';
    if (text.includes('architecture') || text.includes('system design')) return 'architecture';

    return 'general';
  }

  /**
   * Extract parameters from command content
   */
  private extractParameters(content: string): any[] {
    const parameters = [];

    // Look for $ARGUMENTS or similar patterns
    if (content.includes('$ARGUMENTS') || content.includes('$ARGUMENT')) {
      parameters.push({
        name: 'target',
        type: 'string',
        required: false,
        description: 'Target for the command (file, error, concept, etc.)',
        placeholder: 'Enter target...'
      });
    }

    return parameters;
  }

  /**
   * Infer complexity from content length and structure
   */
  private inferComplexity(content: string): 'simple' | 'moderate' | 'complex' {
    const lines = content.split('\n').length;
    const sections = (content.match(/^#+\s/gm) || []).length;
    
    if (lines < 50 && sections <= 3) return 'simple';
    if (lines < 150 && sections <= 6) return 'moderate';
    return 'complex';
  }

  /**
   * Extract tags for search
   */
  private extractTags(commandName: string, content: string): string[] {
    const tags = [commandName];
    const text = content.toLowerCase();

    // Common technology tags
    const techTags = ['javascript', 'typescript', 'react', 'node', 'python', 'java', 'go', 'rust'];
    techTags.forEach(tech => {
      if (text.includes(tech)) tags.push(tech);
    });

    // Action tags
    const actionTags = ['debug', 'test', 'deploy', 'optimize', 'refactor', 'explain', 'review'];
    actionTags.forEach(action => {
      if (text.includes(action) && !tags.includes(action)) tags.push(action);
    });

    return tags;
  }

  /**
   * Generate usage example
   */
  private generateUsageExample(slashCommand: string, parameters: any[]): string {
    if (parameters.length === 0) {
      return slashCommand;
    }
    
    const paramExample = parameters
      .filter(p => p.required)
      .map(p => `<${p.name}>`)
      .join(' ');
      
    return `${slashCommand} ${paramExample}`.trim();
  }

  /**
   * Estimate execution time
   */
  private estimateTime(complexity: string): string {
    switch (complexity) {
      case 'simple': return '2-5 minutes';
      case 'moderate': return '5-15 minutes';
      case 'complex': return '15-30 minutes';
      default: return '5-10 minutes';
    }
  }

  /**
   * Build complete command library
   */
  private buildCommandLibrary(commands: WcyganCommand[]): CommandLibrary {
    const categories = this.buildCategoryInfo(commands);
    
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      commands,
      categories,
      stats: {
        totalCommands: commands.length,
        categoriesCount: categories.length,
        lastFetched: new Date().toISOString(),
        source: 'github'
      }
    };
  }

  /**
   * Build category information
   */
  private buildCategoryInfo(commands: WcyganCommand[]): any[] {
    const categoryMap = new Map();
    
    commands.forEach(cmd => {
      if (!categoryMap.has(cmd.category)) {
        categoryMap.set(cmd.category, {
          id: cmd.category,
          name: this.getCategoryDisplayName(cmd.category),
          description: this.getCategoryDescription(cmd.category),
          icon: this.getCategoryIcon(cmd.category),
          color: this.getCategoryColor(cmd.category),
          commandCount: 0
        });
      }
      categoryMap.get(cmd.category).commandCount++;
    });

    return Array.from(categoryMap.values());
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      debugging: 'Debugging',
      documentation: 'Documentation', 
      planning: 'Planning',
      quality: 'Quality',
      refactoring: 'Refactoring',
      testing: 'Testing',
      optimization: 'Optimization',
      security: 'Security',
      deployment: 'Deployment',
      architecture: 'Architecture',
      database: 'Database',
      frontend: 'Frontend',
      backend: 'Backend',
      devops: 'DevOps',
      general: 'General'
    };
    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Get category description
   */
  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      debugging: 'Systematic debugging and troubleshooting workflows',
      documentation: 'Code explanation and documentation generation',
      planning: 'Project planning and architecture design',
      quality: 'Code review and quality assurance',
      refactoring: 'Code improvement and optimization',
      testing: 'Testing strategies and implementation',
      optimization: 'Performance and efficiency improvements',
      security: 'Security analysis and hardening',
      deployment: 'Deployment and release management',
      architecture: 'System architecture and design patterns',
      database: 'Database design and optimization',
      frontend: 'Frontend development and UI/UX',
      backend: 'Backend development and API design',
      devops: 'DevOps and infrastructure management',
      general: 'General purpose development workflows'
    };
    return descriptions[category] || 'Development workflow commands';
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      debugging: '🐛',
      documentation: '📚',
      planning: '📋',
      quality: '⭐',
      refactoring: '🔧',
      testing: '🧪',
      optimization: '⚡',
      security: '🛡️',
      deployment: '🚀',
      architecture: '🏗️',
      database: '🗄️',
      frontend: '🎨',
      backend: '⚙️',
      devops: '🔄',
      general: '📦'
    };
    return icons[category] || '📄';
  }

  /**
   * Get category color
   */
  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      debugging: '#ff6b6b',
      documentation: '#4ecdc4',
      planning: '#45b7d1',
      quality: '#f9ca24',
      refactoring: '#6c5ce7',
      testing: '#a29bfe',
      optimization: '#fd79a8',
      security: '#e17055',
      deployment: '#00b894',
      architecture: '#fdcb6e',
      database: '#e84393',
      frontend: '#74b9ff',
      backend: '#55a3ff',
      devops: '#00cec9',
      general: '#636e72'
    };
    return colors[category] || '#636e72';
  }

  /**
   * Cache management
   */
  private loadFromCache(): CommandLibrary | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private saveToCache(library: CommandLibrary): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(library));
    } catch (error) {
      logger.warn('[WcyganFetcher] Failed to save to cache:', error);
    }
  }

  private isCacheExpired(library: CommandLibrary): boolean {
    const lastFetched = new Date(library.stats.lastFetched).getTime();
    return Date.now() - lastFetched > this.cacheExpiry;
  }

  /**
   * Create fallback library when GitHub is unavailable
   */
  private createFallbackLibrary(): CommandLibrary {
    const fallbackCommands: WcyganCommand[] = [
      {
        id: 'debug',
        name: 'debug',
        slashCommand: '/debug',
        category: 'debugging',
        description: 'Systematic debugging workflow with root cause analysis',
        template: this.getFallbackTemplate('debug'),
        parameters: [{ name: 'target', type: 'string', required: false, description: 'Error or issue to debug', placeholder: 'error message...' }],
        usage: '/debug <error>',
        tags: ['debug', 'troubleshoot', 'error'],
        complexity: 'moderate',
        estimatedTime: '10-20 minutes'
      },
      {
        id: 'explain',
        name: 'explain',
        slashCommand: '/explain',
        category: 'documentation',
        description: 'Comprehensive technical explanations with examples',
        template: this.getFallbackTemplate('explain'),
        parameters: [{ name: 'target', type: 'string', required: true, description: 'Code or concept to explain', placeholder: 'function or concept...' }],
        usage: '/explain <code>',
        tags: ['explain', 'document', 'understand'],
        complexity: 'simple',
        estimatedTime: '5-10 minutes'
      },
      {
        id: 'refactor',
        name: 'refactor',
        slashCommand: '/refactor',
        category: 'refactoring',
        description: 'Code refactoring with best practices',
        template: this.getFallbackTemplate('refactor'),
        parameters: [{ name: 'target', type: 'string', required: false, description: 'Code to refactor', placeholder: 'file or function...' }],
        usage: '/refactor <code>',
        tags: ['refactor', 'improve', 'optimize'],
        complexity: 'moderate',
        estimatedTime: '15-25 minutes'
      }
    ];

    return {
      version: '1.0.0-fallback',
      lastUpdated: new Date().toISOString(),
      commands: fallbackCommands,
      categories: this.buildCategoryInfo(fallbackCommands),
      stats: {
        totalCommands: fallbackCommands.length,
        categoriesCount: 3,
        lastFetched: new Date().toISOString(),
        source: 'local'
      }
    };
  }

  /**
   * Get fallback templates
   */
  private getFallbackTemplate(commandName: string): string {
    const templates: Record<string, string> = {
      debug: `Help debug issue: $ARGUMENTS

Steps:
1. Understand the problem
2. Analyze the code path  
3. Suggest debugging strategies
4. Identify common pitfalls
5. Create minimal reproduction
6. Propose solutions

Focus on systematic approach to identify root cause.`,
      
      explain: `Provide comprehensive explanation for: $ARGUMENTS

Structure:
1. Overview & Purpose
2. Detailed Breakdown
3. Code Examples
4. Real-World Context
5. Potential Issues
6. Learning Resources

Use clear analogies and progressive complexity.`,
      
      refactor: `Refactor and improve: $ARGUMENTS

Process:
1. Read and understand current code
2. Identify issues and code smells
3. Suggest specific improvements
4. Provide before/after examples
5. Ensure functionality preservation
6. Document changes

Focus on maintainability and best practices.`
    };
    
    return templates[commandName] || `Structured workflow for: $ARGUMENTS`;
  }
}