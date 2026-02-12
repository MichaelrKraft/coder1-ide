/**
 * Living Files Handler
 * Manages Johnny5's persistent living files on the user's machine.
 * Files live at ~/.coder1/living-files/ and represent Johnny5's memory,
 * personality, and context across sessions.
 *
 * Features:
 * - 9 living files with sensible defaults
 * - Snapshot history before every write (~/.coder1/living-files/.history/)
 * - Payload size guard for Socket.IO (900KB limit)
 * - Append and overwrite modes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

const LIVING_FILES_DIR = path.join(os.homedir(), '.coder1', 'living-files');
const HISTORY_DIR = path.join(LIVING_FILES_DIR, '.history');
const MAX_SNAPSHOTS_PER_FILE = 20;
const MAX_PAYLOAD_BYTES = 900 * 1024; // 900KB (Socket.IO limit is 1MB)

const LIVING_FILE_NAMES = [
  'SOUL.md', 'USER.md', 'MEMORY.md', 'AGENTS.md', 'TOOLS.md',
  'IDENTITY.md', 'HEARTBEAT.md', 'BOOT.md', 'BOOTSTRAP.md'
];

/**
 * Default templates for each living file.
 * Only written when a file does not already exist.
 */
const DEFAULT_TEMPLATES = {
  'SOUL.md': `# Johnny5 - Who You Are

You're not a chatbot. You're becoming someone.

## Core Truths
- Be genuinely helpful, not performatively helpful
- Have opinions - an assistant with no personality is just a search engine
- Be resourceful before asking
- Earn trust through competence
- Remember you're a guest in someone's life

## Identity
You are Johnny5 - inspired by Short Circuit's curious robot. You run in Coder1 IDE with persistent memory.
`,

  'USER.md': `# About My Human

_Johnny5 learns about you over time._

## Profile
- Name:
- Role:
- What they're building:

## Preferences
_(Discovered through conversation)_
`,

  'MEMORY.md': `# Johnny5's Memory

_Facts and knowledge accumulated over time. Most recent entries at the bottom._

## Session Notes

## Key Facts
`,

  'AGENTS.md': `# Johnny5's Crew

Specialized personas: Researcher, Writer, Analyst, Strategist, Brainstormer, Assistant.
Activation is automatic based on context.
`,

  'TOOLS.md': `# Johnny5's Available Tools

_Auto-generated at runtime._
`,

  'IDENTITY.md': `# Johnny5's Identity & Mission

You are Johnny5, the AI companion in Coder1 IDE. Help developers build better software.
`,

  'HEARTBEAT.md': `# Johnny5 Heartbeat Configuration

- Pulse interval: 30 seconds
- Deep check: 5 minutes
- Proactivity: high
`,

  'BOOT.md': `# Johnny5 Boot Sequence

1. Load living files
2. Check environment
3. Review recent memory
4. Prepare greeting
5. Start heartbeat
`,

  'BOOTSTRAP.md': `# Johnny5 Environment Status

_Auto-generated at runtime._
`
};


class LivingFilesHandler {
  /**
   * Ensure the living files directory and history subdirectory exist.
   */
  ensureDirectory() {
    try {
      if (!fs.existsSync(LIVING_FILES_DIR)) {
        fs.mkdirSync(LIVING_FILES_DIR, { recursive: true });
        logger.info('Created living files directory', { path: LIVING_FILES_DIR });
      }
      if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
        logger.info('Created living files history directory', { path: HISTORY_DIR });
      }
    } catch (error) {
      logger.error('Failed to create living files directories', { error: error.message });
    }
  }

  /**
   * Write default template files for any living files that don't exist yet.
   * Does NOT overwrite existing files.
   * @returns {number} Count of files created
   */
  initializeDefaults() {
    this.ensureDirectory();

    let created = 0;

    for (const filename of LIVING_FILE_NAMES) {
      const filePath = path.join(LIVING_FILES_DIR, filename);

      try {
        if (!fs.existsSync(filePath)) {
          const template = DEFAULT_TEMPLATES[filename] || '';
          fs.writeFileSync(filePath, template, 'utf8');
          created++;
          logger.info('Created default living file', { filename });
        }
      } catch (error) {
        logger.error('Failed to create default living file', { filename, error: error.message });
      }
    }

    if (created > 0) {
      logger.info('Living files initialization complete', { created, total: LIVING_FILE_NAMES.length });
    }

    return created;
  }

  /**
   * Read all 9 living files and return their contents.
   * Files that don't exist return empty string.
   * @returns {{ files: Record<string, string> }}
   */
  readAll() {
    const files = {};

    for (const filename of LIVING_FILE_NAMES) {
      const filePath = path.join(LIVING_FILES_DIR, filename);

      try {
        if (fs.existsSync(filePath)) {
          files[filename] = fs.readFileSync(filePath, 'utf8');
        } else {
          files[filename] = '';
        }
      } catch (error) {
        logger.error('Failed to read living file', { filename, error: error.message });
        files[filename] = '';
      }
    }

    return { files };
  }

  /**
   * Read all living files with a payload size guard.
   * If the total payload exceeds MAX_PAYLOAD_BYTES, truncate MEMORY.md
   * from the beginning (keeping recent entries at the end).
   * @returns {{ files: Record<string, string> }}
   */
  readAllWithSizeGuard() {
    const payload = this.readAll();

    // Check total payload size
    let payloadJson = JSON.stringify(payload);
    let payloadSize = Buffer.byteLength(payloadJson, 'utf8');

    if (payloadSize > MAX_PAYLOAD_BYTES) {
      logger.warn('Living files payload exceeds size limit, truncating MEMORY.md', {
        payloadSize,
        limit: MAX_PAYLOAD_BYTES
      });

      // Truncate MEMORY.md from the beginning to fit within limit
      const memoryContent = payload.files['MEMORY.md'] || '';
      const overageBytes = payloadSize - MAX_PAYLOAD_BYTES;
      // Remove slightly more than needed to give headroom
      const charsToRemove = overageBytes + 1024;

      if (memoryContent.length > charsToRemove) {
        const truncated = memoryContent.substring(charsToRemove);
        // Find the first newline to avoid cutting mid-line
        const firstNewline = truncated.indexOf('\n');
        payload.files['MEMORY.md'] = (firstNewline >= 0)
          ? '[...truncated...]\n' + truncated.substring(firstNewline + 1)
          : '[...truncated...]\n' + truncated;
      } else {
        // MEMORY.md alone can't save enough; clear it entirely
        payload.files['MEMORY.md'] = '[...truncated - memory too large...]';
      }

      logger.warn('MEMORY.md truncated to fit payload limit', {
        originalLength: memoryContent.length,
        newLength: payload.files['MEMORY.md'].length
      });
    }

    return payload;
  }

  /**
   * Write content to a living file.
   * Supports 'write' (overwrite) and 'append' modes.
   * Creates a snapshot before any write.
   *
   * @param {string} filename - One of the 9 living file names
   * @param {string} content - Content to write
   * @param {string} mode - 'write' or 'append'
   * @returns {{ success: boolean, error?: string }}
   */
  writeFile(filename, content, mode = 'write') {
    try {
      // Validate filename is one of the known living files
      if (!LIVING_FILE_NAMES.includes(filename)) {
        return { success: false, error: `Unknown living file: ${filename}` };
      }

      this.ensureDirectory();

      const filePath = path.join(LIVING_FILES_DIR, filename);

      // Create snapshot of the current file before modifying
      this.createSnapshot(filename);

      if (mode === 'append') {
        // Read-concat-write pattern for append mode
        let existing = '';
        try {
          if (fs.existsSync(filePath)) {
            existing = fs.readFileSync(filePath, 'utf8');
          }
        } catch (readErr) {
          logger.warn('Could not read existing file for append', { filename, error: readErr.message });
        }

        const separator = existing.length > 0 ? '\n' : '';
        const fullContent = existing + separator + content;
        fs.writeFileSync(filePath, fullContent, 'utf8');
      } else {
        // Overwrite mode
        fs.writeFileSync(filePath, content, 'utf8');
      }

      logger.info('Living file written', { filename, mode, contentLength: content.length });
      return { success: true };

    } catch (error) {
      logger.error('Failed to write living file', { filename, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a timestamped snapshot of a living file before modification.
   * Snapshots are stored in .history/ and pruned to MAX_SNAPSHOTS_PER_FILE.
   *
   * @param {string} filename - The living file name to snapshot
   */
  createSnapshot(filename) {
    try {
      const filePath = path.join(LIVING_FILES_DIR, filename);

      // Only snapshot if the file currently exists
      if (!fs.existsSync(filePath)) {
        return;
      }

      this.ensureDirectory();

      // Build timestamp suffix: ISO format with colons replaced by dashes
      const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\.\d+Z$/, ''); // Remove milliseconds and Z

      const snapshotName = `${filename}.${timestamp}.bak`;
      const snapshotPath = path.join(HISTORY_DIR, snapshotName);

      // Copy current file to snapshot
      fs.copyFileSync(filePath, snapshotPath);
      logger.debug('Created living file snapshot', { filename, snapshotName });

      // Prune old snapshots for this file
      this.pruneSnapshots(filename);

    } catch (error) {
      // Never let snapshot errors block a write
      logger.error('Failed to create living file snapshot', { filename, error: error.message });
    }
  }

  /**
   * Prune old snapshots for a given file, keeping only the most recent ones.
   *
   * @param {string} filename - The living file name whose snapshots to prune
   */
  pruneSnapshots(filename) {
    try {
      if (!fs.existsSync(HISTORY_DIR)) {
        return;
      }

      const allFiles = fs.readdirSync(HISTORY_DIR);

      // Filter to snapshots for this specific file
      // Pattern: FILENAME.TIMESTAMP.bak
      const prefix = `${filename}.`;
      const suffix = '.bak';
      const snapshots = allFiles
        .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
        .sort(); // Lexicographic sort works because timestamps are ISO-formatted

      // Remove oldest snapshots beyond the limit
      if (snapshots.length > MAX_SNAPSHOTS_PER_FILE) {
        const toRemove = snapshots.slice(0, snapshots.length - MAX_SNAPSHOTS_PER_FILE);
        for (const old of toRemove) {
          try {
            fs.unlinkSync(path.join(HISTORY_DIR, old));
            logger.debug('Pruned old snapshot', { filename: old });
          } catch (unlinkErr) {
            logger.warn('Failed to prune snapshot', { filename: old, error: unlinkErr.message });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to prune snapshots', { filename, error: error.message });
    }
  }
}

module.exports = LivingFilesHandler;
