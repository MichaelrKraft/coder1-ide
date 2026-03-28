/**
 * GitDetector — Extracts git events from terminal output.
 * Used by the event collector to auto-detect commits, branch switches, etc.
 */

interface GitCommitInfo {
  hash: string;
  message: string;
  branch?: string;
}

interface GitBranchInfo {
  branch: string;
}

class GitDetector {
  detectCommit(output: string): GitCommitInfo | null {
    // Pattern: "[branch hash] commit message"
    const commitPattern = /\[(\S+)\s+([a-f0-9]{7,})\]\s+(.+)/;
    const match = output.match(commitPattern);
    if (match) {
      return { branch: match[1], hash: match[2], message: match[3] };
    }
    return null;
  }

  detectBranchSwitch(output: string): GitBranchInfo | null {
    // "Switched to branch 'feature/xyz'" or "Switched to a new branch 'xyz'"
    const switchPattern = /Switched to (?:a new )?branch '([^']+)'/;
    const match = output.match(switchPattern);
    if (match) {
      return { branch: match[1] };
    }

    // "Already on 'main'"
    const alreadyPattern = /Already on '([^']+)'/;
    const alreadyMatch = output.match(alreadyPattern);
    if (alreadyMatch) {
      return { branch: alreadyMatch[1] };
    }

    return null;
  }
}

export const gitDetector = new GitDetector();
