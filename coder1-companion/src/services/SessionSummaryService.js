const fs = require('fs').promises;
const path = require('path');

/**
 * Session Summary Service - Claude Code Headless Integration
 * 
 * This service creates comprehensive development session summaries using Claude Code's headless mode.
 * It gathers context from files, terminal history, git changes, and provides intelligent analysis
 * for perfect handoffs between human and AI development sessions.
 */
class SessionSummaryService {
  constructor(options) {
    this.logger = options.logger;
    this.claudeBridge = options.claudeBridge;
    this.projectService = options.projectService;
    
    // Summary cache and templates
    this.summaryCache = new Map();
    this.summaryTemplates = new Map();
    
    this.initializeTemplates();
  }

  initializeTemplates() {
    // Standard development session template
    this.summaryTemplates.set('development', {
      name: 'Development Session Summary',
      sections: [
        'objectives',
        'changes_made',
        'technical_decisions',
        'issues_encountered',
        'next_steps',
        'handoff_context'
      ],
      prompt: `Analyze this development session and create a comprehensive handoff summary.

**Context Analysis Requirements:**
1. **Objectives**: What was the main goal of this session?
2. **Changes Made**: What files were modified, created, or deleted?
3. **Technical Decisions**: What architectural or implementation choices were made?
4. **Issues Encountered**: What problems came up and how were they resolved?
5. **Next Steps**: What should be done next to continue progress?
6. **Handoff Context**: Critical information for the next developer/session

**Session Data:**
Files Changed: {filesChanged}
Terminal Activity: {terminalHistory}
Git Changes: {gitDiff}
Active Files: {activeFiles}

**Output Format:** Structured markdown with clear sections for easy scanning.`
    });

    // Bug investigation session template
    this.summaryTemplates.set('debugging', {
      name: 'Debug Session Summary',
      sections: [
        'bug_description',
        'investigation_steps',
        'findings',
        'solution_attempted',
        'outcome',
        'lessons_learned'
      ],
      prompt: `Analyze this debugging session and create a detailed investigation report.

**Debug Analysis Requirements:**
1. **Bug Description**: What was the original issue being investigated?
2. **Investigation Steps**: What debugging approaches were taken?
3. **Findings**: What was discovered during investigation?
4. **Solution Attempted**: What fixes were tried?
5. **Outcome**: Was the bug resolved? Partially resolved? Still investigating?
6. **Lessons Learned**: Key insights for future debugging

**Session Data:**
Error Logs: {errorLogs}
Files Changed: {filesChanged}
Terminal Activity: {terminalHistory}
Test Results: {testResults}

**Output Format:** Technical report with debugging methodology and conclusions.`
    });

    // Feature implementation session template
    this.summaryTemplates.set('feature', {
      name: 'Feature Implementation Summary',
      sections: [
        'feature_specification',
        'implementation_approach',
        'components_created',
        'integration_points',
        'testing_status',
        'deployment_readiness'
      ],
      prompt: `Analyze this feature development session and create an implementation summary.

**Feature Analysis Requirements:**
1. **Feature Specification**: What feature was being built?
2. **Implementation Approach**: What technical approach was chosen?
3. **Components Created**: What new files, functions, or modules were added?
4. **Integration Points**: How does this feature connect to existing code?
5. **Testing Status**: What testing was completed? What's still needed?
6. **Deployment Readiness**: Is the feature ready for production?

**Session Data:**
New Files: {newFiles}
Modified Files: {modifiedFiles}
Terminal Activity: {terminalHistory}
Test Coverage: {testCoverage}

**Output Format:** Product-focused summary with implementation details and status.`
    });
  }

  async generateSessionSummary(projectPath, sessionData = {}) {
    this.logger.info(`📊 Generating session summary for project: ${projectPath}`);

    try {
      // Gather comprehensive session context
      const context = await this.gatherSessionContext(projectPath, sessionData);
      
      // Determine the best template based on session analysis
      const templateType = await this.analyzeSessionType(context);
      
      // Generate summary using Claude Code headless mode
      const summary = await this.generateSummaryWithClaude(context, templateType);
      
      // Save summary to project
      const summaryPath = await this.saveSummary(projectPath, summary, templateType);
      
      // Cache for quick access
      const cacheKey = `${projectPath}_${Date.now()}`;
      this.summaryCache.set(cacheKey, {
        summary,
        template: templateType,
        context,
        generatedAt: new Date().toISOString(),
        path: summaryPath
      });

      this.logger.success(`✅ Session summary generated: ${summaryPath}`);

      return {
        success: true,
        summary,
        summaryPath,
        template: templateType,
        context: {
          filesChanged: context.filesChanged?.length || 0,
          terminalCommands: context.terminalHistory?.split('\n').length || 0,
          timeSpent: context.timeSpent,
          linesAdded: context.gitStats?.insertions || 0,
          linesDeleted: context.gitStats?.deletions || 0
        }
      };

    } catch (error) {
      this.logger.error(`❌ Failed to generate session summary for ${projectPath}:`, error);
      throw error;
    }
  }

  async gatherSessionContext(projectPath, sessionData) {
    this.logger.info('🔍 Gathering comprehensive session context...');

    const context = {
      projectPath,
      timestamp: new Date().toISOString(),
      sessionId: sessionData.sessionId || `session_${Date.now()}`,
      ...sessionData
    };

    try {
      // Gather file changes
      context.filesChanged = await this.getChangedFiles(projectPath);
      context.activeFiles = sessionData.activeFiles || [];
      
      // Get git information
      context.gitDiff = await this.getGitDiff(projectPath);
      context.gitStats = await this.getGitStats(projectPath);
      context.currentBranch = await this.getCurrentBranch(projectPath);
      
      // Terminal history analysis
      context.terminalHistory = sessionData.terminalHistory || '';
      context.errorLogs = this.extractErrorLogs(context.terminalHistory);
      context.commandHistory = this.extractCommands(context.terminalHistory);
      
      // Project metadata
      context.projectInfo = await this.getProjectInfo(projectPath);
      
      // Time analysis
      context.timeSpent = sessionData.timeSpent || this.calculateSessionTime(sessionData);
      
      this.logger.info(`📈 Context gathered: ${context.filesChanged.length} files, ${context.commandHistory.length} commands`);
      
      return context;

    } catch (error) {
      this.logger.error('❌ Failed to gather session context:', error);
      return context; // Return partial context rather than failing
    }
  }

  async analyzeSessionType(context) {
    this.logger.info('🔍 Analyzing session type...');

    try {
      // Use simple heuristics first (fast)
      const errorCount = context.errorLogs?.length || 0;
      const newFiles = context.filesChanged?.filter(f => f.status === 'new').length || 0;
      const modifiedFiles = context.filesChanged?.filter(f => f.status === 'modified').length || 0;
      
      // Debugging session indicators
      if (errorCount > 3 || context.terminalHistory?.includes('debug') || 
          context.terminalHistory?.includes('error') || context.terminalHistory?.includes('fix')) {
        return 'debugging';
      }
      
      // Feature development indicators
      if (newFiles > 0 || (modifiedFiles > 2 && context.gitStats?.insertions > 100)) {
        return 'feature';
      }
      
      // Default to development session
      return 'development';

    } catch (error) {
      this.logger.error('❌ Failed to analyze session type:', error);
      return 'development'; // Safe default
    }
  }

  async generateSummaryWithClaude(context, templateType) {
    this.logger.info(`🤖 Generating ${templateType} summary with Claude Code headless mode...`);

    try {
      const template = this.summaryTemplates.get(templateType);
      if (!template) {
        throw new Error(`Template not found: ${templateType}`);
      }

      // Build the analysis prompt with context
      const prompt = this.buildAnalysisPrompt(template, context);

      // Execute via Claude Code headless mode
      const result = await this.claudeBridge.executeHeadlessCommand({
        command: prompt,
        workDir: context.projectPath,
        sessionId: `summary_${context.sessionId}`,
        timeout: 60000, // 60 seconds for thorough analysis
        outputFormat: 'stream-json'
      });

      // Parse and structure the response
      const summary = this.parseSummaryResponse(result.result, template);

      this.logger.success(`✅ Summary generated with ${summary.sections?.length || 0} sections`);
      
      return summary;

    } catch (error) {
      this.logger.error('❌ Failed to generate summary with Claude:', error);
      
      // Fallback to basic summary
      return this.generateFallbackSummary(context, templateType);
    }
  }

  buildAnalysisPrompt(template, context) {
    let prompt = template.prompt;

    // Replace placeholders with actual context data
    const replacements = {
      filesChanged: this.formatFileChanges(context.filesChanged),
      terminalHistory: this.sanitizeTerminalHistory(context.terminalHistory),
      gitDiff: context.gitDiff ? context.gitDiff.substring(0, 2000) : 'No git changes',
      activeFiles: context.activeFiles?.join(', ') || 'None',
      errorLogs: context.errorLogs?.slice(0, 5).join('\n') || 'No errors',
      newFiles: context.filesChanged?.filter(f => f.status === 'new').map(f => f.path).join(', ') || 'None',
      modifiedFiles: context.filesChanged?.filter(f => f.status === 'modified').map(f => f.path).join(', ') || 'None',
      testResults: 'Test results not available in this session',
      testCoverage: 'Coverage analysis not available'
    };

    for (const [key, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    // Add project context
    prompt += `\n\n**Additional Context:**
- Project: ${context.projectInfo?.name || path.basename(context.projectPath)}
- Session Duration: ${context.timeSpent || 'Unknown'}
- Branch: ${context.currentBranch || 'Unknown'}
- Commands Executed: ${context.commandHistory?.length || 0}
- Files Modified: ${context.filesChanged?.length || 0}

**Analysis Guidelines:**
- Be specific and actionable
- Focus on technical decisions and their implications
- Highlight any architectural patterns or best practices used
- Include clear next steps for continuation
- Make it easy for a new developer to understand and continue the work`;

    return prompt;
  }

  parseSummaryResponse(response, template) {
    try {
      // Try to parse structured response
      if (typeof response === 'string') {
        return {
          type: template.name,
          content: response,
          sections: this.extractSections(response, template.sections),
          generatedAt: new Date().toISOString(),
          template: template.name
        };
      } else if (response.result) {
        return this.parseSummaryResponse(response.result, template);
      } else {
        return {
          type: template.name,
          content: JSON.stringify(response, null, 2),
          sections: [],
          generatedAt: new Date().toISOString(),
          template: template.name
        };
      }
    } catch (error) {
      this.logger.error('❌ Failed to parse summary response:', error);
      return {
        type: template.name,
        content: String(response),
        sections: [],
        generatedAt: new Date().toISOString(),
        template: template.name,
        parseError: error.message
      };
    }
  }

  extractSections(content, expectedSections) {
    const sections = [];
    
    for (const sectionName of expectedSections) {
      // Look for markdown headers or bold text
      const patterns = [
        new RegExp(`##\\s*${sectionName.replace('_', '[\\s_]')}[:\\s]*([\\s\\S]*?)(?=##|$)`, 'i'),
        new RegExp(`\\*\\*${sectionName.replace('_', '[\\s_]')}[:\\s]*\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          sections.push({
            name: sectionName,
            content: match[1].trim()
          });
          break;
        }
      }
    }
    
    return sections;
  }

  async saveSummary(projectPath, summary, templateType) {
    const summariesDir = path.join(projectPath, '.claude', 'summaries');
    await fs.mkdir(summariesDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${templateType}-summary-${timestamp}.md`;
    const summaryPath = path.join(summariesDir, filename);
    
    // Create markdown content
    const markdown = this.formatSummaryAsMarkdown(summary);
    
    await fs.writeFile(summaryPath, markdown, 'utf8');
    
    // Also save as JSON for programmatic access
    const jsonPath = summaryPath.replace('.md', '.json');
    await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2), 'utf8');
    
    return summaryPath;
  }

  formatSummaryAsMarkdown(summary) {
    let markdown = `# ${summary.type}\n\n`;
    markdown += `**Generated**: ${summary.generatedAt}\n`;
    markdown += `**Template**: ${summary.template}\n\n`;
    
    if (summary.sections && summary.sections.length > 0) {
      for (const section of summary.sections) {
        markdown += `## ${section.name.replace('_', ' ').toUpperCase()}\n\n`;
        markdown += `${section.content}\n\n`;
      }
    } else {
      markdown += `## Summary\n\n${summary.content}\n\n`;
    }
    
    return markdown;
  }

  generateFallbackSummary(context, templateType) {
    this.logger.info('⚠️ Generating fallback summary...');
    
    return {
      type: `${templateType} Summary (Fallback)`,
      content: this.createBasicSummary(context),
      sections: [],
      generatedAt: new Date().toISOString(),
      template: templateType,
      isFallback: true
    };
  }

  createBasicSummary(context) {
    let summary = `# Development Session Summary\n\n`;
    summary += `**Project**: ${path.basename(context.projectPath)}\n`;
    summary += `**Date**: ${new Date(context.timestamp).toLocaleDateString()}\n`;
    summary += `**Duration**: ${context.timeSpent || 'Unknown'}\n\n`;
    
    if (context.filesChanged && context.filesChanged.length > 0) {
      summary += `## Files Changed (${context.filesChanged.length})\n\n`;
      for (const file of context.filesChanged.slice(0, 10)) {
        summary += `- ${file.status || 'modified'}: ${file.path}\n`;
      }
      if (context.filesChanged.length > 10) {
        summary += `- ... and ${context.filesChanged.length - 10} more files\n`;
      }
      summary += '\n';
    }
    
    if (context.commandHistory && context.commandHistory.length > 0) {
      summary += `## Key Commands (${context.commandHistory.length})\n\n`;
      for (const cmd of context.commandHistory.slice(0, 5)) {
        summary += `- \`${cmd}\`\n`;
      }
      summary += '\n';
    }
    
    if (context.errorLogs && context.errorLogs.length > 0) {
      summary += `## Issues Encountered (${context.errorLogs.length})\n\n`;
      for (const error of context.errorLogs.slice(0, 3)) {
        summary += `- ${error}\n`;
      }
      summary += '\n';
    }
    
    summary += `## Next Steps\n\n`;
    summary += `- Review changes made in this session\n`;
    summary += `- Continue development where left off\n`;
    summary += `- Consider running tests if files were modified\n`;
    
    return summary;
  }

  // Utility methods for context gathering
  async getChangedFiles(projectPath) {
    try {
      const result = await this.claudeBridge.executeSimpleCommand(
        'git status --porcelain',
        projectPath,
        'file_status'
      );
      
      if (result.success && result.result) {
        return result.result.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const status = line.substring(0, 2).trim();
            const path = line.substring(3);
            return {
              path,
              status: this.mapGitStatus(status)
            };
          });
      }
      return [];
    } catch (error) {
      this.logger.warn('Failed to get changed files:', error);
      return [];
    }
  }

  async getGitDiff(projectPath) {
    try {
      const result = await this.claudeBridge.executeSimpleCommand(
        'git diff HEAD~1..HEAD --no-color',
        projectPath,
        'git_diff'
      );
      return result.success ? result.result : '';
    } catch (error) {
      return '';
    }
  }

  async getGitStats(projectPath) {
    try {
      const result = await this.claudeBridge.executeSimpleCommand(
        'git diff --stat HEAD~1..HEAD',
        projectPath,
        'git_stats'
      );
      
      if (result.success && result.result) {
        const lines = result.result.split('\n');
        const statsLine = lines.find(line => line.includes('insertions') || line.includes('deletions'));
        if (statsLine) {
          const insertions = (statsLine.match(/(\d+) insertions?/) || [0, 0])[1];
          const deletions = (statsLine.match(/(\d+) deletions?/) || [0, 0])[1];
          return { insertions: parseInt(insertions), deletions: parseInt(deletions) };
        }
      }
      return { insertions: 0, deletions: 0 };
    } catch (error) {
      return { insertions: 0, deletions: 0 };
    }
  }

  async getCurrentBranch(projectPath) {
    try {
      const result = await this.claudeBridge.executeSimpleCommand(
        'git rev-parse --abbrev-ref HEAD',
        projectPath,
        'current_branch'
      );
      return result.success ? result.result.trim() : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  async getProjectInfo(projectPath) {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description
      };
    } catch (error) {
      return {
        name: path.basename(projectPath),
        version: 'unknown',
        description: 'No description available'
      };
    }
  }

  extractErrorLogs(terminalHistory) {
    if (!terminalHistory) return [];
    
    const errorPatterns = [
      /error:/i,
      /exception:/i,
      /failed/i,
      /cannot/i,
      /command not found/i
    ];
    
    return terminalHistory.split('\n')
      .filter(line => errorPatterns.some(pattern => pattern.test(line)))
      .slice(0, 10); // Limit to 10 errors
  }

  extractCommands(terminalHistory) {
    if (!terminalHistory) return [];
    
    // Look for command prompts and extract commands
    const lines = terminalHistory.split('\n');
    const commands = [];
    
    for (const line of lines) {
      // Match common prompt patterns
      const match = line.match(/[\$%>]\s*(.+)/);
      if (match && match[1] && !match[1].startsWith('echo')) {
        commands.push(match[1].trim());
      }
    }
    
    return [...new Set(commands)].slice(0, 20); // Unique commands, limited to 20
  }

  calculateSessionTime(sessionData) {
    if (sessionData.startTime && sessionData.endTime) {
      const start = new Date(sessionData.startTime);
      const end = new Date(sessionData.endTime);
      const minutes = Math.round((end - start) / (1000 * 60));
      return `${minutes} minutes`;
    }
    return 'Unknown duration';
  }

  mapGitStatus(status) {
    const statusMap = {
      'A': 'new',
      'M': 'modified',
      'D': 'deleted',
      'R': 'renamed',
      'C': 'copied',
      '??': 'untracked'
    };
    return statusMap[status] || 'modified';
  }

  formatFileChanges(filesChanged) {
    if (!filesChanged || filesChanged.length === 0) {
      return 'No files changed in this session';
    }
    
    return filesChanged.slice(0, 10).map(file => 
      `${file.status}: ${file.path}`
    ).join('\n') + (filesChanged.length > 10 ? `\n... and ${filesChanged.length - 10} more files` : '');
  }

  sanitizeTerminalHistory(history) {
    if (!history) return 'No terminal activity recorded';
    
    // Remove potential sensitive information and limit length
    return history
      .replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*\S+/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*\S+/gi, 'key: [REDACTED]')
      .substring(0, 3000); // Limit to 3000 characters
  }

  // Public API methods
  async listSessionSummaries(projectPath) {
    try {
      const summariesDir = path.join(projectPath, '.claude', 'summaries');
      const files = await fs.readdir(summariesDir);
      
      const summaries = [];
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(summariesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const summary = JSON.parse(content);
          summaries.push({
            filename: file,
            path: filePath,
            generatedAt: summary.generatedAt,
            type: summary.type,
            template: summary.template,
            isFallback: summary.isFallback || false
          });
        } catch (error) {
          this.logger.warn(`Failed to parse summary file ${file}:`, error);
        }
      }
      
      return summaries.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    } catch (error) {
      this.logger.error('Failed to list session summaries:', error);
      return [];
    }
  }

  async getSummary(projectPath, filename) {
    try {
      const summaryPath = path.join(projectPath, '.claude', 'summaries', filename);
      const content = await fs.readFile(summaryPath, 'utf8');
      
      if (filename.endsWith('.json')) {
        return JSON.parse(content);
      } else {
        return { content, type: 'markdown' };
      }
    } catch (error) {
      this.logger.error(`Failed to get summary ${filename}:`, error);
      throw error;
    }
  }

  async deleteSummary(projectPath, filename) {
    try {
      const summaryPath = path.join(projectPath, '.claude', 'summaries', filename);
      await fs.unlink(summaryPath);
      
      // Also delete corresponding markdown/json file
      const alternateExt = filename.endsWith('.json') ? '.md' : '.json';
      const alternatePath = summaryPath.replace(/\.(json|md)$/, alternateExt);
      
      try {
        await fs.unlink(alternatePath);
      } catch (error) {
        // Alternate file might not exist, that's okay
      }
      
      this.logger.success(`✅ Deleted summary: ${filename}`);
      return { success: true, filename };
    } catch (error) {
      this.logger.error(`Failed to delete summary ${filename}:`, error);
      throw error;
    }
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up Session Summary Service...');
    
    this.summaryCache.clear();
    this.summaryTemplates.clear();
    
    this.logger.info('✅ Session Summary Service cleanup complete');
  }
}

module.exports = { SessionSummaryService };