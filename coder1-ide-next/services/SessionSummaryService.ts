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
    // Use the current origin for API calls
    this.baseURL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
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
    openFiles: any[] = [],
    activeFile: string | null = null,
    terminalHistory: string = '',
    terminalCommands: string[] = []
  ): SessionData {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return this.createFallbackSessionData();
    }

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
      content: '# CoderOne v2.0 Next.js IDE Session\n\nDevelopment session with advanced checkpoint and timeline features.',
      isDirty: false,
      language: 'markdown'
    }];

    const enhancedCommands = terminalCommands.length > 0 ? terminalCommands : ['CoderOne v2.0 IDE session started'];
    const enhancedHistory = terminalHistory.trim() || 'CoderOne v2.0 Next.js IDE development session active';

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

  private createFallbackSessionData(): SessionData {
    return {
      openFiles: [{
        path: '/ide',
        name: 'CoderOne v2.0 Session',
        content: '# CoderOne v2.0 Next.js IDE Session\n\nServer-side session data collection.',
        isDirty: false,
        language: 'markdown',
        lastModified: Date.now()
      }],
      activeFile: 'CoderOne v2.0 Session',
      terminalHistory: 'CoderOne v2.0 Next.js IDE development session',
      terminalCommands: ['session started'],
      sessionDuration: 1,
      projectStructure: [],
      checkpoints: [],
      errors: [],
      mcpToolUsage: [],
      sessionType: 'general',
      keyDecisions: [],
      blockers: [],
      breakthroughs: []
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
    if (typeof window === 'undefined') return [];
    // This would ideally use filesystem API
    return sessionStorage.getItem('project_structure')?.split(',') || [];
  }

  private getCheckpoints(): any[] {
    if (typeof window === 'undefined') return [];
    // Get from sessionStorage or context
    const checkpointsStr = sessionStorage.getItem('checkpoints');
    return checkpointsStr ? JSON.parse(checkpointsStr) : [];
  }

  private getGitStatus(): any {
    if (typeof window === 'undefined') return undefined;
    // This would ideally use git API
    const gitData = sessionStorage.getItem('git_status');
    return gitData ? JSON.parse(gitData) : undefined;
  }

  private getMCPToolUsage(): Array<{tool: string; timestamp: number; result: string}> {
    if (typeof window === 'undefined') return [];
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
      
      // REMOVED: // REMOVED: // REMOVED: console.log('📤 Sending session summary request to Next.js API');
      
      const response = await fetch(`${this.baseURL}/api/claude/session-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: `session_${Date.now()}`,
          sessionData,
          prompt,
          includeTerminalHistory: true,
          includeFileChanges: true,
          includeCommits: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger?.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // REMOVED: // REMOVED: // REMOVED: console.log('📥 Received response from API:', result.metadata);
      
      // Return the actual summary from the API
      return {
        success: result.success || false,
        summary: result.summary || this.generateFallbackSummary(sessionData),
        error: result.metadata?.error,
        metadata: result.metadata
      };

    } catch (error) {
      logger?.error('Failed to generate session summary:', error);
      
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
    
    // Extract patterns from terminal history for deeper analysis
    const terminalLines = sessionData.terminalHistory.split('\n');
    const errorLines = terminalLines.filter(line => 
      /error|failed|exception|warning|traceback/i.test(line)
    ).slice(-20);
    
    const successLines = terminalLines.filter(line =>
      /success|fixed|resolved|works|passed|complete/i.test(line)  
    ).slice(-10);
    
    // Analyze command patterns
    const debuggingCommands = sessionData.terminalCommands.filter(cmd =>
      /console\.log|debug|test|npm run|grep|find|cat|ls -la/i.test(cmd)
    );
    
    const buildCommands = sessionData.terminalCommands.filter(cmd =>
      /npm run build|npm install|yarn|pip install|cargo build/i.test(cmd)
    );
    
    return `You are creating an EXTREMELY COMPREHENSIVE session handoff document. The next agent needs to understand EVERYTHING that happened, every problem encountered, every solution attempted, and the exact state of the project.

CRITICAL INSTRUCTION: Please go back through EVERY DETAIL of this session, read EVERYTHING carefully, and provide an IN-DEPTH summary about:
- What happened (chronologically, step by step)
- What hurdles were encountered (every single one)
- What the problems were (root causes, not just symptoms)
- Where we're at now (exact current state)
- Where we want to go (clear direction)
- A detailed plan for moving forward

BE AS DETAILED AS POSSIBLE. The next agent should feel like they were present for the entire session.

# 📊 COMPREHENSIVE SESSION DATA

## Session Metrics
- **Session Type**: ${sessionData.sessionType}
- **Duration**: ${sessionData.sessionDuration} minutes
- **Files Touched**: ${activeFiles.length} files opened, ${dirtyFiles.length} modified
- **Terminal Commands**: ${sessionData.terminalCommands.length} total commands
- **Debugging Commands**: ${debuggingCommands.length} debugging/testing commands
- **Build Commands**: ${buildCommands.length} build/install commands
- **Errors Detected**: ${sessionData.errors.length} errors, ${errorLines.length} error lines in terminal
- **Successes**: ${sessionData.breakthroughs.length} breakthroughs, ${successLines.length} success indicators
${sessionData.gitStatus ? `- **Git Branch**: ${sessionData.gitStatus.branch}
- **Modified Files in Git**: ${sessionData.gitStatus.modifiedFiles.length}
- **Staged Files**: ${sessionData.gitStatus.stagedFiles.length}
- **Untracked Files**: ${sessionData.gitStatus.untrackedFiles.length}` : ''}
${sessionData.testResults ? `- **Test Results**: ${sessionData.testResults.passed} passed, ${sessionData.testResults.failed} failed
- **Test Failures**: ${sessionData.testResults.failures.join(', ')}` : ''}

## Detected Patterns
- **Session Focus**: ${sessionData.sessionType === 'bug-fix' ? 'Debugging and fixing issues' : 
  sessionData.sessionType === 'feature-dev' ? 'Implementing new functionality' :
  sessionData.sessionType === 'refactoring' ? 'Improving code structure' :
  sessionData.sessionType === 'exploration' ? 'Investigating and learning' : 'General development'}
- **Error Frequency**: ${(sessionData.errors.length / Math.max(sessionData.sessionDuration, 1)).toFixed(2)} errors per minute
- **Command Velocity**: ${(sessionData.terminalCommands.length / Math.max(sessionData.sessionDuration, 1)).toFixed(2)} commands per minute
- **File Switching Pattern**: ${activeFiles.length > 5 ? 'High - indicates complex multi-file work' : 'Low - focused work'}

## Session Intelligence Insights
${sessionData.keyDecisions.length > 0 ? `### 🎯 Key Decisions Made:\n${sessionData.keyDecisions.map(d => `- ${d}`).join('\n')}` : '### 🎯 Key Decisions: None explicitly recorded'}

${sessionData.breakthroughs.length > 0 ? `### ✅ Breakthroughs & Successes:\n${sessionData.breakthroughs.map(b => `- ${b}`).join('\n')}
${successLines.length > 0 ? '\n### Additional Success Indicators from Terminal:\n' + successLines.slice(0, 5).map(l => `- ${l.trim()}`).join('\n') : ''}` : '### ✅ Breakthroughs: None detected'}

${sessionData.blockers.length > 0 ? `### 🚧 Current Blockers & Issues:\n${sessionData.blockers.map(b => `- ${b}`).join('\n')}` : '### 🚧 Blockers: None explicitly recorded'}

${errorLines.length > 0 ? `### ⚠️ Error Patterns Detected:\n${errorLines.slice(0, 10).map(e => `- ${e.trim()}`).join('\n')}` : ''}

## Detailed File Analysis
${activeFiles.length > 0 ? activeFiles.map(file => `
### 📄 ${file.name} ${file.isDirty ? '🔴 UNSAVED CHANGES' : '✅ SAVED'}
- **Full Path**: ${file.path}
- **Language**: ${file.language}
- **Last Modified**: ${new Date(file.lastModified || Date.now()).toLocaleString()}
- **Status**: ${file.isDirty ? '⚠️ Has unsaved modifications - SAVE REQUIRED' : '✓ All changes saved'}
- **Size**: ${file.content.length} characters

#### Code Content (First 1500 chars):
\`\`\`${file.language}
${file.content.substring(0, 1500)}${file.content.length > 1500 ? '\n... [${file.content.length - 1500} more characters truncated]' : ''}
\`\`\`

#### Analysis:
- Lines of code: ~${file.content.split('\n').length}
- Has TODOs: ${file.content.includes('TODO') ? 'Yes' : 'No'}
- Has FIXMEs: ${file.content.includes('FIXME') ? 'Yes' : 'No'}
- Has console.logs: ${file.content.includes('console.log') ? 'Yes (consider removing)' : 'No'}
`).join('\n---\n') : '*No files were opened during this session*'}

## Complete Terminal Command History
### All Commands Executed (${sessionData.terminalCommands.length} total):
\`\`\`bash
${sessionData.terminalCommands.join('\n')}
\`\`\`

### Command Analysis:
- **Most Common Command**: ${this.getMostCommonCommand(sessionData.terminalCommands)}
- **Debugging Commands**: ${debuggingCommands.length > 0 ? debuggingCommands.join(', ') : 'None'}
- **Build/Install Commands**: ${buildCommands.length > 0 ? buildCommands.join(', ') : 'None'}

## Error Deep Dive
${sessionData.errors.length > 0 ? `### All Errors Encountered (${sessionData.errors.length} total):
${sessionData.errors.map((e, i) => `
#### Error ${i + 1} - ${new Date(e.timestamp).toLocaleTimeString()}
- **Source**: ${e.source}
- **Message**: ${e.message}
- **Occurred After**: ${this.getCommandBeforeError(e.timestamp, sessionData.terminalCommands)}`).join('\n')}` : 'No explicit errors recorded in session data'}

## Terminal Output Analysis (Last 3000 chars):
\`\`\`
${sessionData.terminalHistory.slice(-3000)}
\`\`\`

${sessionData.mcpToolUsage.length > 0 ? `## MCP Tool Usage
${sessionData.mcpToolUsage.map(m => `- ${new Date(m.timestamp).toLocaleTimeString()}: ${m.tool} - ${m.result}`).join('\n')}` : ''}

# 🎯 COMPREHENSIVE HANDOFF ANALYSIS

Now, based on ALL of the above data, please provide an EXTREMELY DETAILED analysis covering:

## 1. 📖 COMPLETE SESSION CHRONICLE
Provide a blow-by-blow account of EVERYTHING that happened during this session:
- Start with what the developer was trying to achieve
- Walk through each major action taken (referencing specific files and commands)
- Explain the thought process behind command sequences
- Identify where things went wrong and right
- Note any patterns of trial and error
- Highlight moments of progress and setbacks

## 2. 🔍 PROBLEMS & HURDLES - DEEP ANALYSIS
For EVERY problem encountered (even minor ones):
- What was the initial symptom?
- What debugging steps were taken?
- What was the suspected cause?
- What solutions were attempted?
- Did the solution work? If not, why?
- Is the problem fully resolved or partially addressed?
- What was learned from this problem?

## 3. 💡 TECHNICAL DECISIONS & RATIONALE
Document EVERY technical decision:
- Why were certain approaches chosen?
- What alternatives were considered?
- What trade-offs were made?
- Which decisions might need revisiting?
- What assumptions were made?

## 4. 📊 CURRENT STATE - EXACT STATUS
Be EXTREMELY specific about where things stand:
- What is 100% working and tested?
- What is partially working (specify exactly what works and what doesn't)?
- What is completely broken?
- What hasn't been started yet?
- What's in an unknown state (needs testing)?
- Are there any files with unsaved changes? (CRITICAL)

## 5. 🚨 UNRESOLVED ISSUES - COMPLETE LIST
Every single unresolved issue, no matter how small:
- Error messages that still appear
- Features that don't work as expected
- Performance issues noticed
- Code that needs cleanup
- TODOs and FIXMEs in the code
- Potential bugs not yet investigated

## 6. ✨ SUCCESSES & WHAT WORKED
Document what went well:
- Solutions that worked on first try
- Clever fixes or workarounds discovered
- Performance improvements achieved
- Code quality improvements made
- Knowledge gained

## 7. 🔧 CODE CHANGES - DETAILED REVIEW
For each file modified:
- What specific changes were made?
- Why were these changes necessary?
- Do the changes follow project conventions?
- Are there any temporary hacks that need cleanup?
- Is the code production-ready or needs more work?

## 8. 🧪 TESTING & VALIDATION STATUS
- What has been tested manually?
- What automated tests were run?
- What tests are passing/failing?
- What still needs to be tested?
- Are there edge cases to consider?

## 9. ⚙️ ENVIRONMENT & CONFIGURATION
- Were any dependencies added/updated?
- Were any configuration files changed?
- Are there new environment variables needed?
- Did any tools or settings change?
- Is the development environment stable?

## 10. 📋 NEXT AGENT HANDOFF - STEP-BY-STEP INSTRUCTIONS

### IMMEDIATE ACTIONS (Do these first):
1. [Specific first action with exact command if applicable]
2. [Second action with file path and what to change]
3. [Continue numbering all immediate actions]

### CONTINUE DEVELOPMENT:
- Provide the EXACT next steps in the development process
- Include specific files to edit and what to add/change
- List commands to run and their expected output
- Specify what success looks like for each step

### TESTING CHECKLIST:
- [ ] Test 1: [Specific test with command]
- [ ] Test 2: [What to verify and how]
- [ ] Test 3: [Continue with all needed tests]

### DEBUGGING GUIDANCE:
If the next agent encounters issues:
- If you see [error X], try [solution Y]
- Common gotcha: [describe potential issue]
- Watch out for: [thing that might trip them up]

## 11. 🎯 STRATEGIC RECOMMENDATIONS

### Short-term (This session or next):
- Priority fixes needed
- Quick wins available
- Urgent refactoring required

### Medium-term (Next few sessions):
- Architectural improvements
- Performance optimizations  
- Technical debt to address

### Long-term (Project evolution):
- Major refactoring opportunities
- Scalability considerations
- Feature enhancements to consider

## 12. 📝 SESSION METADATA & CONTEXT
- IDE: CoderOne v2.0 Next.js IDE
- Session ID: ${sessionData.sessionDuration}min session
- Key Technologies: ${this.detectTechnologies(sessionData)}
- Development Pattern: ${sessionData.sessionType}

${sessionTypeContext}

# FINAL HANDOFF SUMMARY
[Provide a clear, actionable paragraph that the next agent can read to immediately understand what to do next]

Remember: BE EXHAUSTIVELY DETAILED. The next agent should know EVERYTHING about this session.`;
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

  private getMostCommonCommand(commands: string[]): string {
    if (commands.length === 0) return 'None';
    
    const frequency: Record<string, number> = {};
    commands.forEach(cmd => {
      const baseCmd = cmd.split(' ')[0];
      frequency[baseCmd] = (frequency[baseCmd] || 0) + 1;
    });
    
    const mostCommon = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])[0];
    
    return mostCommon ? `${mostCommon[0]} (${mostCommon[1]} times)` : 'None';
  }

  private getCommandBeforeError(errorTime: number, commands: string[]): string {
    // This is a simplified version - in reality would need timestamps for commands
    return commands.length > 0 ? commands[commands.length - 1] : 'Unknown';
  }

  private detectTechnologies(sessionData: SessionData): string {
    const techs = new Set<string>();
    
    // Detect from file extensions
    sessionData.openFiles.forEach(file => {
      if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) techs.add('TypeScript');
      if (file.name.endsWith('.jsx') || file.name.endsWith('.js')) techs.add('JavaScript');
      if (file.name.endsWith('.py')) techs.add('Python');
      if (file.name.endsWith('.rs')) techs.add('Rust');
      if (file.name.endsWith('.go')) techs.add('Go');
    });
    
    // Detect from commands
    sessionData.terminalCommands.forEach(cmd => {
      if (cmd.includes('npm')) techs.add('Node.js');
      if (cmd.includes('yarn')) techs.add('Yarn');
      if (cmd.includes('pip')) techs.add('Python');
      if (cmd.includes('cargo')) techs.add('Rust');
      if (cmd.includes('go')) techs.add('Go');
      if (cmd.includes('docker')) techs.add('Docker');
    });
    
    return Array.from(techs).join(', ') || 'Not detected';
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
      if (options.saveToFile && typeof window !== 'undefined') {
        await this.saveToFile(exports, sessionId, options);
      }
      
      // Also save to sessionStorage for persistence
      if (typeof window !== 'undefined') {
        this.saveToSessionStorage(summary, sessionData, sessionId);
      }
      
      return {
        success: true,
        exports
      };
    } catch (error) {
      logger?.error('Export failed:', error);
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
    // This triggers download in the browser
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
    const allCommands = sessionData.terminalCommands;
    
    // Get meaningful session metrics
    const sessionMinutes = sessionData.sessionDuration || 0;
    const sessionHours = Math.floor(sessionMinutes / 60);
    const remainingMinutes = sessionMinutes % 60;
    const durationText = sessionHours > 0 
      ? `${sessionHours}h ${remainingMinutes}m` 
      : `${sessionMinutes}m`;
    
    // Detect session type
    const sessionType = sessionData.sessionType || 'Development';
    
    // Extract more patterns from terminal history
    const terminalLines = sessionData.terminalHistory.split('\n');
    const errorPatterns = terminalLines.filter(line => 
      /error|failed|exception|warning/i.test(line)
    ).slice(-10);
    
    const successPatterns = terminalLines.filter(line =>
      /success|fixed|complete|passed/i.test(line)  
    ).slice(-5);
    
    // Create a comprehensive fallback summary
    return `# 🚀 CoderOne v2.0 Session Intelligence Report - Comprehensive Handoff Document

## 📊 Session Metrics & Overview
- **Session Type**: ${sessionType} Session
- **Duration**: ${durationText} (${sessionMinutes} minutes total)
- **Files Opened**: ${activeFiles.length} files
- **Files Modified**: ${dirtyFiles.length} files (${dirtyFiles.length > 0 ? '⚠️ UNSAVED CHANGES' : '✅ All saved'})
- **Commands Executed**: ${allCommands.length} total commands
- **Errors Detected**: ${sessionData.errors.length} errors
- **Breakthroughs**: ${sessionData.breakthroughs.length} successes
- **Focus Area**: ${sessionData.activeFile || 'Multiple files'}
- **Command Velocity**: ${(allCommands.length / Math.max(sessionMinutes, 1)).toFixed(2)} commands/minute

## 📖 Session Chronicle
Based on the available data, this session involved:
${allCommands.length > 0 ? `
- Started with: \`${allCommands[0]}\`
- Most recent: \`${allCommands[allCommands.length - 1]}\`
- Command pattern indicates: ${sessionType === 'bug-fix' ? 'debugging and testing' : 
  sessionType === 'feature-dev' ? 'new feature implementation' :
  sessionType === 'refactoring' ? 'code improvement' : 'general development'}` : '- No commands recorded'}

## 📁 Detailed File Analysis
${activeFiles.length > 0 
  ? activeFiles.map(file => `
### ${file.name} ${file.isDirty ? '🔴 UNSAVED CHANGES' : '✅ SAVED'}
- **Path**: ${file.path}
- **Language**: ${file.language || 'unknown'}
- **Status**: ${file.isDirty ? '⚠️ Has unsaved modifications - SAVE IMMEDIATELY' : '✓ All changes saved'}
- **Size**: ${file.content.length} characters
- **Lines**: ~${file.content.split('\n').length}
${file.content.includes('TODO') ? '- **Has TODOs**: Yes - review needed' : ''}
${file.content.includes('FIXME') ? '- **Has FIXMEs**: Yes - urgent attention needed' : ''}
${file.content.includes('console.log') ? '- **Has console.logs**: Yes - consider removing before production' : ''}

#### Code Preview (first 500 chars):
\`\`\`${file.language || 'text'}
${file.content.substring(0, 500)}${file.content.length > 500 ? '\n... [${file.content.length - 500} more characters]' : ''}
\`\`\`
`).join('\n---\n')
  : '- *No files currently open*'
}

## 💻 Complete Command History
${allCommands.length > 0 
  ? '### All Commands Executed:\n```bash\n' + allCommands.join('\n') + '\n```\n\n### Command Analysis:\n' +
    `- Most common: ${this.getMostCommonCommand(allCommands)}\n` +
    `- Debugging commands: ${allCommands.filter(c => /test|debug|console/i.test(c)).length}\n` +
    `- Build/install commands: ${allCommands.filter(c => /npm|yarn|build|install/i.test(c)).length}`
  : '- *No terminal commands recorded*'
}

${errorPatterns.length > 0 ? `
## ⚠️ Errors & Problems Detected
### Error Patterns from Terminal:
${errorPatterns.map(error => `- ${error.trim()}`).join('\n')}

### Explicit Errors:
${sessionData.errors.length > 0 
  ? sessionData.errors.map((e, i) => `${i + 1}. **${new Date(e.timestamp).toLocaleTimeString()}** - ${e.message} (${e.source})`).join('\n')
  : 'No explicit errors in session data'
}` : ''}

${successPatterns.length > 0 || (sessionData.breakthroughs && sessionData.breakthroughs.length > 0) ? `
## ✅ Successes & Breakthroughs
${successPatterns.length > 0 ? '### Success Indicators from Terminal:\n' + successPatterns.map(s => `- ${s.trim()}`).join('\n') : ''}
${sessionData.breakthroughs && sessionData.breakthroughs.length > 0 ? '\n### Documented Breakthroughs:\n' + sessionData.breakthroughs.map(b => `- ${b}`).join('\n') : ''}
` : ''}

${sessionData.blockers && sessionData.blockers.length > 0 ? `
## 🚧 Current Blockers
${sessionData.blockers.map(blocker => `- ${blocker}`).join('\n')}
` : ''}

## 🔍 Terminal Output Analysis
### Recent Terminal Activity (last 1000 chars):
\`\`\`
${sessionData.terminalHistory.slice(-1000) || 'No terminal output recorded'}
\`\`\`

## 📊 Current State Assessment
${dirtyFiles.length > 0 ? `### ⚠️ CRITICAL: ${dirtyFiles.length} Files Have Unsaved Changes
${dirtyFiles.map(f => `- ${f.name} - MUST BE SAVED`).join('\n')}

**IMMEDIATE ACTION REQUIRED**: Save these files before continuing!` : '### ✅ All Files Saved'}

### Working Status:
- **Definitely Working**: ${successPatterns.length > 0 ? 'Some features showing success' : 'Unknown - needs testing'}
- **Potentially Broken**: ${errorPatterns.length > 0 ? 'Errors detected - investigation needed' : 'No obvious breaks'}
- **Needs Testing**: ${activeFiles.length > 0 ? 'All modified code should be tested' : 'No recent changes to test'}

## 📋 Next Agent Handoff Instructions

### 🔴 IMMEDIATE ACTIONS (Do First):
1. ${dirtyFiles.length > 0 ? `SAVE ALL UNSAVED FILES: ${dirtyFiles.map(f => f.name).join(', ')}` : 'Check for any uncommitted changes with `git status`'}
2. ${errorPatterns.length > 0 ? 'Review and fix the errors listed above' : 'Run tests to verify current state'}
3. ${sessionData.terminalHistory.includes('npm install') ? 'Verify dependencies installed correctly' : 'Check if dependencies are up to date'}
4. Review the terminal output for any missed issues

### 📝 Continue Development:
${sessionType === 'bug-fix' ? `
- Continue debugging the issues identified
- Add tests to prevent regression
- Verify fixes work in all scenarios` :
sessionType === 'feature-dev' ? `
- Complete the feature implementation
- Add necessary tests
- Update documentation` :
sessionType === 'refactoring' ? `
- Continue code improvements
- Ensure no functionality is broken
- Update affected tests` : `
- Review the session activity above
- Determine next development priority
- Continue based on project requirements`}

### 🧪 Testing Checklist:
- [ ] All modified files saved
- [ ] No syntax errors in terminal
- [ ] Core functionality still works
- [ ] New changes tested manually
- [ ] Automated tests pass (if applicable)

### ⚠️ Debugging Guidance:
${errorPatterns.length > 0 ? `
Known errors to investigate:
${errorPatterns.slice(0, 3).map(e => `- ${e.trim()}`).join('\n')}` : ''}
- Check terminal output for additional context
- Review file changes for potential issues
- Use debugging commands from history as reference

## 🎯 Strategic Recommendations

### Short-term (This Session):
- ${dirtyFiles.length > 0 ? 'Save all unsaved changes immediately' : 'Create a checkpoint of current work'}
- ${errorPatterns.length > 0 ? 'Fix identified errors before proceeding' : 'Run comprehensive tests'}
- ${allCommands.length < 5 ? 'Session appears incomplete - continue work' : 'Review work done and plan next steps'}

### Medium-term (Next Session):
- ${sessionData.errors.length > 3 ? 'Focus on error reduction and stability' : 'Continue feature development'}
- ${activeFiles.length > 5 ? 'Consider refactoring for better organization' : 'Maintain focused development'}
- Add more comprehensive error handling

### Long-term (Project Evolution):
- Implement automated testing if not present
- Consider architectural improvements based on session patterns
- Document complex areas identified during this session

## 🔧 Session Context & Metadata
- **IDE**: CoderOne v2.0 Next.js IDE
- **Session ID**: ${sessionMinutes}min-${Date.now()}
- **Detected Technologies**: ${this.detectTechnologies(sessionData)}
- **Development Pattern**: ${sessionType}
- **Checkpoint Recommended**: ${dirtyFiles.length > 0 || errorPatterns.length > 0 ? 'YES - URGENT' : 'Yes - for continuity'}

## 🎯 Final Handoff Summary
This ${sessionType} session lasted ${durationText} and involved work on ${activeFiles.length} files with ${allCommands.length} commands executed. ${dirtyFiles.length > 0 ? `⚠️ CRITICAL: ${dirtyFiles.length} files have unsaved changes that MUST be saved immediately. ` : ''}${errorPatterns.length > 0 ? `There are ${errorPatterns.length} error patterns that need investigation. ` : ''}The session ${successPatterns.length > 0 ? 'made progress with some successes' : 'status needs verification through testing'}. The next agent should ${dirtyFiles.length > 0 ? 'FIRST save all unsaved files, then ' : ''}${errorPatterns.length > 0 ? 'address the errors identified' : 'continue development based on the session analysis above'}.

---
*📝 Comprehensive fallback summary - CoderOne v2.0 Session Intelligence*
*⚡ Note: This is an enhanced fallback summary without AI analysis*
*💡 For full AI-powered analysis, ensure Claude API is configured*
*🚀 Generated by CoderOne v2.0 SessionSummaryService at ${new Date().toLocaleString()}*`;
  }
}

// Export singleton instance
export const sessionSummaryService = SessionSummaryService.getInstance();