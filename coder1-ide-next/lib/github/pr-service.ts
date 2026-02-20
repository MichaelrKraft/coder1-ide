/**
 * PR Service - Fetches and aggregates team PRs via GitHub GraphQL API.
 * Uses the GitHubClient from github-client.ts (created by Agent 1).
 * Implements server-side caching with 5-minute TTL.
 */

import type { TeamPullRequest, TeamPRsResponse } from '@/types/vcs';

// In-memory cache for PR data per team
interface CacheEntry {
  data: TeamPRsResponse;
  expiresAt: number;
}

const prCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GraphQL query to fetch PRs for multiple authors at once.
 * Uses GitHub's search API which supports OR-ing authors.
 */
const TEAM_PRS_QUERY = `
query TeamPullRequests($searchQuery: String!, $first: Int!, $after: String) {
  search(
    query: $searchQuery
    type: ISSUE
    first: $first
    after: $after
  ) {
    issueCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on PullRequest {
        id
        number
        title
        url
        state
        isDraft
        createdAt
        updatedAt
        headRefName
        baseRefName
        author {
          login
          avatarUrl
        }
        repository {
          owner { login }
          name
          isPrivate
        }
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
              }
            }
          }
        }
        reviewDecision
        reviews(first: 10) {
          nodes {
            author { login }
            state
          }
        }
        files(first: 10) {
          nodes { path }
        }
        additions
        deletions
      }
    }
  }
}
`;

/**
 * Map GitHub check status to our simplified status type.
 */
function mapChecksStatus(
  rollupState: string | null | undefined
): TeamPullRequest['checksStatus'] {
  if (!rollupState) return null;
  switch (rollupState.toUpperCase()) {
    case 'SUCCESS': return 'success';
    case 'FAILURE': case 'ERROR': return 'failure';
    case 'PENDING': case 'EXPECTED': return 'pending';
    default: return 'neutral';
  }
}

/**
 * Map GitHub review decision to our type.
 */
function mapReviewDecision(
  decision: string | null | undefined
): TeamPullRequest['reviewDecision'] {
  if (!decision) return null;
  switch (decision.toUpperCase()) {
    case 'APPROVED': return 'approved';
    case 'CHANGES_REQUESTED': return 'changes_requested';
    case 'REVIEW_REQUIRED': return 'review_required';
    default: return null;
  }
}

/**
 * Map a review state string from GitHub to our type.
 */
function mapReviewState(
  state: string
): 'pending' | 'approved' | 'changes_requested' | 'commented' {
  switch (state.toUpperCase()) {
    case 'APPROVED': return 'approved';
    case 'CHANGES_REQUESTED': return 'changes_requested';
    case 'COMMENTED': return 'commented';
    case 'DISMISSED': return 'commented';
    default: return 'pending';
  }
}

/**
 * Parse a raw GraphQL PR node into our TeamPullRequest type.
 */
function parseGraphQLNode(node: Record<string, any>): TeamPullRequest | null {
  if (!node || !node.id) return null;

  const lastCommit = node.commits?.nodes?.[0]?.commit;
  const rollupState = lastCommit?.statusCheckRollup?.state ?? null;

  // Deduplicate reviewers - keep most recent state per login
  const reviewMap = new Map<string, string>();
  for (const review of (node.reviews?.nodes ?? [])) {
    if (review?.author?.login) {
      reviewMap.set(review.author.login, review.state);
    }
  }

  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    state: (node.state ?? 'OPEN').toLowerCase() as TeamPullRequest['state'],
    isDraft: node.isDraft ?? false,
    author: {
      login: node.author?.login ?? 'unknown',
      avatarUrl: node.author?.avatarUrl ?? '',
    },
    repository: {
      owner: node.repository?.owner?.login ?? '',
      name: node.repository?.name ?? '',
      fullName: `${node.repository?.owner?.login ?? ''}/${node.repository?.name ?? ''}`,
      isPrivate: node.repository?.isPrivate ?? false,
    },
    headBranch: node.headRefName ?? '',
    baseBranch: node.baseRefName ?? '',
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    checksStatus: mapChecksStatus(rollupState),
    reviewDecision: mapReviewDecision(node.reviewDecision),
    reviewers: Array.from(reviewMap.entries()).map(([login, state]) => ({
      login,
      state: mapReviewState(state),
    })),
    changedFiles: (node.files?.nodes ?? [])
      .map((f: any) => f?.path)
      .filter(Boolean)
      .slice(0, 10),
    additions: node.additions ?? 0,
    deletions: node.deletions ?? 0,
  };
}

/**
 * Build a GitHub search query for PRs by multiple authors.
 * Example: "is:pr is:open author:user1 author:user2"
 */
function buildSearchQuery(
  githubLogins: string[],
  includeOpen: boolean = true,
  includeClosed: boolean = false,
): string {
  const parts = ['is:pr'];

  if (includeOpen && !includeClosed) {
    parts.push('is:open');
  } else if (includeClosed && !includeOpen) {
    parts.push('is:closed');
  }

  // GitHub search supports multiple author filters as OR
  for (const login of githubLogins) {
    parts.push(`author:${login}`);
  }

  return parts.join(' ');
}

/**
 * Fetch team PRs from GitHub GraphQL API.
 * Requires a valid GitHub access token with `repo` scope.
 *
 * @param token - GitHub OAuth access token
 * @param githubLogins - Array of GitHub usernames for team members
 * @param first - Number of PRs to fetch (default 20, max 100)
 * @param after - Pagination cursor
 */
export async function fetchTeamPRs(
  token: string,
  githubLogins: string[],
  first: number = 20,
  after?: string,
): Promise<{ prs: TeamPullRequest[]; hasNextPage: boolean; endCursor: string | null; total: number }> {
  if (githubLogins.length === 0) {
    return { prs: [], hasNextPage: false, endCursor: null, total: 0 };
  }

  const searchQuery = buildSearchQuery(githubLogins);

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Coder1-IDE/1.0',
    },
    body: JSON.stringify({
      query: TEAM_PRS_QUERY,
      variables: {
        searchQuery,
        first: Math.min(first, 100),
        after: after ?? null,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401) {
      throw new Error('GitHub token expired or revoked. Please reconnect GitHub.');
    }
    if (response.status === 403) {
      // Check for rate limit
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const resetAt = response.headers.get('x-ratelimit-reset');
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetAt ? new Date(parseInt(resetAt) * 1000).toISOString() : 'unknown'}`);
      }
      throw new Error('GitHub API access forbidden. Check token scopes.');
    }
    throw new Error(`GitHub API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const json = await response.json();

  // Handle GraphQL errors
  if (json.errors?.length) {
    const messages = json.errors.map((e: any) => e.message).join('; ');
    throw new Error(`GitHub GraphQL error: ${messages}`);
  }

  const search = json.data?.search;
  if (!search) {
    throw new Error('Unexpected GitHub API response format');
  }

  const prs = (search.nodes ?? [])
    .map(parseGraphQLNode)
    .filter((pr: TeamPullRequest | null): pr is TeamPullRequest => pr !== null);

  return {
    prs,
    hasNextPage: search.pageInfo?.hasNextPage ?? false,
    endCursor: search.pageInfo?.endCursor ?? null,
    total: search.issueCount ?? prs.length,
  };
}

/**
 * Get cached team PRs or fetch fresh data.
 * Returns cached data if within TTL, otherwise fetches new.
 */
export async function getTeamPRsCached(
  teamId: string,
  token: string,
  githubLogins: string[],
  first: number = 20,
): Promise<TeamPRsResponse> {
  const cacheKey = teamId;
  const cached = prCache.get(cacheKey);
  const now = Date.now();

  // Return cached if still valid
  if (cached && cached.expiresAt > now) {
    return { ...cached.data, stale: false };
  }

  // Fetch fresh data
  const result = await fetchTeamPRs(token, githubLogins, first);

  const response: TeamPRsResponse = {
    prs: result.prs,
    cachedAt: new Date().toISOString(),
    stale: false,
    total: result.total,
  };

  // Cache it
  prCache.set(cacheKey, {
    data: response,
    expiresAt: now + CACHE_TTL_MS,
  });

  return response;
}

/**
 * Invalidate the cache for a specific team.
 * Called when we receive a webhook or socket event about PR changes.
 */
export function invalidateTeamPRCache(teamId: string): void {
  prCache.delete(teamId);
}

/**
 * Request a review on a PR via GitHub REST API.
 */
export async function requestPRReview(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  reviewers: string[],
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Coder1-IDE/1.0',
      },
      body: JSON.stringify({ reviewers }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to request review: ${errorText.slice(0, 200)}`);
  }
}
