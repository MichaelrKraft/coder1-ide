/**
 * Session Types and Utilities for Contextual Sessions Enhancement
 * 
 * This module provides the foundation for contextual, purpose-driven sessions
 * that replace generic session creation with intelligent, organized workflows.
 */

export interface SessionType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  defaultNamePattern: string;
}

export interface SessionContext {
  gitBranch?: string;
  workingDirectory: string;
  recentFiles: string[];
  terminalCommands: string[];
  lastActivity: string;
  sessionNotes?: string;
}

export interface EnhancedSessionMetadata {
  sessionType: string;
  context: SessionContext;
  tags: string[];
  parentSessions?: string[];
  childSessions?: string[];
  progress: {
    status: 'planning' | 'in-progress' | 'testing' | 'completed' | 'paused';
    completionPercentage: number;
    milestones: string[];
  };
}

/**
 * Predefined session types with visual and functional characteristics
 */
export const SESSION_TYPES: Record<string, SessionType> = {
  feature: {
    id: 'feature',
    name: 'Feature Development',
    emoji: '🚀',
    description: 'Building new features and functionality',
    color: '#10b981', // emerald-500
    defaultNamePattern: '{emoji} {date} - {suggestion} Feature'
  },
  bugfix: {
    id: 'bugfix',
    name: 'Bug Fix',
    emoji: '🐛',
    description: 'Fixing bugs and resolving issues',
    color: '#ef4444', // red-500
    defaultNamePattern: '{emoji} {date} - Fix {suggestion}'
  },
  experiment: {
    id: 'experiment',
    name: 'Experiment',
    emoji: '🔬',
    description: 'Testing ideas and exploring solutions',
    color: '#8b5cf6', // violet-500
    defaultNamePattern: '{emoji} {date} - {suggestion} Experiment'
  },
  review: {
    id: 'review',
    name: 'Code Review',
    emoji: '📋',
    description: 'Reviewing code and providing feedback',
    color: '#06b6d4', // cyan-500
    defaultNamePattern: '{emoji} {date} - Review {suggestion}'
  },
  refactor: {
    id: 'refactor',
    name: 'Refactor',
    emoji: '🧹',
    description: 'Improving code structure and organization',
    color: '#f59e0b', // amber-500
    defaultNamePattern: '{emoji} {date} - Refactor {suggestion}'
  },
  learning: {
    id: 'learning',
    name: 'Learning/Research',
    emoji: '📚',
    description: 'Learning new concepts and researching solutions',
    color: '#3b82f6', // blue-500
    defaultNamePattern: '{emoji} {date} - Learn {suggestion}'
  }
};

/**
 * Get all available session types as an array
 */
export const getSessionTypes = (): SessionType[] => {
  return Object.values(SESSION_TYPES);
};

/**
 * Get session type by ID with fallback
 */
export const getSessionTypeById = (id: string): SessionType => {
  return SESSION_TYPES[id] || SESSION_TYPES.feature;
};

/**
 * Generate formatted date string for session names
 */
export const formatSessionDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

/**
 * Session name generation utilities
 */
export interface NameSuggestionContext {
  gitBranch?: string;
  recentCommits?: string[];
  modifiedFiles?: string[];
  workingDirectory?: string;
}

/**
 * Generate intelligent session name suggestions based on current context
 */
export const generateSessionNameSuggestions = (
  sessionType: SessionType,
  context: NameSuggestionContext
): string[] => {
  const suggestions: string[] = [];
  const date = formatSessionDate();
  
  // Git branch-based suggestions
  if (context.gitBranch && context.gitBranch !== 'main' && context.gitBranch !== 'master') {
    const branchName = context.gitBranch
      .replace(/^(feature|bugfix|fix|chore|docs|style|refactor|test)\//, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    
    suggestions.push(
      sessionType.defaultNamePattern
        .replace('{emoji}', sessionType.emoji)
        .replace('{date}', date)
        .replace('{suggestion}', branchName)
    );
  }
  
  // Recent commit-based suggestions
  if (context.recentCommits && context.recentCommits.length > 0) {
    const recentCommit = context.recentCommits[0];
    const commitMessage = recentCommit
      .replace(/^(feat|fix|docs|style|refactor|test|chore):\s*/i, '')
      .replace(/\b\w/g, char => char.toUpperCase())
      .substring(0, 50);
    
    if (commitMessage.length > 3) {
      suggestions.push(
        sessionType.defaultNamePattern
          .replace('{emoji}', sessionType.emoji)
          .replace('{date}', date)
          .replace('{suggestion}', commitMessage)
      );
    }
  }
  
  // Modified files-based suggestions
  if (context.modifiedFiles && context.modifiedFiles.length > 0) {
    const primaryFile = context.modifiedFiles[0];
    const fileName = primaryFile.split('/').pop()?.replace(/\.(ts|tsx|js|jsx|py|java|cpp|c|go|rs)$/, '');
    
    if (fileName) {
      const formattedFileName = fileName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
      
      suggestions.push(
        sessionType.defaultNamePattern
          .replace('{emoji}', sessionType.emoji)
          .replace('{date}', date)
          .replace('{suggestion}', formattedFileName)
      );
    }
  }
  
  // Default suggestions if no context available
  if (suggestions.length === 0) {
    suggestions.push(
      sessionType.defaultNamePattern
        .replace('{emoji}', sessionType.emoji)
        .replace('{date}', date)
        .replace('{suggestion}', sessionType.name)
    );
  }
  
  // Remove duplicates and limit to 3 suggestions
  return [...new Set(suggestions)].slice(0, 3);
};

/**
 * Validate session metadata structure
 */
export const validateSessionMetadata = (metadata: any): metadata is EnhancedSessionMetadata => {
  return (
    metadata &&
    typeof metadata.sessionType === 'string' &&
    SESSION_TYPES[metadata.sessionType] &&
    metadata.context &&
    typeof metadata.context.workingDirectory === 'string'
  );
};

/**
 * Create default enhanced metadata for a session
 */
export const createDefaultSessionMetadata = (
  sessionType: string,
  context: Partial<SessionContext> = {}
): EnhancedSessionMetadata => {
  return {
    sessionType,
    context: {
      workingDirectory: process.cwd(),
      recentFiles: [],
      terminalCommands: [],
      lastActivity: new Date().toISOString(),
      ...context
    },
    tags: [],
    progress: {
      status: 'planning',
      completionPercentage: 0,
      milestones: []
    }
  };
};