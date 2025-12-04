/**
 * Session Reader for Bridge CLI
 * Reads Claude Code session data from ~/.claude/projects/
 * Streams token usage to the server via heartbeat
 *
 * Part of Phase 1: Bridge Session Data Streaming
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get the Claude projects directory for a given working directory
 * @param {string} cwd - Current working directory
 * @returns {string} Path to Claude project directory
 */
function getClaudeProjectDir(cwd) {
  const homeDir = os.homedir();
  const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');

  // Convert path to Claude's directory naming format
  // Example: /Users/michael/project -> -Users-michael-project
  const projectDirName = cwd.replace(/\//g, '-');

  return path.join(claudeProjectsDir, projectDirName);
}

/**
 * Find the most recent session file in the project directory
 * @param {string} projectDir - Path to Claude project directory
 * @returns {string|null} Path to most recent session file or null
 */
function findRecentSessionFile(projectDir) {
  try {
    if (!fs.existsSync(projectDir)) {
      return null;
    }

    const allFiles = fs.readdirSync(projectDir);
    const jsonlFiles = allFiles.filter(f => f.endsWith('.jsonl'));

    if (jsonlFiles.length === 0) {
      return null;
    }

    const files = jsonlFiles
      .map(f => ({
        name: f,
        path: path.join(projectDir, f),
        mtime: fs.statSync(path.join(projectDir, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return files.length > 0 ? files[0].path : null;
  } catch (error) {
    // Silently fail - don't spam logs for missing directories
    return null;
  }
}

/**
 * Parse a single JSONL line to extract token usage
 * @param {string} line - A single line from JSONL file
 * @returns {Object|null} Message with usage data or null
 */
function parseSessionLine(line) {
  try {
    const data = JSON.parse(line);

    // Only interested in messages with usage data
    if (data.message?.usage) {
      return {
        message: data.message,
        timestamp: data.timestamp,
        sessionId: data.sessionId
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Read all messages from a session file and sum token usage
 * @param {string} sessionFilePath - Path to JSONL session file
 * @returns {Object} Token usage object
 */
function getSessionTokenUsage(sessionFilePath) {
  const usage = {
    input: 0,
    output: 0,
    total: 0,
    cacheCreation: 0,
    cacheRead: 0
  };

  try {
    if (!fs.existsSync(sessionFilePath)) {
      return usage;
    }

    const content = fs.readFileSync(sessionFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const message = parseSessionLine(line);
      if (message?.message?.usage) {
        const u = message.message.usage;

        // Sum up all input tokens (including cache)
        usage.input += (u.input_tokens || 0);
        usage.cacheCreation += (u.cache_creation_input_tokens || 0);
        usage.cacheRead += (u.cache_read_input_tokens || 0);

        // Output tokens
        usage.output += (u.output_tokens || 0);
      }
    }

    // Calculate total
    usage.total = usage.input + usage.output + usage.cacheCreation + usage.cacheRead;

    return usage;
  } catch (error) {
    // Silently fail - return empty usage
    return usage;
  }
}

/**
 * Get current session token usage for the bridge's working directory
 * This is the main function called by the heartbeat
 * @param {string} cwd - Current working directory (optional, defaults to process.cwd())
 * @returns {Object|null} Token usage object or null if no session found
 */
function getCurrentSessionUsage(cwd) {
  try {
    const workingDir = cwd || process.cwd();
    const projectDir = getClaudeProjectDir(workingDir);
    const sessionFile = findRecentSessionFile(projectDir);

    if (!sessionFile) {
      return null;
    }

    return getSessionTokenUsage(sessionFile);
  } catch (error) {
    return null;
  }
}

/**
 * Scan all Claude project directories and find active sessions
 * Returns session metadata for each project
 * @returns {Array} Array of session info objects
 */
function getAllActiveSessions() {
  const sessions = [];

  try {
    const homeDir = os.homedir();
    const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');

    if (!fs.existsSync(claudeProjectsDir)) {
      return sessions;
    }

    const projectDirs = fs.readdirSync(claudeProjectsDir);

    for (const dirName of projectDirs) {
      const projectPath = path.join(claudeProjectsDir, dirName);
      const stat = fs.statSync(projectPath);

      if (!stat.isDirectory()) continue;

      const sessionFile = findRecentSessionFile(projectPath);
      if (!sessionFile) continue;

      // Get session file stats
      const sessionStat = fs.statSync(sessionFile);
      const hoursSinceModified = (Date.now() - sessionStat.mtime.getTime()) / (1000 * 60 * 60);

      // Only include sessions modified in the last 24 hours
      if (hoursSinceModified > 24) continue;

      // Convert directory name back to path
      const projectName = dirName.replace(/^-/, '/').replace(/-/g, '/');

      sessions.push({
        projectDir: dirName,
        projectPath: projectName,
        sessionFile: path.basename(sessionFile),
        lastActivity: sessionStat.mtime.toISOString(),
        isActive: hoursSinceModified < 1, // Active if modified in last hour
        tokenUsage: getSessionTokenUsage(sessionFile)
      });
    }

    // Sort by last activity (most recent first)
    sessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    return sessions;
  } catch (error) {
    return sessions;
  }
}

/**
 * Get session data for the heartbeat payload
 * This is the main export used by bridge-client.js
 * @param {string} cwd - Current working directory (optional)
 * @returns {Object} Session data for heartbeat
 */
function getSessionDataForHeartbeat(cwd) {
  const tokenUsage = getCurrentSessionUsage(cwd);

  return {
    tokens: tokenUsage,
    hasActiveSession: tokenUsage !== null,
    timestamp: Date.now()
  };
}

module.exports = {
  getClaudeProjectDir,
  findRecentSessionFile,
  parseSessionLine,
  getSessionTokenUsage,
  getCurrentSessionUsage,
  getAllActiveSessions,
  getSessionDataForHeartbeat
};
