#!/usr/bin/env node
/**
 * Session Cleanup Script
 * 
 * Cleans up old session data while keeping recent sessions
 * Retention: 30 days for active sessions, archives older sessions
 * 
 * Usage: node scripts/cleanup-sessions.js [--dry-run]
 */

const fs = require('fs').promises;
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../data/sessions');
const ARCHIVE_DIR = path.join(__dirname, '../data/sessions-archive');
const RETENTION_DAYS = 30;
const DRY_RUN = process.argv.includes('--dry-run');

async function getFileAge(filePath) {
  const stats = await fs.stat(filePath);
  const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays;
}

async function archiveOldSessions() {
  console.log('🧹 Session Cleanup Script');
  console.log(`📅 Retention: ${RETENTION_DAYS} days`);
  console.log(`🔍 Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  try {
    // Ensure directories exist
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });

    // Get all session files
    const files = await fs.readdir(SESSIONS_DIR);
    
    let totalFiles = 0;
    let archivedFiles = 0;
    let totalSizeSaved = 0;

    for (const file of files) {
      if (file.startsWith('.')) continue; // Skip hidden files
      
      const filePath = path.join(SESSIONS_DIR, file);
      const stats = await fs.stat(filePath);
      
      // Skip directories
      if (stats.isDirectory()) continue;
      
      totalFiles++;
      const age = await getFileAge(filePath);
      
      if (age > RETENTION_DAYS) {
        const fileSize = stats.size;
        totalSizeSaved += fileSize;
        archivedFiles++;
        
        console.log(`📦 Archive: ${file} (${(age).toFixed(1)} days old, ${(fileSize / 1024).toFixed(1)}KB)`);
        
        if (!DRY_RUN) {
          const archivePath = path.join(ARCHIVE_DIR, file);
          await fs.rename(filePath, archivePath);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total sessions: ${totalFiles}`);
    console.log(`   Archived: ${archivedFiles}`);
    console.log(`   Space saved: ${(totalSizeSaved / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Remaining: ${totalFiles - archivedFiles}`);

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN - No files were actually moved');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Cleanup complete!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run cleanup
archiveOldSessions();
