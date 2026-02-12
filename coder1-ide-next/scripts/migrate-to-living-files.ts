/**
 * One-time migration script: existing data → living files
 *
 * Pulls USER.md and MEMORY.md from ManusLive workspace (~/.manuslive/workspace/)
 * and SOUL.md from the project root, writing them to ~/.coder1/living-files/.
 *
 * Safe to run multiple times — skips if living files already exist.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-living-files.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { LIVING_FILES_DIR, ensureDataDir } from '../lib/data-paths';

async function migrate(): Promise<void> {
  console.log('[Migration] Starting living files migration...');
  console.log(`[Migration] Target directory: ${LIVING_FILES_DIR}`);

  // Ensure directories exist
  ensureDataDir();

  // Check if living files already exist (skip if so)
  const soulPath = join(LIVING_FILES_DIR, 'SOUL.md');
  if (existsSync(soulPath)) {
    console.log('[Migration] Living files already exist at', LIVING_FILES_DIR);
    console.log('[Migration] Skipping migration. Delete SOUL.md to force re-migration.');
    return;
  }

  // Ensure living files directory exists
  if (!existsSync(LIVING_FILES_DIR)) {
    mkdirSync(LIVING_FILES_DIR, { recursive: true });
    console.log('[Migration] Created', LIVING_FILES_DIR);
  }

  let migratedCount = 0;

  // 1. Migrate SOUL.md from project root
  const projectSoulPath = join(process.cwd(), 'SOUL.md');
  if (existsSync(projectSoulPath)) {
    try {
      const content = readFileSync(projectSoulPath, 'utf8');
      writeFileSync(join(LIVING_FILES_DIR, 'SOUL.md'), content, 'utf8');
      console.log('[Migration] Migrated SOUL.md from project root');
      migratedCount++;
    } catch (e) {
      console.warn('[Migration] Could not read project SOUL.md:', e);
    }
  }

  // 2. Migrate USER.md from ManusLive workspace
  const manusLiveUserPath = join(homedir(), '.manuslive', 'workspace', 'USER.md');
  if (existsSync(manusLiveUserPath)) {
    try {
      const content = readFileSync(manusLiveUserPath, 'utf8');
      writeFileSync(join(LIVING_FILES_DIR, 'USER.md'), content, 'utf8');
      console.log('[Migration] Migrated USER.md from ManusLive workspace');
      migratedCount++;
    } catch (e) {
      console.warn('[Migration] Could not read ManusLive USER.md:', e);
    }
  }

  // 3. Migrate MEMORY.md from ManusLive workspace
  const manusLiveMemoryPath = join(homedir(), '.manuslive', 'workspace', 'MEMORY.md');
  if (existsSync(manusLiveMemoryPath)) {
    try {
      let content = readFileSync(manusLiveMemoryPath, 'utf8');
      // Truncate if too large (keep last 100KB)
      if (content.length > 100_000) {
        content = content.slice(-100_000);
        console.log('[Migration] MEMORY.md truncated to last 100KB');
      }
      writeFileSync(join(LIVING_FILES_DIR, 'MEMORY.md'), content, 'utf8');
      console.log('[Migration] Migrated MEMORY.md from ManusLive workspace');
      migratedCount++;
    } catch (e) {
      console.warn('[Migration] Could not read ManusLive MEMORY.md:', e);
    }
  }

  // 4. Migrate TOOLS.md from ManusLive workspace (if exists)
  const manusLiveToolsPath = join(homedir(), '.manuslive', 'workspace', 'TOOLS.md');
  if (existsSync(manusLiveToolsPath)) {
    try {
      const content = readFileSync(manusLiveToolsPath, 'utf8');
      writeFileSync(join(LIVING_FILES_DIR, 'TOOLS.md'), content, 'utf8');
      console.log('[Migration] Migrated TOOLS.md from ManusLive workspace');
      migratedCount++;
    } catch (e) {
      console.warn('[Migration] Could not read ManusLive TOOLS.md:', e);
    }
  }

  console.log(`[Migration] Migrated ${migratedCount} files.`);
  console.log('[Migration] Run initializeLivingFiles() to create any remaining default files.');
  console.log('[Migration] Done.');
}

// Run migration
migrate().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
