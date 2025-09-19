/**
 * Session Summary Service
 * 
 * Handles session data collection and Claude Code communication
 * for generating comprehensive session summaries
 */

interface SessionData {
  openFiles: Array<{
    path: string;
    name: string;
    content: string;
    isDirty: boolean;
    language?: string;
    lastModified?: number;
  }>;
  activeFile: string | null;
  terminalHistory: string;
  terminalCommands: string[];
  sessionDuration: number;
  projectStructure: string[];
  checkpoints: any[];
  gitStatus?: {
    branch: string;
    modifiedFiles: string[];
    stagedFiles: string[];
    untrackedFiles: string[];
    recentCommits: string[];
  };
  errors: Array<{
    timestamp: number;
    message: string;
    source: string;
  }>;
  testResults?: {
    passed: number;
    failed: number;
    lastRun: number;
    failures: string[];
  };
  mcpToolUsage: Array<{
    tool: string;
    timestamp: number;
    result: string;
  }>;
  sessionType?: 'bug-fix' | 'feature-dev' | 'refactoring' | 'exploration' | 'general';
  keyDecisions: string[];
  blockers: string[];
  breakthroughs: string[];
}

interface SessionSummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
  metadata?: {
    timestamp: number;
    sessionId: string;
    format: 'markdown' | 'json' | 'html';
  };
}

interface ExportOptions {
  format: 'markdown' | 'json' | 'html' | 'all';
  saveToFile?: boolean;
  filename?: string;
  includeMetadata?: boolean;
}

export class SessionSummaryService {
  private static instance: SessionSummaryService;
  private baseURL: string;

  constructor() {
    // Use the main server API endpoint
    this.baseURL = window.location.origin;
  }

  public static getInstance(): SessionSummaryService {
    if (!SessionSummaryService.instance) {
      SessionSummaryService.instance = new SessionSummaryService();
    }
    return SessionSummaryService.instance;
  }

  /**
   * Collect current session data from the IDE
   */
  public collectSessionData(
    openFiles: any[],
    activeFile: string | null,
    terminalHistory: string,
    terminalCommands: string[]
  ): SessionData {
    const sessionStart = sessionStorage.getItem('session_start_time');
    const startTime = sessionStart ? parseInt(sessionStart) : Date.now();
    const sessionDuration = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes

    // Collect errors from terminal history
    const errors = this.extractErrorsFromTerminal(terminalHistory);
    
    // Detect session type based on commands and files
    const sessionType = this.detectSessionType(terminalCommands, openFiles);
    
    // Extract key information from session
    const keyDecisions = this.extractKeyDecisions(terminalHistory, terminalCommands);
    const blockers = this.extractBlockers(terminalHistory);
    const breakthroughs = this.extractBreakthroughs(terminalHistory);

    // Enhance data with fallbacks if empty
    const enhancedOpenFiles = openFiles.length > 0 ? openFiles : [{
      name: 'CoderOne IDE Session',
      path: '/ide',
      content: '# IDE Session Active\n\nDevelopment session with checkpoint and timeline features.',
      isDirty: false,
      language: 'markdown'
    }];

    const enhancedCommands = terminalCommands.length > 0 ? terminalCommands : ['IDE session started'];
    const enhancedHistory = terminalHistory.trim() || 'CoderOne IDE development session active';

    return {
      openFiles: enhancedOpenFiles.map(file => ({
        path: file.path || file.name || 'unknown',
        name: file.name || 'Untitled',
        content: file.content || '', 
        isDirty: file.isDirty || false,
        language: this.detectLanguage(file.name || ''),
        lastModified: file.lastModified || Date.now()
      })),
      activeFile: activeFile || (enhancedOpenFiles.length > 0 ? enhancedOpenFiles[0].name : null),
      terminalHistory: enhancedHistory,
      terminalCommands: enhancedCommands,
      sessionDuration: Math.max(sessionDuration, 1), // Ensure at least 1 minute
      projectStructure: this.getProjectStructure(),
      checkpoints: this.getCheckpoints(),
      gitStatus: this.getGitStatus(),
      errors,
      testResults: this.extractTestResults(enhancedHistory),
      mcpToolUsage: this.getMCPToolUsage(),
      sessionType,
      keyDecisions,
      blockers,
      breakthroughs
    };
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sql': 'sql'
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  private extractErrorsFromTerminal(terminalHistory: string): Array<{timestamp: number; message: string; source: string}> {
    const errors: Array<{timestamp: number; message: string; source: string}> = [];
    const errorPatterns = [
      /error:/gi,
      /failed/gi,
      /exception/gi,
      /traceback/gi,
      /syntaxerror/gi,
      /typeerror/gi,
      /referenceerror/gi
    ];
    
    const lines = terminalHistory.split('\n');
    lines.forEach(line => {
      errorPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          errors.push({
            timestamp: Date.now(),
            message: line.trim(),
            source: 'terminal'
          });
        }
      });
    });
    
    return errors.slice(-10); // Last 10 errors
  }

  private detectSessionType(commands: string[], files: any[]): 'bug-fix' | 'feature-dev' | 'refactoring' | 'exploration' | 'general' {
    const commandStr = commands.join(' ').toLowerCase();
    const fileNames = files.map(f => f.name).join(' ').toLowerCase();
    
    if (commandStr.includes('test') || commandStr.includes('debug') || commandStr.includes('fix')) {
      return 'bug-fix';
    }
    if (commandStr.includes('refactor') || commandStr.includes('rename') || commandStr.includes('optimize')) {
      return 'refactoring';
    }
    if (files.length > 5 || commandStr.includes('create') || commandStr.includes('add')) {
      return 'feature-dev';
    }
    if (commandStr.includes('explore') || commandStr.includes('analyze') || commandStr.includes('investigate')) {
      return 'exploration';
    }
    return 'general';
  }

  private extractKeyDecisions(history: string, commands: string[]): string[] {
    const decisions: string[] = [];
    
    // Look for decision patterns
    if (commands.some(cmd => cmd.includes('npm install'))) {
      decisions.push('Installed new dependencies');
    }
    if (commands.some(cmd => cmd.includes('git checkout -b'))) {
      decisions.push('Created new branch for development');
    }
    if (history.includes('BREAKING CHANGE')) {
      decisions.push('Made breaking API changes');
    }
    
    return decisions;
  }

  private extractBlockers(history: string): string[] {
    const blockers: string[] = [];
    const blockerPatterns = [
      /blocked by/gi,
      /waiting for/gi,
      /todo:/gi,
      /fixme:/gi,
      /not working/gi
    ];
    
    const lines = history.split('\n');
    lines.forEach(line => {
      blockerPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          blockers.push(line.trim());
        }
      });
    });
    
    return blockers.slice(-5);
  }

  private extractBreakthroughs(history: string): string[] {
    const breakthroughs: string[] = [];
    const successPatterns = [
      /fixed/gi,
      /resolved/gi,
      /success/gi,
      /works/gi,
      /breakthrough/gi
    ];
    
    const lines = history.split('\n');
    lines.forEach(line => {
      successPatterns.forEach(pattern => {
        if (pattern.test(line) && !line.includes('error')) {
          breakthroughs.push(line.trim());
        }
      });
    });
    
    return breakthroughs.slice(-5);
  }

  private extractTestResults(history: string): {passed: number; failed: number; lastRun: number; failures: string[]} | undefined {
    // Look for common test result patterns
    const jestPattern = /Tests:\s+(\d+)\s+passed.*?(\d+)\s+failed/;
    const mochaPattern = /(\d+)\s+passing.*?(\d+)\s+failing/;
    
    let match = history.match(jestPattern) || history.match(mochaPattern);
    if (match) {
      return {
        passed: parseInt(match[1]) || 0,
        failed: parseInt(match[2]) || 0,
        lastRun: Date.now(),
        failures: []
      };
    }
    
    return undefined;
  }

  private getProjectStructure(): string[] {
    // This would ideally use filesystem API
    return sessionStorage.getItem('project_structure')?.split(',') || [];
  }

  private getCheckpoints(): any[] {
    // Get from sessionStorage or context
    const checkpointsStr = sessionStorage.getItem('checkpoints');
    return checkpointsStr ? JSON.parse(checkpointsStr) : [];
  }

  private getGitStatus(): any {
    // This would ideally use git API
    const gitData = sessionStorage.getItem('git_status');
    return gitData ? JSON.parse(gitData) : undefined;
  }

  private getMCPToolUsage(): Array<{tool: string; timestamp: number; result: string}> {
    // Get from sessionStorage or context
    const mcpData = sessionStorage.getItem('mcp_tool_usage');
    return mcpData ? JSON.parse(mcpData) : [];
  }

  /**
   * Generate session summary using Claude Code
   */
  public async generateSessionSummary(sessionData: SessionData): Promise<SessionSummaryResponse> {
    try {
      const prompt = this.buildSessionSummaryPrompt(sessionData);
      
      console.log('📤 Sending session summary request to backend API');
      
      const response = await fetch(`${this.baseURL}/api/claude/session-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData,
          prompt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Received response from backend:', result.metadata);
      
      // Return the actual summary from the backend
      return {
        success: result.success || false,
        summary: result.summary || this.generateFallbackSummary(sessionData),
        error: result.metadata?.error,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('Failed to generate session summary:', error);
      
      // Provide fallback summary if API fails
      const fallbackSummary = this.generateFallbackSummary(sessionData);
      
      return {
        success: false,
        summary: fallbackSummary,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build the structured prompt for Claude Code
   */
  private buildSessionSummaryPrompt(sessionData: SessionData): string {
    const activeFiles = sessionData.openFiles.filter(f => f.content.trim().length > 0);
    const dirtyFiles = sessionData.openFiles.filter(f => f.isDirty);
    
    // Context-aware prompt based on session type
    const sessionTypeContext = this.getSessionTypeContext(sessionData.sessionType);
    
    return `You are creating a comprehensive session handoff document for the next AI agent. This is a ${sessionData.sessionType} session that lasted ${sessionData.sessionDuration} minutes.

# SESSION INTELLIGENCE REPORT

## Session Overview
- **Type**: ${sessionData.sessionType}
- **Duration**: ${sessionData.sessionDuration} minutes
- **Files Modified**: ${dirtyFiles.length} files
- **Commands Executed**: ${sessionData.terminalCommands.length} commands
- **Errors Encountered**: ${sessionData.errors.length} errors
${sessionData.gitStatus ? `- **Git Branch**: ${sessionData.gitStatus.branch}` : ''}
${sessionData.testResults ? `- **Test Results**: ${sessionData.testResults.passed} passed, ${sessionData.testResults.failed} failed` : ''}

## Key Session Insights
${sessionData.keyDecisions.length > 0 ? `### Decisions Made:\n${sessionData.keyDecisions.map(d => `- ${d}`).join('\n')}` : ''}
${sessionData.breakthroughs.length > 0 ? `### Breakthroughs:\n${sessionData.breakthroughs.map(b => `- ${b}`).join('\n')}` : ''}
${sessionData.blockers.length > 0 ? `### Current Blockers:\n${sessionData.blockers.map(b => `- ${b}`).join('\n')}` : ''}

## File Analysis
${activeFiles.map(file => `
### ${file.name} ${file.isDirty ? '🔴 UNSAVED' : '✅'}
- **Language**: ${file.language}
- **Path**: ${file.path}
- **Status**: ${file.isDirty ? 'Modified but not saved' : 'Saved'}
\`\`\`${file.language}
${file.content.substring(0, 1000)}${file.content.length > 1000 ? '\n... [truncated for preview]' : ''}
\`\`\`
`).join('\n')}

## Terminal Command History
\`\`\`bash
${sessionData.terminalCommands.slice(-30).join('\n')}
\`\`\`

${sessionData.errors.length > 0 ? `## Error Analysis
${sessionData.errors.slice(-5).map(e => `- ${e.message}`).join('\n')}` : ''}

## Terminal Output Context
\`\`\`
${sessionData.terminalHistory.substring(-2000)}
\`\`\`

${sessionData.mcpToolUsage.length > 0 ? `## MCP Tool Usage
${sessionData.mcpToolUsage.map(m => `- ${new Date(m.timestamp).toLocaleTimeString()}: ${m.tool} - ${m.result}`).join('\n')}` : ''}

# HANDOFF INSTRUCTIONS FOR NEXT AGENT

Based on this ${sessionData.sessionType} session, please provide:

1. **Executive Summary** (2-3 sentences)
   - What was accomplished
   - Current state of the project
   - Most critical next step

2. **Detailed Work Completed**
   - Specific features/fixes implemented
   - Code changes and their rationale
   - Configuration changes made

3. **Current State Analysis**
   - What's working correctly
   - What's partially complete
   - What hasn't been started

4. **Critical Context**
   - Technical decisions and why they were made
   - Gotchas or non-obvious implementation details
   - Dependencies or environment setup required

5. **Errors & Issues**
   - Unresolved errors and their context
   - Attempted solutions that didn't work
   - Potential root causes to investigate

6. **Immediate Next Steps** (prioritized)
   - Exactly what to do next
   - Commands to run
   - Files to modify
   - Tests to write

7. **Testing & Validation**
   - How to verify the work done
   - Test commands to run
   - Expected outcomes

8. **Long-term Recommendations**
   - Architectural improvements needed
   - Technical debt to address
   - Performance optimizations to consider

${sessionTypeContext}

Format your response as a structured document that another AI agent can immediately use to continue work without any confusion or lost context. Use clear headings, bullet points, and code blocks where appropriate.`;
  }

  private getSessionTypeContext(sessionType?: string): string {
    const contexts: Record<string, string> = {
      'bug-fix': '\n## Bug Fix Context\nFocus on: root cause analysis, test coverage, regression prevention',
      'feature-dev': '\n## Feature Development Context\nFocus on: implementation completeness, integration points, documentation needs',
      'refactoring': '\n## Refactoring Context\nFocus on: code quality improvements, performance gains, maintainability',
      'exploration': '\n## Exploration Context\nFocus on: findings, conclusions, recommended approaches',
      'general': ''
    };
    return contexts[sessionType || 'general'] || '';
  }

  /**
   * Export session summary in multiple formats
   */
  public async exportSessionSummary(
    summary: string, 
    sessionData: SessionData,
    options: ExportOptions
  ): Promise<{success: boolean; exports: Record<string, string>; error?: string}> {
    try {
      const exports: Record<string, string> = {};
      const sessionId = `session_${Date.now()}`;
      
      if (options.format === 'markdown' || options.format === 'all') {
        exports.markdown = this.formatAsMarkdown(summary, sessionData, options);
      }
      
      if (options.format === 'json' || options.format === 'all') {
        exports.json = this.formatAsJSON(summary, sessionData, options);
      }
      
      if (options.format === 'html' || options.format === 'all') {
        exports.html = this.formatAsHTML(summary, sessionData, options);
      }
      
      // Save to file if requested
      if (options.saveToFile) {
        await this.saveToFile(exports, sessionId, options);
      }
      
      // Also save to sessionStorage for persistence
      this.saveToSessionStorage(summary, sessionData, sessionId);
      
      return {
        success: true,
        exports
      };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        exports: {},
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  private formatAsMarkdown(summary: string, sessionData: SessionData, options: ExportOptions): string {
    const timestamp = new Date().toISOString();
    const header = `---
title: Session Summary - ${sessionData.sessionType}
date: ${timestamp}
duration: ${sessionData.sessionDuration} minutes
files_modified: ${sessionData.openFiles.filter(f => f.isDirty).length}
errors: ${sessionData.errors.length}
${sessionData.gitStatus ? `branch: ${sessionData.gitStatus.branch}` : ''}
---

`;
    
    return options.includeMetadata ? header + summary : summary;
  }

  private formatAsJSON(summary: string, sessionData: SessionData, options: ExportOptions): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      sessionType: sessionData.sessionType,
      duration: sessionData.sessionDuration,
      summary: summary,
      sessionData: options.includeMetadata ? sessionData : undefined,
      statistics: {
        filesModified: sessionData.openFiles.filter(f => f.isDirty).length,
        commandsExecuted: sessionData.terminalCommands.length,
        errorsEncountered: sessionData.errors.length,
        testsRun: sessionData.testResults ? sessionData.testResults.passed + sessionData.testResults.failed : 0
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  private formatAsHTML(summary: string, sessionData: SessionData, options: ExportOptions): string {
    // Convert markdown to HTML (simple conversion)
    const htmlContent = summary
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Summary - ${sessionData.sessionType}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #0a0a0a;
      color: #e0e0e0;
    }
    h1, h2, h3 { color: #ff6b35; }
    pre { 
      background: #1a1a1a;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
    }
    code { 
      background: #2a2a2a;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }
    li { margin: 0.5rem 0; }
    .metadata {
      background: #1a1a1a;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  ${options.includeMetadata ? `
  <div class="metadata">
    <h3>Session Metadata</h3>
    <p><strong>Type:</strong> ${sessionData.sessionType}</p>
    <p><strong>Duration:</strong> ${sessionData.sessionDuration} minutes</p>
    <p><strong>Files Modified:</strong> ${sessionData.openFiles.filter(f => f.isDirty).length}</p>
    <p><strong>Errors:</strong> ${sessionData.errors.length}</p>
    ${sessionData.gitStatus ? `<p><strong>Branch:</strong> ${sessionData.gitStatus.branch}</p>` : ''}
  </div>
  ` : ''}
  ${htmlContent}
</body>
</html>`;
  }

  private async saveToFile(exports: Record<string, string>, sessionId: string, options: ExportOptions): Promise<void> {
    // This would integrate with file system API
    // For now, we'll trigger download in the browser
    const filename = options.filename || `session_summary_${sessionId}`;
    
    Object.entries(exports).forEach(([format, content]) => {
      const blob = new Blob([content], { type: this.getMimeType(format) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'markdown': 'text/markdown',
      'json': 'application/json',
      'html': 'text/html'
    };
    return mimeTypes[format] || 'text/plain';
  }

  private saveToSessionStorage(summary: string, sessionData: SessionData, sessionId: string): void {
    const sessionHistory = {
      id: sessionId,
      timestamp: Date.now(),
      summary,
      sessionType: sessionData.sessionType,
      duration: sessionData.sessionDuration,
      filesModified: sessionData.openFiles.filter(f => f.isDirty).map(f => f.name)
    };
    
    // Keep last 5 sessions
    const existingSessions = JSON.parse(sessionStorage.getItem('session_summaries') || '[]');
    existingSessions.unshift(sessionHistory);
    sessionStorage.setItem('session_summaries', JSON.stringify(existingSessions.slice(0, 5)));
  }

  /**
   * Generate fallback summary when API is unavailable
   */
  private generateFallbackSummary(sessionData: SessionData): string {
    const activeFiles = sessionData.openFiles.filter(f => f.content && f.content.trim().length > 0);
    const dirtyFiles = sessionData.openFiles.filter(f => f.isDirty);
    const recentCommands = sessionData.terminalCommands.slice(-10); // Last 10 commands
    
    // Get meaningful session metrics
    const sessionMinutes = sessionData.sessionDuration || 0;
    const sessionHours = Math.floor(sessionMinutes / 60);
    const remainingMinutes = sessionMinutes % 60;
    const durationText = sessionHours > 0 
      ? `${sessionHours}h ${remainingMinutes}m` 
      : `${sessionMinutes}m`;
    
    // Detect session type
    const sessionType = sessionData.sessionType || 'Development';
    
    // Create a rich fallback summary
    return `# 🚀 Session Intelligence Report

## 📊 Session Overview
- **Type**: ${sessionType} Session
- **Duration**: ${durationText}
- **Files Active**: ${activeFiles.length} files
- **Files Modified**: ${dirtyFiles.length} files
- **Terminal Activity**: ${recentCommands.length} recent commands
- **Focus Area**: ${sessionData.activeFile || 'Multiple files'}

## 📁 Active Development Files
${activeFiles.length > 0 
  ? activeFiles.map(file => `- **${file.name}** ${file.isDirty ? '🔴 *modified*' : '✅ *saved*'} (${file.language || 'unknown'})`).join('\n')
  : '- *No files currently open*'
}

## 💻 Recent Terminal Activity
${recentCommands.length > 0 
  ? recentCommands.map(cmd => `- \`${cmd}\``).join('\n')
  : '- *No recent terminal commands recorded*'
}

${sessionData.errors && sessionData.errors.length > 0 ? `
## ⚠️ Issues Encountered
${sessionData.errors.slice(0, 3).map(error => `- ${error}`).join('\n')}
` : ''}

${sessionData.breakthroughs && sessionData.breakthroughs.length > 0 ? `
## 🎉 Progress Made
${sessionData.breakthroughs.map(breakthrough => `- ${breakthrough}`).join('\n')}
` : ''}

${dirtyFiles.length > 0 ? `
## 📝 Modified Code Preview
${dirtyFiles.slice(0, 2).map(file => `
### ${file.name}
\`\`\`${file.language || 'text'}
${file.content.substring(0, 300)}${file.content.length > 300 ? '\n... [truncated]' : ''}
\`\`\`
`).join('\n')}
` : ''}

## 🔄 Next Steps
1. **Save Progress**: ${dirtyFiles.length > 0 ? `${dirtyFiles.length} file(s) have unsaved changes` : 'All files are saved'}
2. **Test Recent Changes**: Verify functionality from recent terminal commands
3. **Create Checkpoint**: Consider saving a checkpoint before major changes
4. **Code Review**: Review modified files for quality and consistency

---
*📝 Basic summary generated - full AI analysis requires Claude Code API connection*
*⚡ For enhanced insights, configure your Claude Code API key in environment variables*`;
  }
}

// Export singleton instance
export const sessionSummaryService = SessionSummaryService.getInstance();