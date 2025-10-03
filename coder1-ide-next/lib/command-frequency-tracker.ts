/**
 * Command Frequency Tracker
 * Phase II: Auto Slash Command System
 * 
 * Tracks command usage and suggests slash command shortcuts
 * after 3+ repeated uses of similar patterns
 */

import { logger } from '@/lib/logger';

export interface SlashCommandSuggestion {
  command: string;
  frequency: number;
  examples: string[];
  suggestedAlias: string;
  timestamp: Date;
}

export interface StoredSlashCommand {
  alias: string;
  expansion: string;
  usageCount: number;
  createdAt: Date;
  lastUsed: Date;
}

class CommandFrequencyTracker {
  private commandCounts: Map<string, number> = new Map();
  private commandExamples: Map<string, string[]> = new Map();
  private promptedCommands: Set<string> = new Set();
  private slashCommands: Map<string, StoredSlashCommand> = new Map();
  
  private readonly SUGGESTION_THRESHOLD = 3;
  private readonly LOCAL_STORAGE_KEY = 'coder1-slash-commands';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Track a command execution
   */
  track(command: string): SlashCommandSuggestion | null {
    if (!command || command.length < 10) {
      return null; // Ignore very short commands
    }

    const normalized = this.normalizeCommand(command);
    
    // Check if this is already a slash command
    if (command.startsWith('/')) {
      const alias = command.split(' ')[0];
      this.updateSlashCommandUsage(alias);
      return null;
    }

    // Track frequency
    const count = (this.commandCounts.get(normalized) || 0) + 1;
    this.commandCounts.set(normalized, count);

    // Track examples
    const examples = this.commandExamples.get(normalized) || [];
    if (!examples.includes(command)) {
      examples.push(command);
      this.commandExamples.set(normalized, examples);
    }

    // Check if we should suggest a slash command
    if (count >= this.SUGGESTION_THRESHOLD && !this.promptedCommands.has(normalized)) {
      logger.info(`🎯 Command frequency threshold reached: ${normalized} (${count} uses)`);
      this.promptedCommands.add(normalized);
      
      return {
        command: normalized,
        frequency: count,
        examples: examples.slice(0, 3), // Show up to 3 examples
        suggestedAlias: this.generateAlias(normalized),
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Normalize command for comparison
   */
  private normalizeCommand(command: string): string {
    // Remove "claude," prefix if present
    let normalized = command.trim().toLowerCase();
    if (normalized.startsWith('claude,') || normalized.startsWith('claude ')) {
      normalized = normalized.replace(/^claude[,\s]+/, '');
    }

    // Extract key action words
    const actionWords = normalized
      .split(/\s+/)
      .filter(word => word.length > 3) // Remove short words
      .slice(0, 4) // Take first 4 significant words
      .join(' ');

    return actionWords;
  }

  /**
   * Generate a suggested slash command alias
   */
  private generateAlias(normalized: string): string {
    // Extract key words and create alias
    const words = normalized.split(/\s+/).filter(w => w.length > 3);
    
    if (words.length === 1) {
      return `/${words[0]}`;
    }

    // Create alias from first letters or key words
    if (words.length <= 3) {
      return `/${words.join('-')}`;
    }

    // For longer commands, use abbreviation
    const abbrev = words.map(w => w[0]).join('');
    return `/${abbrev}`;
  }

  /**
   * Create a new slash command
   */
  createSlashCommand(alias: string, expansion: string): boolean {
    try {
      // Validate alias format
      if (!alias.startsWith('/')) {
        alias = `/${alias}`;
      }

      if (this.slashCommands.has(alias)) {
        logger.warn(`⚠️ Slash command already exists: ${alias}`);
        return false;
      }

      const command: StoredSlashCommand = {
        alias,
        expansion,
        usageCount: 0,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      this.slashCommands.set(alias, command);
      this.saveToStorage();

      logger.info(`✅ Slash command created: ${alias} → ${expansion}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to create slash command:', error);
      return false;
    }
  }

  /**
   * Expand a slash command
   */
  expandSlashCommand(alias: string): string | null {
    const command = this.slashCommands.get(alias);
    
    if (!command) {
      return null;
    }

    // Update usage stats
    command.usageCount++;
    command.lastUsed = new Date();
    this.saveToStorage();

    logger.debug(`📝 Slash command expanded: ${alias} → ${command.expansion}`);
    return command.expansion;
  }

  /**
   * Update slash command usage stats
   */
  private updateSlashCommandUsage(alias: string): void {
    const command = this.slashCommands.get(alias);
    if (command) {
      command.usageCount++;
      command.lastUsed = new Date();
      this.saveToStorage();
    }
  }

  /**
   * Get all slash commands
   */
  getAllSlashCommands(): StoredSlashCommand[] {
    return Array.from(this.slashCommands.values()).sort((a, b) => 
      b.usageCount - a.usageCount
    );
  }

  /**
   * Delete a slash command
   */
  deleteSlashCommand(alias: string): boolean {
    const deleted = this.slashCommands.delete(alias);
    if (deleted) {
      this.saveToStorage();
      logger.info(`🗑️ Slash command deleted: ${alias}`);
    }
    return deleted;
  }

  /**
   * Get command frequency stats
   */
  getStats(): {
    totalCommands: number;
    uniquePatterns: number;
    slashCommands: number;
    topPatterns: Array<{ pattern: string; count: number }>;
  } {
    const topPatterns = Array.from(this.commandCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCommands: Array.from(this.commandCounts.values()).reduce((sum, count) => sum + count, 0),
      uniquePatterns: this.commandCounts.size,
      slashCommands: this.slashCommands.size,
      topPatterns
    };
  }

  /**
   * Load slash commands from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, skip localStorage
    }

    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.slashCommands = new Map(
          data.map((cmd: any) => [
            cmd.alias,
            {
              ...cmd,
              createdAt: new Date(cmd.createdAt),
              lastUsed: new Date(cmd.lastUsed)
            }
          ])
        );
        logger.debug(`📥 Loaded ${this.slashCommands.size} slash commands from storage`);
      }
    } catch (error) {
      logger.error('❌ Failed to load slash commands from storage:', error);
    }
  }

  /**
   * Save slash commands to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, skip localStorage
    }

    try {
      const data = Array.from(this.slashCommands.values());
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
      logger.debug(`💾 Saved ${data.length} slash commands to storage`);
    } catch (error) {
      logger.error('❌ Failed to save slash commands to storage:', error);
    }
  }

  /**
   * Clear all tracking data (for testing/reset)
   */
  clearAll(): void {
    this.commandCounts.clear();
    this.commandExamples.clear();
    this.promptedCommands.clear();
    this.slashCommands.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    }

    logger.info('🧹 All command tracking data cleared');
  }
}

// Export singleton instance
export const commandFrequencyTracker = new CommandFrequencyTracker();
export default commandFrequencyTracker;
