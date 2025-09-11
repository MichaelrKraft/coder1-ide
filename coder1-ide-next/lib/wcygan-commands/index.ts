/**
 * Main entry point for wcygan commands integration
 * Provides a unified API for command management and execution
 */

import { WcyganCommandFetcher } from './github-fetcher';
import { WcyganCommandProcessor } from './command-processor';
import { logger } from '../logger';
import type { 
  WcyganCommand, 
  CommandLibrary, 
  CommandExecutionMode, 
  CommandExecutionResult,
  CommandSuggestion,
  CommandCategory 
} from './types';

export class WcyganCommandManager {
  private fetcher: WcyganCommandFetcher;
  private processor: WcyganCommandProcessor;
  private library: CommandLibrary | null = null;

  constructor() {
    this.fetcher = new WcyganCommandFetcher();
    this.processor = new WcyganCommandProcessor();
  }

  /**
   * Initialize the command manager
   */
  async initialize(forceRefresh = false): Promise<void> {
    try {
      logger.debug('[WcyganManager] Initializing command library...');
      this.library = await this.fetcher.getCommandLibrary(forceRefresh);
      logger.debug(`[WcyganManager] Loaded ${this.library.commands.length} commands`);
    } catch (error) {
      logger.error('[WcyganManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get all commands
   */
  getCommands(): WcyganCommand[] {
    return this.library?.commands || [];
  }

  /**
   * Get command by name
   */
  getCommand(name: string): WcyganCommand | undefined {
    return this.library?.commands.find(cmd => 
      cmd.name === name || cmd.slashCommand === name || cmd.slashCommand === `/${name}`
    );
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: CommandCategory): WcyganCommand[] {
    return this.library?.commands.filter(cmd => cmd.category === category) || [];
  }

  /**
   * Search commands
   */
  searchCommands(query: string, category?: CommandCategory): WcyganCommand[] {
    if (!this.library) return [];
    
    const categoryFilter = category ? category : undefined;
    return this.processor.searchCommands(this.library.commands, query, categoryFilter);
  }

  /**
   * Get categories
   */
  getCategories() {
    return this.library?.categories || [];
  }

  /**
   * Get library statistics
   */
  getStats() {
    if (!this.library) return null;
    return this.processor.getCommandStats(this.library.commands);
  }

  /**
   * Get context-aware suggestions
   */
  getSuggestionsForContext(context: {
    currentFile?: string;
    terminalOutput?: string;
    recentCommands?: string[];
    openFiles?: string[];
  }): CommandSuggestion[] {
    if (!this.library) return [];
    return this.processor.getSuggestionsForContext(this.library.commands, context);
  }

  /**
   * Execute command in template mode
   */
  async executeTemplate(
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    const command = this.getCommand(commandName);
    if (!command) {
      return {
        success: false,
        mode: 'template',
        error: `Command '${commandName}' not found`
      };
    }

    return this.processor.executeTemplateMode(command, parameters, context);
  }

  /**
   * Execute command through AI agent
   */
  async executeWithAgent(
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {},
    agentName?: string
  ): Promise<CommandExecutionResult> {
    const command = this.getCommand(commandName);
    if (!command) {
      return {
        success: false,
        mode: 'agent',
        error: `Command '${commandName}' not found`
      };
    }

    return this.processor.executeAgentMode(command, parameters, context, agentName);
  }

  /**
   * Execute command in hybrid mode
   */
  async executeHybrid(
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    const command = this.getCommand(commandName);
    if (!command) {
      return {
        success: false,
        mode: 'hybrid',
        error: `Command '${commandName}' not found`
      };
    }

    return this.processor.executeHybridMode(command, parameters, context);
  }

  /**
   * Process command template without execution
   */
  processTemplate(
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): string | null {
    const command = this.getCommand(commandName);
    if (!command) return null;

    return this.processor.processCommandTemplate(command, parameters, context);
  }

  /**
   * Get library info
   */
  getLibraryInfo() {
    return this.library ? {
      version: this.library.version,
      lastUpdated: this.library.lastUpdated,
      stats: this.library.stats
    } : null;
  }

  /**
   * Refresh command library
   */
  async refresh(): Promise<void> {
    await this.initialize(true);
  }

  /**
   * Check if manager is ready
   */
  isReady(): boolean {
    return this.library !== null;
  }
}

// Create singleton instance
export const wcyganCommandManager = new WcyganCommandManager();

// Export types
export type {
  WcyganCommand,
  CommandLibrary,
  CommandExecutionMode,
  CommandExecutionResult,
  CommandSuggestion,
  CommandCategory
};

// Export component classes for advanced usage
export { WcyganCommandFetcher, WcyganCommandProcessor };