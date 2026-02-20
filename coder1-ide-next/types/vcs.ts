/**
 * Version Control System types for Coder1 IDE team features.
 * Shared across API routes, services, stores, and UI components.
 */

// Core PR type returned by GitHub GraphQL API
export interface TeamPullRequest {
  id: string;                    // GitHub node ID
  number: number;                // PR number
  title: string;
  url: string;                   // HTML URL for the PR
  state: 'open' | 'closed' | 'merged';
  isDraft: boolean;
  author: {
    login: string;
    avatarUrl: string;
    teamMemberId?: string;       // Our internal user ID if team member
  };
  repository: {
    owner: string;
    name: string;
    fullName: string;            // "owner/name"
    isPrivate: boolean;
  };
  headBranch: string;
  baseBranch: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;
  checksStatus: 'pending' | 'success' | 'failure' | 'neutral' | null;
  reviewDecision: 'approved' | 'changes_requested' | 'review_required' | null;
  reviewers: Array<{
    login: string;
    state: 'pending' | 'approved' | 'changes_requested' | 'commented';
  }>;
  changedFiles: string[];        // File paths (max 10)
  additions: number;
  deletions: number;
}

// Conflict tracking
export interface FileConflict {
  filePath: string;
  editors: Array<{
    userId: string;
    username: string;
    branch: string;
    since: string;               // ISO 8601 when they started editing
  }>;
  severity: 'critical' | 'warning';  // same file vs same directory
  detectedAt: string;
}

// Code ownership
export interface CodeOwnership {
  path: string;                  // Directory or file pattern
  owners: Array<{
    userId?: string;             // Our user ID if team member
    githubLogin: string;
    percentage: number;          // 0-100, contribution percentage
    source: 'codeowners' | 'git-blame' | 'directory' | 'fallback';
  }>;
}

// VCS connection status
export interface VCSConnectionStatus {
  connected: boolean;
  provider: 'github';
  username?: string;
  avatarUrl?: string;
  scopes?: string[];
  connectedAt?: string;
  expiresAt?: string | null;     // null for GitHub (tokens don't expire)
}

// PR filter options
export interface PRFilterOptions {
  author: string | null;
  status: 'all' | 'open' | 'draft' | 'review_required';
  search: string;
  sortBy: 'updated' | 'created' | 'title';
}

// API response types
export interface TeamPRsResponse {
  prs: TeamPullRequest[];
  cachedAt: string;
  stale: boolean;
  total: number;
}

export interface CodeOwnershipResponse {
  ownership: CodeOwnership;
}

// Socket event payloads
export interface VCSPRUpdatedPayload {
  pr: TeamPullRequest;
  action: 'opened' | 'updated' | 'closed' | 'merged';
  teamId: string;
}

export interface VCSFileEditingPayload {
  userId: string;
  username: string;
  filePath: string;
  branch: string;
  since: string;
}

export interface VCSConflictDetectedPayload {
  conflict: FileConflict;
  teamId: string;
}

export interface VCSFileOpenedPayload {
  teamId: string;
  filePath: string;
  branch: string;
}

export interface VCSFileClosedPayload {
  teamId: string;
  filePath: string;
}

export interface VCSFileStoppedPayload {
  userId: string;
  filePath: string;
}

export interface VCSConflictResolvedPayload {
  filePath: string;
  teamId: string;
}

// GitHub GraphQL types
export interface GitHubGraphQLError {
  message: string;
  type?: string;
  path?: string[];
  locations?: Array<{ line: number; column: number }>;
}

export interface GitHubGraphQLResponse<T> {
  data?: T;
  errors?: GitHubGraphQLError[];
}
