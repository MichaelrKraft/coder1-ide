/**
 * Centralized Data Directory Paths for Johnny5
 *
 * This module provides a single source of truth for all data directory paths.
 * It ensures Johnny5's database and configuration persist correctly across environments:
 *
 * - Production (Render): Uses persistent /data disk
 * - Development: Uses ~/.coder1
 *
 * CRITICAL: This fixes the production memory persistence issue where Johnny5
 * was storing data at ~/.coder1 (ephemeral on Render) instead of /data/.coder1
 *
 * Usage:
 * ```typescript
 * import { DATA_DIR, JOHNNY5_DB_PATH, ensureDataDir } from './data-paths';
 *
 * ensureDataDir(); // Call before any file operations
 * const db = new Database(JOHNNY5_DB_PATH);
 * ```
 */

import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

// ============================================================================
// Data Directory Determination
// ============================================================================

/**
 * Determine the base data directory based on environment
 *
 * Priority order:
 * 1. CODER1_DATA_DIR environment variable (explicit override)
 * 2. Production: /data/.coder1 (Render persistent disk)
 * 3. Development: ~/.coder1 (local home directory)
 */
function getDataDir(): string {
  // 1. Environment variable override (highest priority)
  if (process.env.CODER1_DATA_DIR) {
    console.log(`[Data Paths] Using CODER1_DATA_DIR from environment: ${process.env.CODER1_DATA_DIR}`);
    return process.env.CODER1_DATA_DIR;
  }

  // 2. Production: use persistent disk
  if (process.env.NODE_ENV === 'production') {
    // Check if /data exists (Render persistent disk)
    if (existsSync('/data')) {
      console.log('[Data Paths] Production environment detected, using /data/.coder1');
      return '/data/.coder1';
    }
    // Fallback for production without /data (shouldn't happen on Render)
    console.warn('[Data Paths] Production but /data not found, falling back to homedir');
    return join(homedir(), '.coder1');
  }

  // 3. Development: use home directory
  console.log(`[Data Paths] Development environment, using ${join(homedir(), '.coder1')}`);
  return join(homedir(), '.coder1');
}

// ============================================================================
// Exported Paths
// ============================================================================

/**
 * Base data directory for all Johnny5 data
 * - Production: /data/.coder1
 * - Development: ~/.coder1
 */
export const DATA_DIR = getDataDir();

/**
 * Path to Johnny5 SQLite database
 */
export const JOHNNY5_DB_PATH = join(DATA_DIR, 'johnny5.db');

/**
 * Path to Johnny5 configuration file
 */
export const JOHNNY5_CONFIG_PATH = join(DATA_DIR, 'johnny5-config.json');

/**
 * Path to backup directory
 */
export const BACKUP_DIR = join(DATA_DIR, 'backups');

/**
 * Path to summaries directory (session summaries)
 */
export const SUMMARIES_DIR = join(DATA_DIR, 'summaries');

/**
 * Path to memory exports directory
 */
export const EXPORTS_DIR = join(DATA_DIR, 'exports');

/**
 * Path to living files directory (Johnny5's 9 .md files)
 */
export const LIVING_FILES_DIR = join(DATA_DIR, 'living-files');

/**
 * Path to living files version history
 */
export const LIVING_FILES_HISTORY_DIR = join(DATA_DIR, 'living-files', '.history');

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Ensure the data directory and all subdirectories exist
 *
 * IMPORTANT: Call this before any file operations to ensure directories exist
 */
export function ensureDataDir(): void {
  const directories = [DATA_DIR, BACKUP_DIR, SUMMARIES_DIR, EXPORTS_DIR, LIVING_FILES_DIR, LIVING_FILES_HISTORY_DIR];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true, mode: 0o755 });
        console.log(`[Data Paths] Created directory: ${dir}`);
      } catch (error) {
        console.error(`[Data Paths] Failed to create directory ${dir}:`, error);
        throw new Error(`Failed to create data directory: ${dir}`);
      }
    }
  }
}

/**
 * Check if data directory is on persistent storage
 *
 * Returns true if using /data (Render persistent disk) or explicit env var
 */
export function isDataPersistent(): boolean {
  return DATA_DIR.startsWith('/data') || !!process.env.CODER1_DATA_DIR;
}

/**
 * Get diagnostic information about data paths
 *
 * Useful for debugging production issues
 */
export function getDataPathDiagnostics(): {
  dataDir: string;
  isPersistent: boolean;
  nodeEnv: string | undefined;
  envOverride: string | undefined;
  exists: boolean;
} {
  return {
    dataDir: DATA_DIR,
    isPersistent: isDataPersistent(),
    nodeEnv: process.env.NODE_ENV,
    envOverride: process.env.CODER1_DATA_DIR,
    exists: existsSync(DATA_DIR),
  };
}

// Log paths on module load (helpful for debugging deployment issues)
console.log(`[Data Paths] Initialized:`);
console.log(`  DATA_DIR=${DATA_DIR}`);
console.log(`  JOHNNY5_DB_PATH=${JOHNNY5_DB_PATH}`);
console.log(`  NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
console.log(`  LIVING_FILES_DIR=${LIVING_FILES_DIR}`);
console.log(`  isPersistent=${isDataPersistent()}`);
