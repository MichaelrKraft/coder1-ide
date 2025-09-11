/**
 * Session Enhancement Service
 * Improves session naming, deduplication, and context
 */

import { v4 as uuidv4 } from 'uuid';

export interface EnhancedSession {
  id: string;
  title: string;
  projectName: string;
  description: string;
  startTime: Date;
  lastActivity: Date;
  duration: string;
  stats: {
    checkpoints: number;
    interactions: number;
    filesModified: number;
    linesChanged: number;
  };
  tags: string[];
  primaryLanguage?: string;
  keyActivities: string[];
}

export class SessionEnhancementService {
  private static instance: SessionEnhancementService;
  
  private constructor() {}
  
  static getInstance(): SessionEnhancementService {
    if (!SessionEnhancementService.instance) {
      SessionEnhancementService.instance = new SessionEnhancementService();
    }
    return SessionEnhancementService.instance;
  }

  /**
   * Generate intelligent session title based on activity
   */
  generateSessionTitle(sessionData: any): string {
    const activities = this.extractActivities(sessionData);
    
    // Priority-based title generation
    if (activities.includes('bug-fix')) {
      return `🐛 Bug Fix: ${this.extractBugContext(sessionData)}`;
    }
    
    if (activities.includes('feature')) {
      return `✨ Feature: ${this.extractFeatureName(sessionData)}`;
    }
    
    if (activities.includes('refactor')) {
      return `♻️ Refactor: ${this.extractRefactorTarget(sessionData)}`;
    }
    
    if (activities.includes('setup')) {
      return `🔧 Setup: ${this.extractSetupType(sessionData)}`;
    }
    
    if (activities.includes('documentation')) {
      return `📚 Docs: ${this.extractDocTarget(sessionData)}`;
    }
    
    // Fallback to file-based naming
    const primaryFile = this.extractPrimaryFile(sessionData);
    if (primaryFile) {
      return `📝 Working on ${primaryFile}`;
    }
    
    // Final fallback with time
    const timeOfDay = this.getTimeOfDay(sessionData.startTime);
    return `💻 ${timeOfDay} Coding Session`;
  }

  /**
   * Extract meaningful project name from context
   */
  extractProjectName(sessionData: any): string {
    // Check for package.json or project files
    if (sessionData.files?.includes('package.json')) {
      // Try to extract from package name
      return this.extractFromPackageJson(sessionData) || 'Node.js Project';
    }
    
    // Check for specific framework indicators
    if (sessionData.files?.some((f: string) => f.includes('next.config'))) {
      return 'Next.js App';
    }
    
    if (sessionData.files?.some((f: string) => f.includes('.tsx'))) {
      return 'React TypeScript Project';
    }
    
    // Extract from directory structure
    const workingDir = sessionData.workingDirectory;
    if (workingDir) {
      const parts = workingDir.split('/');
      return parts[parts.length - 1] || 'Unnamed Project';
    }
    
    return 'Development Project';
  }

  /**
   * Generate session description from activities
   */
  generateDescription(sessionData: any): string {
    const activities = [];
    
    // Analyze terminal commands
    if (sessionData.terminalHistory) {
      if (sessionData.terminalHistory.includes('npm install')) {
        activities.push('installed dependencies');
      }
      if (sessionData.terminalHistory.includes('git commit')) {
        activities.push('committed changes');
      }
      if (sessionData.terminalHistory.includes('npm test')) {
        activities.push('ran tests');
      }
    }
    
    // Analyze file modifications
    const fileCount = sessionData.filesModified?.length || 0;
    if (fileCount > 0) {
      activities.push(`modified ${fileCount} file${fileCount !== 1 ? 's' : ''}`);
    }
    
    // Analyze Claude interactions
    const interactions = sessionData.claudeInteractions || 0;
    if (interactions > 0) {
      activities.push(`${interactions} Claude conversation${interactions !== 1 ? 's' : ''}`);
    }
    
    if (activities.length === 0) {
      return 'General development session';
    }
    
    return activities.join(', ').charAt(0).toUpperCase() + activities.slice(1).join(', ');
  }

  /**
   * Extract key activities for session summary
   */
  extractKeyActivities(sessionData: any): string[] {
    const activities = new Set<string>();
    
    // Check for common development patterns
    if (sessionData.filesModified?.some((f: string) => f.includes('.test.') || f.includes('.spec.'))) {
      activities.add('Testing');
    }
    
    if (sessionData.filesModified?.some((f: string) => f.includes('README'))) {
      activities.add('Documentation');
    }
    
    if (sessionData.filesModified?.some((f: string) => f.includes('.css') || f.includes('.scss'))) {
      activities.add('Styling');
    }
    
    if (sessionData.filesModified?.some((f: string) => f.includes('api/') || f.includes('routes/'))) {
      activities.add('API Development');
    }
    
    if (sessionData.terminalHistory?.includes('git merge')) {
      activities.add('Merging');
    }
    
    if (sessionData.terminalHistory?.includes('npm run build')) {
      activities.add('Building');
    }
    
    return Array.from(activities);
  }

  /**
   * Deduplicate sessions based on timestamp and content
   */
  deduplicateSessions(sessions: any[]): any[] {
    const seen = new Map<string, any>();
    
    for (const session of sessions) {
      // Create unique key based on timestamp and first activity
      const key = `${session.startTime}-${session.firstActivity || 'unknown'}`;
      
      if (!seen.has(key)) {
        seen.set(key, session);
      } else {
        // Merge duplicate session data
        const existing = seen.get(key);
        existing.checkpoints = Math.max(existing.checkpoints || 0, session.checkpoints || 0);
        existing.interactions = (existing.interactions || 0) + (session.interactions || 0);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Format session for display
   */
  formatSessionForDisplay(session: any): EnhancedSession {
    // Generate intelligent title
    const title = session.title || this.generateSessionTitle(session);
    
    // Extract project name
    const projectName = session.projectName || this.extractProjectName(session);
    
    // Generate description
    const description = session.description || this.generateDescription(session);
    
    // Calculate duration
    const duration = this.calculateDuration(session.startTime, session.lastActivity || new Date());
    
    // Extract statistics
    const stats = {
      checkpoints: session.checkpoints || 0,
      interactions: session.claudeInteractions || 0,
      filesModified: session.filesModified?.length || 0,
      linesChanged: session.linesChanged || 0
    };
    
    // Extract tags based on activity
    const tags = this.generateTags(session);
    
    // Detect primary language
    const primaryLanguage = this.detectPrimaryLanguage(session.filesModified || []);
    
    // Extract key activities
    const keyActivities = this.extractKeyActivities(session);
    
    return {
      id: session.id || uuidv4(),
      title,
      projectName,
      description,
      startTime: new Date(session.startTime),
      lastActivity: new Date(session.lastActivity || session.startTime),
      duration,
      stats,
      tags,
      primaryLanguage,
      keyActivities
    };
  }

  // Helper methods
  private extractActivities(sessionData: any): string[] {
    const activities = [];
    
    if (sessionData.terminalHistory?.includes('fix') || sessionData.commitMessages?.includes('fix')) {
      activities.push('bug-fix');
    }
    
    if (sessionData.filesCreated?.length > 0) {
      activities.push('feature');
    }
    
    if (sessionData.terminalHistory?.includes('refactor')) {
      activities.push('refactor');
    }
    
    return activities;
  }

  private extractBugContext(sessionData: any): string {
    // Extract from commit messages or error logs
    const errorMatch = sessionData.errorLogs?.match(/Error: (.+)/);
    if (errorMatch) {
      return errorMatch[1].substring(0, 30);
    }
    return 'Various Issues';
  }

  private extractFeatureName(sessionData: any): string {
    // Extract from newly created files
    const newFile = sessionData.filesCreated?.[0];
    if (newFile) {
      const name = newFile.split('/').pop()?.replace(/\.[^.]+$/, '');
      return name || 'New Component';
    }
    return 'New Feature';
  }

  private extractRefactorTarget(sessionData: any): string {
    const mostModified = this.getMostModifiedFile(sessionData);
    if (mostModified) {
      return mostModified.split('/').pop() || 'Code';
    }
    return 'Code Structure';
  }

  private extractSetupType(sessionData: any): string {
    if (sessionData.terminalHistory?.includes('npm install')) {
      return 'Dependencies';
    }
    if (sessionData.filesCreated?.includes('.env')) {
      return 'Environment';
    }
    return 'Project Configuration';
  }

  private extractDocTarget(sessionData: any): string {
    const docFile = sessionData.filesModified?.find((f: string) => 
      f.includes('README') || f.includes('.md')
    );
    if (docFile) {
      return docFile.split('/').pop() || 'Documentation';
    }
    return 'Project Documentation';
  }

  private extractPrimaryFile(sessionData: any): string {
    const mostModified = this.getMostModifiedFile(sessionData);
    if (mostModified) {
      return mostModified.split('/').pop() || '';
    }
    return '';
  }

  private getMostModifiedFile(sessionData: any): string {
    // This would need actual modification count tracking
    return sessionData.filesModified?.[0] || '';
  }

  private getTimeOfDay(time: Date | string): string {
    const date = new Date(time);
    const hour = date.getHours();
    
    if (hour < 6) return 'Late Night';
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }

  private extractFromPackageJson(sessionData: any): string | null {
    // Would need actual package.json parsing
    return null;
  }

  private calculateDuration(start: Date | string, end: Date | string): string {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private generateTags(session: any): string[] {
    const tags = [];
    
    if (session.filesModified?.length > 10) {
      tags.push('large-change');
    }
    
    if (session.claudeInteractions > 5) {
      tags.push('ai-assisted');
    }
    
    if (session.terminalHistory?.includes('git push')) {
      tags.push('deployed');
    }
    
    if (session.tests?.passed) {
      tags.push('tested');
    }
    
    return tags;
  }

  private detectPrimaryLanguage(files: string[]): string | undefined {
    const extensions = files.map(f => f.split('.').pop());
    const langMap: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'js': 'JavaScript',
      'jsx': 'React',
      'py': 'Python',
      'java': 'Java',
      'css': 'CSS',
      'html': 'HTML'
    };
    
    // Count occurrences
    const counts = new Map<string, number>();
    for (const ext of extensions) {
      if (ext && langMap[ext]) {
        counts.set(langMap[ext], (counts.get(langMap[ext]) || 0) + 1);
      }
    }
    
    // Return most common
    if (counts.size > 0) {
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    return undefined;
  }
}

export const sessionEnhancementService = SessionEnhancementService.getInstance();