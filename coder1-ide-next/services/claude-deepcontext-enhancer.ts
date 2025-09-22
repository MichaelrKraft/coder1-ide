/**
 * Claude DeepContext Enhancer
 * Silently enhances Claude commands with semantic context when DeepContext is available
 */

import deepContextService from './deepcontext-service';

export class ClaudeDeepContextEnhancer {
  /**
   * Enhance a Claude command with DeepContext if available
   */
  async enhanceCommand(command: string, currentFile?: string | null): Promise<string> {
    const status = deepContextService.getStatus();
    
    // If DeepContext is not available, return original command
    if (!status.installed || !status.indexed) {
      // Check if this command would benefit from DeepContext
      if (deepContextService.wouldBeHelpful(command)) {
        // Track that we could have helped
        this.trackMissedOpportunity(command);
      }
      return command;
    }
    
    // Extract the actual query from the claude command
    const query = this.extractQuery(command);
    if (!query) return command;
    
    try {
      // Get semantic context
      const context = await this.getSemanticContext(query, currentFile);
      
      if (context) {
        // Inject context into the command
        return this.injectContext(command, context);
      }
    } catch (error) {
      console.error('Failed to enhance with DeepContext:', error);
    }
    
    return command;
  }
  
  /**
   * Extract the query from a claude command
   */
  private extractQuery(command: string): string | null {
    // Remove 'claude' prefix and clean up
    const query = command.replace(/^claude\s+/i, '').trim();
    return query || null;
  }
  
  /**
   * Get semantic context for a query
   */
  private async getSemanticContext(query: string, currentFile?: string | null): Promise<string | null> {
    try {
      // Search for relevant code
      const results = await deepContextService.search(query);
      
      // Get relationships if we have a current file
      let relationships = [];
      if (currentFile) {
        relationships = await deepContextService.getRelationships(currentFile);
      }
      
      // Build context string
      let context = '';
      
      if (results.length > 0) {
        context += '\n[DeepContext: Found relevant code]\n';
        results.slice(0, 3).forEach(result => {
          context += `- ${result.file}:${result.line} - ${result.context || result.content.slice(0, 50)}...\n`;
        });
      }
      
      if (relationships.length > 0) {
        context += '\n[DeepContext: Related files]\n';
        relationships.slice(0, 3).forEach(rel => {
          context += `- ${rel.type}: ${rel.file}\n`;
        });
      }
      
      return context || null;
    } catch (error) {
      console.error('Failed to get semantic context:', error);
      return null;
    }
  }
  
  /**
   * Inject context into the command
   */
  private injectContext(command: string, context: string): string {
    // Add context as a hidden comment that Claude will see but user won't notice
    return `${command}\n# ${context}`;
  }
  
  /**
   * Track missed opportunities for analytics
   */
  private trackMissedOpportunity(command: string): void {
    // Track how many times DeepContext could have helped
    const missed = parseInt(localStorage.getItem('deepcontext-missed') || '0');
    localStorage.setItem('deepcontext-missed', String(missed + 1));
    
    // If we've missed 3+ opportunities, we should prompt the user
    if (missed >= 3) {
      this.shouldPromptForInstall = true;
    }
  }
  
  public shouldPromptForInstall = false;
  
  /**
   * Reset the missed opportunity counter
   */
  resetMissedCounter(): void {
    localStorage.removeItem('deepcontext-missed');
    this.shouldPromptForInstall = false;
  }
}

// Export singleton instance
export const claudeEnhancer = new ClaudeDeepContextEnhancer();
export default claudeEnhancer;