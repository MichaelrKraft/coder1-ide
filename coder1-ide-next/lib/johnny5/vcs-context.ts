/**
 * VCS Context Builder for Johnny5
 *
 * Builds a compact team VCS context string that gets injected into
 * Johnny5's context-for-claude endpoint. This gives the AI assistant
 * awareness of what the team is working on, potential conflicts, and
 * active branches.
 *
 * Token budget: max 2000 tokens (~8000 chars). Truncates gracefully.
 */

import type { FileConflict } from '@/types/vcs';

// Max characters for VCS context (roughly 2000 tokens)
const MAX_CONTEXT_CHARS = 8000;
// Max files to list per editor
const MAX_FILES_PER_EDITOR = 10;
// Max PR title length
const MAX_PR_TITLE_CHARS = 80;

interface ActiveEditorInfo {
  userId: string;
  username: string;
  filePath: string;
  branch: string;
  since: string;
}

interface TeamPRSummary {
  number: number;
  title: string;
  author: string;
  headBranch: string;
  baseBranch: string;
  changedFiles: string[];
  state: string;
  isDraft: boolean;
}

/**
 * Build the VCS team context string for injection into Johnny5's context.
 *
 * Reads from:
 * - global._vcsActiveFiles (in-memory conflict tracking from server.js)
 * - Optional PR data passed in from the caller
 *
 * @param teamId - The team ID to get context for
 * @param currentUserId - The current user's ID (to highlight their conflicts)
 * @param teamPRs - Optional list of team PRs (from cache or API)
 */
export function buildVCSContext(
  teamId: string,
  currentUserId: string,
  teamPRs?: TeamPRSummary[]
): string {
  const sections: string[] = [];

  // 1. Active files and conflicts from in-memory state
  const vcsActiveFiles = (global as Record<string, unknown>)._vcsActiveFiles as
    Map<string, Map<string, Map<string, { username: string; branch: string; since: string }>>> | undefined;

  if (vcsActiveFiles) {
    const teamFiles = vcsActiveFiles.get(teamId);
    if (teamFiles && teamFiles.size > 0) {
      const conflicts: FileConflict[] = [];
      const activeEditors: ActiveEditorInfo[] = [];
      const branchOwners = new Map<string, Set<string>>(); // branch -> set of usernames

      for (const [filePath, fileEditors] of teamFiles) {
        // Build editor list
        for (const [userId, info] of fileEditors) {
          activeEditors.push({
            userId,
            username: info.username,
            filePath,
            branch: info.branch,
            since: info.since,
          });

          // Track branch owners
          if (!branchOwners.has(info.branch)) {
            branchOwners.set(info.branch, new Set());
          }
          branchOwners.get(info.branch)!.add(info.username);
        }

        // Detect conflicts (multiple editors on same file)
        if (fileEditors.size > 1) {
          const editors: FileConflict['editors'] = [];
          for (const [userId, info] of fileEditors) {
            editors.push({
              userId,
              username: info.username,
              branch: info.branch,
              since: info.since,
            });
          }
          conflicts.push({
            filePath,
            editors,
            severity: 'critical',
            detectedAt: editors[0].since,
          });
        }
      }

      // Active branches section
      if (branchOwners.size > 0) {
        sections.push('### Active Branches');
        for (const [branch, users] of branchOwners) {
          sections.push(`- \`${branch}\`: ${Array.from(users).join(', ')}`);
        }
      }

      // Conflicts section (most important for the AI)
      if (conflicts.length > 0) {
        sections.push('\n### ACTIVE CONFLICTS (IMPORTANT)');
        sections.push('The following files are being edited by multiple team members on different branches:');
        for (const conflict of conflicts) {
          const editors = conflict.editors
            .map(e => `${e.username} (${e.branch})`)
            .join(', ');
          sections.push(`- **${conflict.filePath}**: ${editors}`);

          // Highlight if current user is involved
          const currentUserInvolved = conflict.editors.some(e => e.userId === currentUserId);
          if (currentUserInvolved) {
            sections.push('  - WARNING: You are involved in this conflict. Coordinate with your teammate before making changes.');
          }
        }
      }

      // Active editors summary (group by user, limit files)
      if (activeEditors.length > 0 && conflicts.length === 0) {
        sections.push('\n### Team Activity');
        const byUser = new Map<string, ActiveEditorInfo[]>();
        for (const editor of activeEditors) {
          if (!byUser.has(editor.username)) {
            byUser.set(editor.username, []);
          }
          byUser.get(editor.username)!.push(editor);
        }
        for (const [username, files] of byUser) {
          const fileList = files
            .slice(0, MAX_FILES_PER_EDITOR)
            .map(f => f.filePath)
            .join(', ');
          const branch = files[0].branch;
          const suffix = files.length > MAX_FILES_PER_EDITOR
            ? ` (+${files.length - MAX_FILES_PER_EDITOR} more)`
            : '';
          sections.push(`- ${username} on \`${branch}\`: ${fileList}${suffix}`);
        }
      }
    }
  }

  // 2. Team PRs section (if available)
  if (teamPRs && teamPRs.length > 0) {
    sections.push('\n### Team Open PRs');
    // Sort by most recently relevant, limit to 10
    const prsToShow = teamPRs
      .filter(pr => pr.state === 'open')
      .slice(0, 10);

    for (const pr of prsToShow) {
      const title = pr.title.length > MAX_PR_TITLE_CHARS
        ? pr.title.slice(0, MAX_PR_TITLE_CHARS) + '...'
        : pr.title;
      const draft = pr.isDraft ? ' (DRAFT)' : '';
      const files = pr.changedFiles.length > 0
        ? ` - touches: ${pr.changedFiles.slice(0, 5).join(', ')}`
        : '';
      sections.push(`- #${pr.number} ${title}${draft} by ${pr.author} (\`${pr.headBranch}\` -> \`${pr.baseBranch}\`)${files}`);
    }

    if (teamPRs.length > 10) {
      sections.push(`  ...and ${teamPRs.length - 10} more PRs`);
    }
  }

  // If nothing to report, return empty
  if (sections.length === 0) {
    return '';
  }

  // Build final context with header
  let context = '## Team VCS Context\n' + sections.join('\n');

  // Truncate to budget
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS - 50) + '\n\n...(truncated for token budget)';
  }

  return context;
}
