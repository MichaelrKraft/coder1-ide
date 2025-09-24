/**
 * Claude Session Bridge Service
 * Integrates bridged files with Claude CLI sessions
 * Enables seamless file handoff from drag-and-drop to Claude CLI
 */

import { claudeFileBridge, BridgedFile } from './claude-file-bridge';

export interface SessionBridgeOptions {
  autoInject?: boolean; // Automatically inject file paths into terminal
  generateSummary?: boolean; // Generate file summaries for context
  preferredFormat?: 'paths' | 'command' | 'both'; // How to present files
}

export interface BridgeResult {
  success: boolean;
  message: string;
  claudeCommand?: string;
  filePaths?: string[];
  summary?: string;
  injectionText?: string;
  error?: string;
}

class ClaudeSessionBridge {
  /**
   * Bridge files and prepare them for Claude CLI session
   */
  async bridgeToSession(
    files: { file: File; content?: string; metadata?: any }[],
    options: SessionBridgeOptions = {}
  ): Promise<BridgeResult> {
    try {
      const {
        autoInject = true,
        generateSummary = true,
        preferredFormat = 'both'
      } = options;

      // Bridge all files to filesystem
      const bridgedFiles = await claudeFileBridge.bridgeFiles(files);
      
      if (bridgedFiles.length === 0) {
        return {
          success: false,
          message: 'No files could be bridged',
          error: 'All files failed to bridge'
        };
      }

      const fileIds = bridgedFiles.map(f => f.id);
      const filePaths = bridgedFiles.map(f => f.tempPath);

      // Generate Claude command
      const claudeCommand = claudeFileBridge.generateClaudeCommand(
        fileIds,
        `Please analyze these ${bridgedFiles.length} file(s)`
      );

      // Generate summary if requested
      let summary = '';
      if (generateSummary) {
        summary = this.generateBridgeSummary(bridgedFiles);
      }

      // Generate injection text based on preferred format
      let injectionText = '';
      if (autoInject) {
        injectionText = this.generateInjectionText(bridgedFiles, preferredFormat);
      }

      return {
        success: true,
        message: `Successfully bridged ${bridgedFiles.length} file(s) for Claude CLI`,
        claudeCommand,
        filePaths,
        summary,
        injectionText
      };

    } catch (error: any) {
      console.error('Session bridge error:', error);
      return {
        success: false,
        message: 'Failed to bridge files to Claude session',
        error: error.message
      };
    }
  }

  /**
   * Generate text to inject into terminal for Claude CLI access
   */
  private generateInjectionText(
    files: BridgedFile[],
    format: 'paths' | 'command' | 'both'
  ): string {
    const fileIds = files.map(f => f.id);
    
    if (format === 'paths') {
      // Just inject file paths
      return files.map(f => `"${f.tempPath}"`).join(' ');
    }
    
    if (format === 'command') {
      // Full Claude command
      return claudeFileBridge.generateClaudeCommand(fileIds);
    }
    
    if (format === 'both') {
      // Both summary and command
      const summary = claudeFileBridge.generateFilesSummary(fileIds);
      const command = claudeFileBridge.generateClaudeCommand(fileIds);
      
      return `${summary}\n\n💡 Ready for Claude CLI:\n${command}`;
    }

    return '';
  }

  /**
   * Generate a comprehensive summary of bridged files
   */
  private generateBridgeSummary(files: BridgedFile[]): string {
    if (files.length === 0) return '';

    let summary = `🌉 File Bridge Summary\n`;
    summary += `Files: ${files.length}\n`;
    
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    summary += `Total Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB\n\n`;

    // Group by type
    const typeGroups: { [key: string]: BridgedFile[] } = {};
    files.forEach(file => {
      const category = this.categorizeFile(file);
      if (!typeGroups[category]) {
        typeGroups[category] = [];
      }
      typeGroups[category].push(file);
    });

    Object.entries(typeGroups).forEach(([category, categoryFiles]) => {
      summary += `${category} (${categoryFiles.length}):\n`;
      categoryFiles.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        summary += `  • ${file.originalName} (${sizeKB}KB)\n`;
        if (file.content && file.content.length > 0) {
          const wordCount = file.content.split(/\s+/).length;
          summary += `    Text content: ${wordCount} words\n`;
        }
      });
      summary += '\n';
    });

    return summary;
  }

  /**
   * Categorize file for summary display
   */
  private categorizeFile(file: BridgedFile): string {
    if (file.type.startsWith('image/')) return '🖼️  Images';
    if (file.type === 'application/pdf') return '📄 PDFs';
    if (file.type.includes('javascript') || file.type.includes('typescript')) return '📜 Code Files';
    if (file.type.includes('json')) return '📋 Data Files';
    if (file.type.includes('text')) return '📝 Text Files';
    return '📄 Documents';
  }

  /**
   * Get terminal-ready file information for display
   */
  getTerminalFileDisplay(fileIds: string[]): string {
    const files = fileIds
      .map(id => claudeFileBridge.getBridgedFile(id))
      .filter(file => file);

    if (files.length === 0) {
      return '⚠️  No bridged files available';
    }

    let display = `\n📎 ${files.length} file(s) available for Claude CLI:\n\n`;
    
    files.forEach((file, index) => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const icon = this.getFileIcon(file.type);
      
      display += `${index + 1}. ${icon} ${file.originalName} (${sizeKB}KB)\n`;
      display += `   Path: ${file.tempPath}\n`;
      
      if (file.content && file.content.length > 0) {
        const preview = file.content.substring(0, 100);
        display += `   Preview: ${preview}${file.content.length > 100 ? '...' : ''}\n`;
      }
      
      display += '\n';
    });

    const claudeCommand = claudeFileBridge.generateClaudeCommand(fileIds);
    display += `💡 To analyze all files with Claude:\n${claudeCommand}\n`;

    return display;
  }

  /**
   * Helper: Get appropriate icon for file type
   */
  private getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('javascript')) return '⚡';
    if (mimeType.includes('typescript')) return '🔷';
    if (mimeType.includes('json')) return '📋';
    if (mimeType.includes('html')) return '🌐';
    if (mimeType.includes('css')) return '🎨';
    if (mimeType.includes('python')) return '🐍';
    return '📄';
  }

  /**
   * Create a ready-to-run Claude command with context
   */
  createClaudeCommandWithContext(
    fileIds: string[],
    userPrompt?: string,
    includeFileContents: boolean = false
  ): string {
    const files = fileIds
      .map(id => claudeFileBridge.getBridgedFile(id))
      .filter(file => file);

    if (files.length === 0) return '';

    const filePaths = files.map(f => `"${f.tempPath}"`).join(' ');
    
    let prompt = userPrompt || 'Please analyze these files';
    
    if (includeFileContents) {
      // Add file context to prompt
      const fileContext = files.map(file => {
        let context = `File: ${file.originalName} (${file.type})`;
        if (file.content && file.content.length > 0) {
          const preview = file.content.substring(0, 200);
          context += `\nContent preview: ${preview}${file.content.length > 200 ? '...' : ''}`;
        }
        return context;
      }).join('\n\n');
      
      prompt += `\n\nFile context:\n${fileContext}`;
    }
    
    return `claude ${filePaths} "${prompt}"`;
  }

  /**
   * Get stats about the current session bridge
   */
  getSessionStats() {
    const bridgeStats = claudeFileBridge.getStats();
    
    return {
      ...bridgeStats,
      sessionActive: bridgeStats.totalFiles > 0,
      canInjectToTerminal: true,
      bridgeReady: true
    };
  }

  /**
   * Clean up expired files and optimize bridge
   */
  async optimizeBridge(): Promise<void> {
    // Let the file bridge handle its own cleanup
    // This is a placeholder for additional session-specific optimizations
    console.log('🔧 Optimizing Claude session bridge...');
  }
}

// Export singleton instance
export const claudeSessionBridge = new ClaudeSessionBridge();
export default claudeSessionBridge;