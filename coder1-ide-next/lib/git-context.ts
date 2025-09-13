/**
 * Git Context Detection Utilities
 * 
 * This module provides utilities to detect the current git context
 * for intelligent session naming and context capture.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface GitContext {
  branch: string | null;
  recentCommits: string[];
  modifiedFiles: string[];
  workingDirectory: string;
  repositoryRoot: string | null;
  hasUncommittedChanges: boolean;
  lastCommitHash: string | null;
}

/**
 * Execute git command safely with error handling
 */
async function executeGitCommand(command: string, cwd?: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(command, { 
      cwd: cwd || process.cwd(),
      timeout: 5000 // 5 second timeout
    });
    return stdout.trim();
  } catch (error) {
    // Silently handle git command errors (e.g., not in a git repository)
    return null;
  }
}

/**
 * Get the current git branch
 */
export async function getCurrentBranch(cwd?: string): Promise<string | null> {
  const branch = await executeGitCommand('git rev-parse --abbrev-ref HEAD', cwd);
  return branch === 'HEAD' ? null : branch; // Handle detached HEAD
}

/**
 * Get recent commit messages (last 5)
 */
export async function getRecentCommits(cwd?: string, count: number = 5): Promise<string[]> {
  const commits = await executeGitCommand(`git log --oneline -${count} --pretty=format:"%s"`, cwd);
  if (!commits) return [];
  
  return commits
    .split('\n')
    .map(commit => commit.trim())
    .filter(commit => commit.length > 0);
}

/**
 * Get modified files (staged and unstaged)
 */
export async function getModifiedFiles(cwd?: string): Promise<string[]> {
  const modifiedFiles = await executeGitCommand('git status --porcelain', cwd);
  if (!modifiedFiles) return [];
  
  return modifiedFiles
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Extract filename from git status format
      const match = line.match(/^.{3}(.+)$/);
      return match ? match[1].trim() : '';
    })
    .filter(filename => filename.length > 0);
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(cwd?: string): Promise<boolean> {
  const status = await executeGitCommand('git status --porcelain', cwd);
  return status !== null && status.length > 0;
}

/**
 * Get the last commit hash
 */
export async function getLastCommitHash(cwd?: string): Promise<string | null> {
  return await executeGitCommand('git rev-parse HEAD', cwd);
}

/**
 * Get the repository root directory
 */
export async function getRepositoryRoot(cwd?: string): Promise<string | null> {
  const root = await executeGitCommand('git rev-parse --show-toplevel', cwd);
  return root;
}

/**
 * Get comprehensive git context for session creation
 */
export async function getGitContext(workingDirectory?: string): Promise<GitContext> {
  const cwd = workingDirectory || process.cwd();
  
  // Execute all git commands in parallel for better performance
  const [
    branch,
    recentCommits,
    modifiedFiles,
    repositoryRoot,
    uncommittedChanges,
    lastCommitHash
  ] = await Promise.all([
    getCurrentBranch(cwd),
    getRecentCommits(cwd, 3), // Only get last 3 for session naming
    getModifiedFiles(cwd),
    getRepositoryRoot(cwd),
    hasUncommittedChanges(cwd),
    getLastCommitHash(cwd)
  ]);
  
  return {
    branch,
    recentCommits,
    modifiedFiles,
    workingDirectory: cwd,
    repositoryRoot,
    hasUncommittedChanges: uncommittedChanges,
    lastCommitHash
  };
}

/**
 * Extract meaningful context from file paths for naming suggestions
 */
export function extractFileContext(filePaths: string[]): string[] {
  const contexts: string[] = [];
  
  for (const filePath of filePaths) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirName = path.basename(path.dirname(filePath));
    
    // Extract meaningful names from common patterns
    const meaningfulNames = [
      // Component names (React, Vue, etc.)
      fileName.replace(/^(.*)(Component|Service|Util|Helper|Manager|Controller)$/, '$1'),
      // Directory-based context
      dirName !== '.' ? dirName : null,
      // Camel/Pascal case splitting
      fileName.replace(/([A-Z])/g, ' $1').trim(),
      // Kebab/snake case conversion
      fileName.replace(/[-_]/g, ' ')
    ]
      .filter((name): name is string => name !== null && name.length > 1)
      .map(name => name.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()));
    
    contexts.push(...meaningfulNames);
  }
  
  // Remove duplicates and return unique contexts
  return [...new Set(contexts)].slice(0, 5);
}

/**
 * Generate context-aware suggestions for session naming
 */
export function generateContextualSuggestions(gitContext: GitContext): string[] {
  const suggestions: string[] = [];
  
  // Branch-based suggestions
  if (gitContext.branch && !['main', 'master', 'develop', 'dev'].includes(gitContext.branch)) {
    const branchSuggestion = gitContext.branch
      .replace(/^(feature|feat|bugfix|fix|hotfix|chore|docs|style|refactor|test)\//, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    
    if (branchSuggestion.length > 2) {
      suggestions.push(branchSuggestion);
    }
  }
  
  // Recent commit-based suggestions
  if (gitContext.recentCommits.length > 0) {
    const commitSuggestion = gitContext.recentCommits[0]
      .replace(/^(feat|fix|docs|style|refactor|test|chore):\s*/i, '')
      .replace(/\b\w/g, char => char.toUpperCase())
      .substring(0, 40);
    
    if (commitSuggestion.length > 3) {
      suggestions.push(commitSuggestion);
    }
  }
  
  // Modified files-based suggestions
  if (gitContext.modifiedFiles.length > 0) {
    const fileContexts = extractFileContext(gitContext.modifiedFiles);
    suggestions.push(...fileContexts);
  }
  
  return [...new Set(suggestions)].slice(0, 3);
}

/**
 * Validate if current directory is a git repository
 */
export async function isGitRepository(cwd?: string): Promise<boolean> {
  const root = await getRepositoryRoot(cwd);
  return root !== null;
}

/**
 * Get repository name from remote origin URL
 */
export async function getRepositoryName(cwd?: string): Promise<string | null> {
  const remoteUrl = await executeGitCommand('git config --get remote.origin.url', cwd);
  if (!remoteUrl) return null;
  
  // Extract repository name from various URL formats
  const match = remoteUrl.match(/\/([^\/]+)\.git$/) || remoteUrl.match(/\/([^\/]+)$/);
  return match ? match[1] : null;
}