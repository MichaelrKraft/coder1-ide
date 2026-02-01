import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

import { ProjectData, GitStatus, TaskStatus } from './ProjectScanner.js';

// ============ TYPES ============

export interface HealthBreakdown {
  gitActivity: {
    score: number;
    weight: number;
    details: {
      commitsThisWeek: number;
      branchFreshness: 'fresh' | 'stale' | 'very-stale';
      uncommittedChanges: number;
      syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged';
    };
  };
  taskCompletion: {
    score: number;
    weight: number;
    details: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      completionRate: number;
    };
  };
  buildHealth: {
    score: number;
    weight: number;
    details: {
      hasPackageJson: boolean;
      hasLockFile: boolean;
      hasTestScript: boolean;
      hasBuildScript: boolean;
      errorLogsFound: boolean;
      lastBuildStatus: 'unknown' | 'success' | 'failed';
    };
  };
  documentation: {
    score: number;
    weight: number;
    details: {
      hasReadme: boolean;
      readmeLength: number;
      hasClaudeMd: boolean;
      hasContributing: boolean;
      lastDocUpdate: Date | null;
    };
  };
}

export interface ProjectHealthResult {
  projectName: string;
  projectPath: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: HealthBreakdown;
  recommendations: string[];
  calculatedAt: number;
}

// ============ HEALTH CALCULATOR ============

export function calculateHealth(project: ProjectData): ProjectHealthResult {
  const breakdown: HealthBreakdown = {
    gitActivity: calculateGitActivityScore(project),
    taskCompletion: calculateTaskCompletionScore(project),
    buildHealth: calculateBuildHealthScore(project),
    documentation: calculateDocumentationScore(project),
  };

  // Calculate weighted overall score
  const overallScore = Math.round(
    breakdown.gitActivity.score * breakdown.gitActivity.weight +
    breakdown.taskCompletion.score * breakdown.taskCompletion.weight +
    breakdown.buildHealth.score * breakdown.buildHealth.weight +
    breakdown.documentation.score * breakdown.documentation.weight
  );

  // Determine grade
  const grade = scoreToGrade(overallScore);

  // Generate recommendations
  const recommendations = generateRecommendations(breakdown, project);

  return {
    projectName: project.config.name,
    projectPath: project.config.path,
    overallScore,
    grade,
    breakdown,
    recommendations,
    calculatedAt: Date.now(),
  };
}

// ============ SCORE CALCULATORS ============

function calculateGitActivityScore(project: ProjectData): HealthBreakdown['gitActivity'] {
  const weight = 0.25;
  let score = 0;

  const details = {
    commitsThisWeek: 0,
    branchFreshness: 'very-stale' as 'fresh' | 'stale' | 'very-stale',
    uncommittedChanges: 0,
    syncStatus: 'synced' as 'synced' | 'ahead' | 'behind' | 'diverged',
  };

  if (!project.git) {
    // No git - give partial score for existing project
    if (project.exists) {
      score = 25; // Some credit for existing but not version controlled
    }
    return { score, weight, details };
  }

  const git: GitStatus = project.git;
  details.uncommittedChanges = git.uncommittedChanges;

  // Branch freshness (40 points max)
  if (git.lastCommitDate) {
    const daysSinceCommit = (Date.now() - git.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCommit <= 1) {
      score += 40;
      details.branchFreshness = 'fresh';
      details.commitsThisWeek = 7; // Estimate
    } else if (daysSinceCommit <= 7) {
      score += 30;
      details.branchFreshness = 'fresh';
      details.commitsThisWeek = Math.round(7 / daysSinceCommit);
    } else if (daysSinceCommit <= 30) {
      score += 15;
      details.branchFreshness = 'stale';
      details.commitsThisWeek = 0;
    } else {
      score += 5;
      details.branchFreshness = 'very-stale';
      details.commitsThisWeek = 0;
    }
  }

  // Uncommitted changes (30 points max)
  if (git.uncommittedChanges === 0) {
    score += 30;
  } else if (git.uncommittedChanges <= 5) {
    score += 25;
  } else if (git.uncommittedChanges <= 15) {
    score += 15;
  } else if (git.uncommittedChanges <= 30) {
    score += 5;
  }
  // More than 30 uncommitted changes = 0 points

  // Sync status (30 points max)
  if (git.isAhead === 0 && git.isBehind === 0) {
    score += 30;
    details.syncStatus = 'synced';
  } else if (git.isAhead > 0 && git.isBehind === 0) {
    score += 20;
    details.syncStatus = 'ahead';
  } else if (git.isBehind > 0 && git.isAhead === 0) {
    score += 10;
    details.syncStatus = 'behind';
  } else {
    score += 5;
    details.syncStatus = 'diverged';
  }

  return { score: Math.min(100, score), weight, details };
}

function calculateTaskCompletionScore(project: ProjectData): HealthBreakdown['taskCompletion'] {
  const weight = 0.25;
  const tasks: TaskStatus = project.tasks;

  const details = {
    totalTasks: tasks.totalTasks,
    completedTasks: tasks.completedTasks,
    pendingTasks: tasks.pendingTasks,
    completionRate: 0,
  };

  // If no tasks, give a neutral score (no penalty, no bonus)
  if (tasks.totalTasks === 0) {
    return { score: 70, weight, details };
  }

  // Calculate completion rate
  details.completionRate = (tasks.completedTasks / tasks.totalTasks) * 100;

  // Score based on completion rate
  let score: number;
  if (details.completionRate >= 90) {
    score = 100;
  } else if (details.completionRate >= 75) {
    score = 85;
  } else if (details.completionRate >= 50) {
    score = 70;
  } else if (details.completionRate >= 25) {
    score = 50;
  } else {
    score = 30;
  }

  // Bonus/penalty based on absolute numbers
  if (tasks.pendingTasks > 100) {
    score -= 20; // Too many pending tasks
  } else if (tasks.pendingTasks > 50) {
    score -= 10;
  }

  if (tasks.completedTasks > 20) {
    score += 5; // Bonus for getting things done
  }

  return { score: Math.max(0, Math.min(100, score)), weight, details };
}

function calculateBuildHealthScore(project: ProjectData): HealthBreakdown['buildHealth'] {
  const weight = 0.25;
  let score = 0;

  const details = {
    hasPackageJson: false,
    hasLockFile: false,
    hasTestScript: false,
    hasBuildScript: false,
    errorLogsFound: false,
    lastBuildStatus: 'unknown' as 'unknown' | 'success' | 'failed',
  };

  if (!project.exists) {
    return { score: 0, weight, details };
  }

  const projectPath = project.config.path;

  // Check for package.json (25 points)
  if (project.package) {
    details.hasPackageJson = true;
    score += 25;

    // Check for test script (15 points)
    if (project.package.scripts['test'] && !project.package.scripts['test'].includes('no test specified')) {
      details.hasTestScript = true;
      score += 15;
    }

    // Check for build script (15 points)
    if (project.package.scripts['build']) {
      details.hasBuildScript = true;
      score += 15;
    }
  }

  // Check for lock file (15 points)
  if (existsSync(join(projectPath, 'package-lock.json')) ||
      existsSync(join(projectPath, 'yarn.lock')) ||
      existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
    details.hasLockFile = true;
    score += 15;
  }

  // Check for error logs (negative points)
  const errorLogsFound = checkForErrorLogs(projectPath);
  details.errorLogsFound = errorLogsFound;
  if (errorLogsFound) {
    score -= 10;
  } else {
    score += 10; // Bonus for clean state
  }

  // Check for recent build success (20 points)
  const buildStatus = checkBuildStatus(projectPath);
  details.lastBuildStatus = buildStatus;
  if (buildStatus === 'success') {
    score += 20;
  } else if (buildStatus === 'failed') {
    score -= 10;
  } else {
    score += 5; // Unknown is neutral-ish
  }

  return { score: Math.max(0, Math.min(100, score)), weight, details };
}

function calculateDocumentationScore(project: ProjectData): HealthBreakdown['documentation'] {
  const weight = 0.25;
  let score = 0;

  const details = {
    hasReadme: false,
    readmeLength: 0,
    hasClaudeMd: false,
    hasContributing: false,
    lastDocUpdate: null as Date | null,
  };

  if (!project.exists) {
    return { score: 0, weight, details };
  }

  const projectPath = project.config.path;

  // Check for README (40 points max)
  const readmePath = findReadme(projectPath);
  if (readmePath) {
    details.hasReadme = true;
    try {
      const content = readFileSync(readmePath, 'utf-8');
      details.readmeLength = content.length;
      const stat = statSync(readmePath);
      details.lastDocUpdate = stat.mtime;

      // Score based on README length
      if (content.length > 5000) {
        score += 40; // Comprehensive
      } else if (content.length > 2000) {
        score += 35;
      } else if (content.length > 500) {
        score += 25;
      } else if (content.length > 100) {
        score += 15;
      } else {
        score += 5; // Exists but minimal
      }
    } catch {
      score += 10; // Exists but couldn't read
    }
  }

  // Check for CLAUDE.md (30 points)
  if (existsSync(join(projectPath, 'CLAUDE.md'))) {
    details.hasClaudeMd = true;
    score += 30;
  }

  // Check for CONTRIBUTING.md (15 points)
  if (existsSync(join(projectPath, 'CONTRIBUTING.md'))) {
    details.hasContributing = true;
    score += 15;
  }

  // Freshness bonus (15 points max)
  if (details.lastDocUpdate) {
    const daysSinceUpdate = (Date.now() - details.lastDocUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 30) {
      score += 15;
    } else if (daysSinceUpdate <= 90) {
      score += 10;
    } else if (daysSinceUpdate <= 180) {
      score += 5;
    }
  }

  return { score: Math.min(100, score), weight, details };
}

// ============ HELPER FUNCTIONS ============

function checkForErrorLogs(projectPath: string): boolean {
  const errorPatterns = [
    'npm-debug.log',
    'yarn-error.log',
    'error.log',
    '.next/error.log',
  ];

  for (const pattern of errorPatterns) {
    if (existsSync(join(projectPath, pattern))) {
      return true;
    }
  }

  return false;
}

function checkBuildStatus(projectPath: string): 'unknown' | 'success' | 'failed' {
  // Check for Next.js build
  const nextBuild = join(projectPath, '.next', 'BUILD_ID');
  if (existsSync(nextBuild)) {
    return 'success';
  }

  // Check for dist/build folder
  if (existsSync(join(projectPath, 'dist')) || existsSync(join(projectPath, 'build'))) {
    // Check if there are any .js files in dist
    try {
      const distPath = existsSync(join(projectPath, 'dist')) ? join(projectPath, 'dist') : join(projectPath, 'build');
      const files = readdirSync(distPath);
      if (files.some(f => f.endsWith('.js'))) {
        return 'success';
      }
    } catch {
      // Couldn't read directory
    }
  }

  return 'unknown';
}

function findReadme(projectPath: string): string | null {
  const variants = [
    'README.md',
    'readme.md',
    'Readme.md',
    'README.MD',
    'README',
    'readme',
  ];

  for (const variant of variants) {
    const path = join(projectPath, variant);
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function generateRecommendations(breakdown: HealthBreakdown, _project: ProjectData): string[] {
  const recommendations: string[] = [];

  // Git recommendations
  if (breakdown.gitActivity.details.uncommittedChanges > 10) {
    recommendations.push(`Commit pending changes (${breakdown.gitActivity.details.uncommittedChanges} files modified)`);
  }
  if (breakdown.gitActivity.details.syncStatus === 'behind') {
    recommendations.push('Pull latest changes from remote');
  }
  if (breakdown.gitActivity.details.syncStatus === 'ahead') {
    recommendations.push('Push local commits to remote');
  }
  if (breakdown.gitActivity.details.branchFreshness === 'very-stale') {
    recommendations.push('Resume development - no commits in over 30 days');
  }

  // Task recommendations
  if (breakdown.taskCompletion.details.pendingTasks > 30) {
    recommendations.push(`Review and prioritize ${breakdown.taskCompletion.details.pendingTasks} pending tasks`);
  }
  if (breakdown.taskCompletion.details.completionRate < 50 && breakdown.taskCompletion.details.totalTasks > 5) {
    recommendations.push('Focus on completing existing tasks before adding new ones');
  }

  // Build recommendations
  if (!breakdown.buildHealth.details.hasTestScript) {
    recommendations.push('Add test script to package.json');
  }
  if (!breakdown.buildHealth.details.hasLockFile) {
    recommendations.push('Commit package-lock.json for reproducible builds');
  }
  if (breakdown.buildHealth.details.errorLogsFound) {
    recommendations.push('Clean up error log files');
  }

  // Documentation recommendations
  if (!breakdown.documentation.details.hasReadme) {
    recommendations.push('Add a README.md file');
  } else if (breakdown.documentation.details.readmeLength < 500) {
    recommendations.push('Expand README with more documentation');
  }
  if (!breakdown.documentation.details.hasClaudeMd) {
    recommendations.push('Add CLAUDE.md for AI assistant context');
  }

  return recommendations.slice(0, 5); // Limit to top 5
}

// ============ UTILITY EXPORTS ============

export function formatHealthReport(result: ProjectHealthResult): string {
  const lines: string[] = [];

  lines.push(`# ${result.projectName} Health Report`);
  lines.push(`Grade: ${result.grade} (${result.overallScore}/100)`);
  lines.push('');
  lines.push('## Breakdown');
  lines.push(`- Git Activity: ${result.breakdown.gitActivity.score}/100`);
  lines.push(`- Task Completion: ${result.breakdown.taskCompletion.score}/100`);
  lines.push(`- Build Health: ${result.breakdown.buildHealth.score}/100`);
  lines.push(`- Documentation: ${result.breakdown.documentation.score}/100`);

  if (result.recommendations.length > 0) {
    lines.push('');
    lines.push('## Recommendations');
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
