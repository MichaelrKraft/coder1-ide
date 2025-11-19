/**
 * Session Rescue - Recovery Utilities
 * 
 * Helper functions for calculating recovery health scores, validating
 * checkpoint data, and determining if a checkpoint is recoverable.
 * 
 * Integrates with existing checkpoint system rather than creating separate recovery mechanism.
 */

export interface RecoveryHealthScore {
  overall: number; // 0-100
  filesVerified: number; // 0-40 points
  terminalComplete: number; // 0-20 points
  claudeContext: number; // 0-20 points
  gitSync: number; // 0-10 points
  recency: number; // 0-10 points
  warnings: string[];
}

export interface CheckpointMetadata {
  id: string;
  sessionId: string;
  timestamp: number;
  name?: string;
  description?: string;
  openFiles?: string[];
  terminalHistory?: string;
  claudeContext?: any;
  gitBranch?: string;
  checkpointType?: 'manual' | 'auto' | 'recovery';
}

/**
 * Calculate recovery health score for a checkpoint
 * Determines how confident we are that the checkpoint can be fully restored
 */
export function calculateRecoveryScore(
  checkpoint: CheckpointMetadata,
  currentGitBranch?: string
): RecoveryHealthScore {
  const score: RecoveryHealthScore = {
    overall: 0,
    filesVerified: 0,
    terminalComplete: 0,
    claudeContext: 0,
    gitSync: 0,
    recency: 0,
    warnings: [],
  };

  // 1. File verification (40 points)
  if (checkpoint.openFiles && checkpoint.openFiles.length > 0) {
    score.filesVerified = 40;
    
    // Bonus for unsaved work indicator
    const hasUnsavedWork = checkpoint.openFiles.some(f => 
      f.includes('*') || f.includes('unsaved')
    );
    if (hasUnsavedWork) {
      score.filesVerified += 5; // Bonus 5 points for saving unsaved work
    }
  } else {
    score.warnings.push('No open files found');
  }

  // 2. Terminal history completeness (20 points)
  if (checkpoint.terminalHistory) {
    const historyLength = checkpoint.terminalHistory.length;
    if (historyLength > 1000) {
      score.terminalComplete = 20; // Full history
    } else if (historyLength > 100) {
      score.terminalComplete = 10; // Partial history
    } else {
      score.terminalComplete = 5; // Minimal history
      score.warnings.push('Terminal history is very short');
    }
  } else {
    score.warnings.push('No terminal history found');
  }

  // 3. Claude conversation context (20 points)
  if (checkpoint.claudeContext) {
    const hasMessages = checkpoint.claudeContext.messages?.length > 0;
    const hasActiveTask = checkpoint.claudeContext.activeTask !== undefined;
    
    if (hasMessages && hasActiveTask) {
      score.claudeContext = 20; // Full context
    } else if (hasMessages || hasActiveTask) {
      score.claudeContext = 10; // Partial context
    }
  } else {
    score.warnings.push('No Claude conversation context');
  }

  // 4. Git state synchronization (10 points)
  if (checkpoint.gitBranch) {
    if (currentGitBranch && checkpoint.gitBranch === currentGitBranch) {
      score.gitSync = 10; // Same branch
    } else if (currentGitBranch) {
      score.gitSync = 5; // Different branch
      score.warnings.push(`Git branch changed: was '${checkpoint.gitBranch}', now '${currentGitBranch}'`);
    }
  }

  // 5. Recency score (10 points) - fresher checkpoints are more reliable
  const ageMs = Date.now() - checkpoint.timestamp;
  const ageMinutes = ageMs / (1000 * 60);
  
  if (ageMinutes < 30) {
    score.recency = 10; // Very recent (< 30 min)
  } else if (ageMinutes < 120) {
    score.recency = 8; // Recent (< 2 hours)
  } else if (ageMinutes < 480) {
    score.recency = 5; // Somewhat recent (< 8 hours)
  } else if (ageMinutes < 1440) {
    score.recency = 2; // Today (< 24 hours)
  } else {
    score.recency = 0; // Old (> 24 hours)
    const daysAgo = Math.floor(ageMinutes / 1440);
    score.warnings.push(`Checkpoint is ${daysAgo} day(s) old`);
  }

  // Calculate overall score
  score.overall = Math.min(100, 
    score.filesVerified + 
    score.terminalComplete + 
    score.claudeContext + 
    score.gitSync + 
    score.recency
  );

  return score;
}

/**
 * Determine if a checkpoint is recoverable
 * Based on age, score, and critical requirements
 */
export function isCheckpointRecoverable(
  checkpoint: CheckpointMetadata,
  maxAgeHours: number = 24
): boolean {
  const ageMs = Date.now() - checkpoint.timestamp;
  const ageHours = ageMs / (1000 * 60 * 60);
  
  // Too old?
  if (ageHours > maxAgeHours) {
    return false;
  }
  
  // Calculate score
  const score = calculateRecoveryScore(checkpoint);
  
  // Minimum threshold: 60/100 points
  // This ensures we have at least some meaningful state to restore
  return score.overall >= 60;
}

/**
 * Format recovery time for display
 */
export function formatRecoveryAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = ageMs / (1000 * 60);
  
  if (ageMinutes < 1) {
    return 'just now';
  } else if (ageMinutes < 60) {
    const mins = Math.floor(ageMinutes);
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  } else if (ageMinutes < 1440) {
    const hours = Math.floor(ageMinutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    const days = Math.floor(ageMinutes / 1440);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
}

/**
 * Get recovery confidence label based on score
 */
export function getConfidenceLabel(score: number): {
  label: string;
  color: 'success' | 'warning' | 'danger';
} {
  if (score >= 90) {
    return { label: 'Excellent', color: 'success' };
  } else if (score >= 75) {
    return { label: 'Very Good', color: 'success' };
  } else if (score >= 60) {
    return { label: 'Good', color: 'warning' };
  } else {
    return { label: 'Fair', color: 'danger' };
  }
}

/**
 * Validate checkpoint data structure
 * Ensures checkpoint has minimum required fields for recovery
 */
export function validateCheckpointStructure(checkpoint: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!checkpoint) {
    errors.push('Checkpoint is null or undefined');
    return { valid: false, errors };
  }
  
  if (!checkpoint.id) {
    errors.push('Missing checkpoint ID');
  }
  
  if (!checkpoint.sessionId) {
    errors.push('Missing session ID');
  }
  
  if (!checkpoint.timestamp || typeof checkpoint.timestamp !== 'number') {
    errors.push('Missing or invalid timestamp');
  }
  
  // At least ONE of these must exist for meaningful recovery
  const hasContent = 
    (checkpoint.openFiles && checkpoint.openFiles.length > 0) ||
    (checkpoint.terminalHistory && checkpoint.terminalHistory.length > 0) ||
    checkpoint.claudeContext;
    
  if (!hasContent) {
    errors.push('Checkpoint has no recoverable content (no files, terminal, or context)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
