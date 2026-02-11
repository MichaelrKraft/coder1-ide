/**
 * Time Capsule Handler
 * Writes Time Capsule JSON data to a Git metadata branch using plumbing commands.
 *
 * CRITICAL: This module NEVER touches the user's working directory or checked-out branch.
 * All operations use git plumbing commands (hash-object, mktree, commit-tree, update-ref)
 * which operate directly on the object database and refs, bypassing the index and worktree.
 *
 * Storage layout (on refs/coder1/time-capsules):
 *   capsules/{commitSha}.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const METADATA_REF = 'refs/coder1/time-capsules';
const MAX_CAPSULE_SIZE = 1024 * 1024; // 1MB
const TRUNCATED_TRANSCRIPT_LIMIT = 100;

/**
 * Write a Time Capsule to the git metadata branch.
 *
 * @param {string} repoPath - Absolute path to the git repository
 * @param {string} commitSha - The commit SHA this capsule is associated with
 * @param {object} capsuleData - The capsule JSON data to store
 * @returns {Promise<{ success: boolean, error?: string, gitPath?: string }>}
 */
async function writeTimeCapsule(repoPath, commitSha, capsuleData) {
  let tmpFile = null;

  try {
    // Validate inputs
    if (!repoPath || typeof repoPath !== 'string') {
      return { success: false, error: 'repoPath is required and must be a string' };
    }

    if (!commitSha || typeof commitSha !== 'string') {
      return { success: false, error: 'commitSha is required and must be a string' };
    }

    if (!capsuleData || typeof capsuleData !== 'object') {
      return { success: false, error: 'capsuleData is required and must be an object' };
    }

    // Validate commitSha looks like a hex SHA
    if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) {
      return { success: false, error: `Invalid commit SHA format: ${commitSha}` };
    }

    // Verify this is a git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: repoPath, stdio: 'pipe' });
    } catch (err) {
      return { success: false, error: `Not a git repository: ${repoPath}` };
    }

    // Prepare capsule JSON with size enforcement
    let json = JSON.stringify(capsuleData, null, 2);
    let jsonBytes = Buffer.byteLength(json, 'utf8');

    if (jsonBytes > MAX_CAPSULE_SIZE) {
      console.log(`[Time Capsule] Capsule exceeds 1MB (${jsonBytes} bytes), truncating transcript`);
      const truncated = { ...capsuleData };

      if (Array.isArray(truncated.transcript)) {
        truncated.transcript = truncated.transcript.slice(-TRUNCATED_TRANSCRIPT_LIMIT);
      }

      truncated._truncated = true;
      json = JSON.stringify(truncated, null, 2);
      jsonBytes = Buffer.byteLength(json, 'utf8');

      // If still too large after truncation, strip transcript entirely
      if (jsonBytes > MAX_CAPSULE_SIZE) {
        console.log('[Time Capsule] Still too large after truncation, removing transcript');
        truncated.transcript = [];
        truncated._truncated = true;
        json = JSON.stringify(truncated, null, 2);
      }
    }

    // Write JSON to a temp file for git hash-object
    const tmpDir = os.tmpdir();
    tmpFile = path.join(tmpDir, `coder1-capsule-${commitSha}-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, json, 'utf8');

    // Create a blob from the JSON file
    const blobHash = execSync(`git hash-object -w "${tmpFile}"`, {
      cwd: repoPath,
      stdio: 'pipe',
      encoding: 'utf8'
    }).trim();

    console.log(`[Time Capsule] Created blob: ${blobHash}`);

    // Build the tree - we need to incorporate existing capsules if the ref exists
    const capsulePath = `capsules/${commitSha}.json`;
    let treeEntries = [];

    // Check if the metadata ref already exists
    let existingCommit = null;
    try {
      existingCommit = execSync(`git rev-parse ${METADATA_REF}`, {
        cwd: repoPath,
        stdio: 'pipe',
        encoding: 'utf8'
      }).trim();
    } catch (err) {
      // Ref doesn't exist yet - first capsule
      console.log('[Time Capsule] No existing metadata branch, creating new one');
    }

    let existingCapsuleTreeHash = null;

    if (existingCommit) {
      // Get the existing tree from the current commit on the metadata ref
      const existingTree = execSync(`git rev-parse ${existingCommit}^{tree}`, {
        cwd: repoPath,
        stdio: 'pipe',
        encoding: 'utf8'
      }).trim();

      // Look for existing "capsules" directory entry in the tree
      try {
        const treeOutput = execSync(`git ls-tree ${existingTree}`, {
          cwd: repoPath,
          stdio: 'pipe',
          encoding: 'utf8'
        });

        const lines = treeOutput.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          // Format: <mode> <type> <hash>\t<name>
          const match = line.match(/^(\d+)\s+(\w+)\s+([0-9a-f]+)\t(.+)$/);
          if (match && match[4] === 'capsules' && match[2] === 'tree') {
            existingCapsuleTreeHash = match[3];
          }
        }
      } catch (err) {
        console.log('[Time Capsule] Could not read existing tree, starting fresh');
      }
    }

    // Build the capsules subtree
    // Start with existing capsule entries if they exist
    let capsuleEntries = [];

    if (existingCapsuleTreeHash) {
      try {
        const existingEntries = execSync(`git ls-tree ${existingCapsuleTreeHash}`, {
          cwd: repoPath,
          stdio: 'pipe',
          encoding: 'utf8'
        });

        const lines = existingEntries.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const match = line.match(/^(\d+)\s+(\w+)\s+([0-9a-f]+)\t(.+)$/);
          if (match) {
            // Skip if we're overwriting an existing capsule for this commit
            if (match[4] === `${commitSha}.json`) {
              console.log(`[Time Capsule] Overwriting existing capsule for ${commitSha}`);
              continue;
            }
            capsuleEntries.push(`${match[1]} ${match[2]} ${match[3]}\t${match[4]}`);
          }
        }
      } catch (err) {
        console.log('[Time Capsule] Could not read existing capsule entries');
      }
    }

    // Add the new capsule entry
    capsuleEntries.push(`100644 blob ${blobHash}\t${commitSha}.json`);

    // Create the capsules subtree
    const capsuleTreeInput = capsuleEntries.join('\n') + '\n';
    const capsuleTreeHash = execSync('git mktree', {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: capsuleTreeInput,
      encoding: 'utf8'
    }).trim();

    console.log(`[Time Capsule] Created capsules tree: ${capsuleTreeHash}`);

    // Build the root tree with the capsules directory
    const rootTreeInput = `040000 tree ${capsuleTreeHash}\tcapsules\n`;
    const rootTreeHash = execSync('git mktree', {
      cwd: repoPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: rootTreeInput,
      encoding: 'utf8'
    }).trim();

    console.log(`[Time Capsule] Created root tree: ${rootTreeHash}`);

    // Create the commit
    const commitMessage = `Time Capsule: ${commitSha.substring(0, 8)}`;
    let commitArgs = `git commit-tree ${rootTreeHash} -m "${commitMessage}"`;

    // If there's an existing commit, make it the parent
    if (existingCommit) {
      commitArgs += ` -p ${existingCommit}`;
    }

    const newCommit = execSync(commitArgs, {
      cwd: repoPath,
      stdio: 'pipe',
      encoding: 'utf8'
    }).trim();

    console.log(`[Time Capsule] Created commit: ${newCommit}`);

    // Update the metadata ref to point to the new commit
    execSync(`git update-ref ${METADATA_REF} ${newCommit}`, {
      cwd: repoPath,
      stdio: 'pipe'
    });

    console.log(`[Time Capsule] Updated ref ${METADATA_REF} -> ${newCommit}`);
    console.log(`[Time Capsule] Stored capsule at ${capsulePath}`);

    return {
      success: true,
      gitPath: capsulePath
    };
  } catch (err) {
    const errorMessage = err.message || String(err);
    console.error(`[Time Capsule] Error writing capsule: ${errorMessage}`);
    return { success: false, error: errorMessage };
  } finally {
    // Clean up temp file
    if (tmpFile) {
      try {
        fs.unlinkSync(tmpFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

module.exports = { writeTimeCapsule };
