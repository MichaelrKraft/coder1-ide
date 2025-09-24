#!/usr/bin/env node

/**
 * Checkpoint Cleanup Script - CRITICAL FOR ALPHA LAUNCH
 * 
 * This script cleans existing corrupted checkpoint data that contains
 * Claude Code validation loops ("Found invalid settings files" and "Flowing…" messages).
 * 
 * These loops get restored when users click checkpoints, breaking the IDE for alpha launch.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Filter function to remove Claude thinking animations and validation loops from terminal data
 * (Copied from checkpoint-utils.ts for Node.js compatibility)
 */
function filterThinkingAnimations(terminalData) {
  if (!terminalData) return terminalData;
  
  let filtered = terminalData;
  
  // Remove thinking animation patterns with all their ANSI codes
  const thinkingPatterns = [
    // Match lines with thinking animations including color codes
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s+\u001b\[38;5;\d+m.*?[Tt]hin.*?king.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match simpler thinking patterns
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s+[Tt]hinking…\s+\(esc to interrupt\).*?\r?\n/g,
    // Match cursor movement sequences that are part of animations
    /(?:\u001b\[2K\u001b\[1A){2,}(?:\u001b\[2K\u001b\[G)?/g,
    // Match standalone cursor clearing sequences (often left after animations)
    /\u001b\[2K\u001b\[G\r?\n/g,
    // Remove excessive newlines that might be left
    /(\r?\n){4,}/g
  ];
  
  // Claude Code validation loop patterns - CRITICAL FOR ALPHA LAUNCH
  const validationLoopPatterns = [
    // Match "Found invalid settings files" messages with any surrounding text
    /.*Found invalid settings files\. They will be ignored\. Run \/doctor for details\..*\r?\n/g,
    // Match "Flowing…" patterns with spinners and interruption text
    /[✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing…\s*\(esc to interrupt\).*?\r?\n/g,
    // Match color-coded "Flowing…" patterns
    /\u001b\[38;5;\d+m[✳✢·✶✻✽✦☆★▪▫◆◇○●]\u001b\[39m\s*\u001b\[38;5;\d+m.*?Flowing.*?\u001b\[39m.*?\(esc to interrupt\).*?\r?\n/g,
    // Match validation loop cursor sequences (specific to Claude Code loops)
    /\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[1A\u001b\[2K\u001b\[G.*?Found invalid settings files.*?\r?\n/g,
    // Match repetitive validation sequences
    /(\s*Found invalid settings files\. They will be ignored\. Run \/doctor for details\.\s*\r?\n){2,}/g,
    // Match repetitive "Flowing…" sequences
    /([✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing…\s*\(esc to interrupt\).*?\r?\n){2,}/g
  ];
  
  // Apply thinking animation filters
  for (const pattern of thinkingPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Apply validation loop filters - CRITICAL FOR ALPHA LAUNCH
  for (const pattern of validationLoopPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Clean up any remaining isolated cursor movement codes
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A)+\u001b\[2K\u001b\[G/g, '');
  
  // Clean up validation loop specific cursor sequences
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A){5,}\u001b\[2K\u001b\[G/g, '');
  
  // Remove any remaining "Found invalid settings" fragments
  filtered = filtered.replace(/.*Found invalid settings.*?\r?\n/g, '');
  filtered = filtered.replace(/.*Flowing….*?\r?\n/g, '');
  
  // Normalize multiple consecutive newlines to maximum 2
  filtered = filtered.replace(/(\r?\n){3,}/g, '\r\n\r\n');
  
  return filtered;
}

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data', 'sessions');
const BACKUP_SUFFIX = '.backup-' + Date.now();

async function findCheckpointFiles(dir) {
  const checkpointFiles = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findCheckpointFiles(fullPath);
        checkpointFiles.push(...subFiles);
      } else if (entry.name.startsWith('checkpoint_') && entry.name.endsWith('.json')) {
        checkpointFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
  }
  
  return checkpointFiles;
}

async function isCorruptedCheckpoint(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const checkpoint = JSON.parse(content);
    
    if (!checkpoint.data?.snapshot?.terminal) {
      return false; // No terminal data to check
    }
    
    const terminal = checkpoint.data.snapshot.terminal;
    
    // Check for corruption patterns
    const corruptionPatterns = [
      /Found invalid settings files\. They will be ignored\. Run \/doctor for details\./,
      /Flowing…\s*\(esc to interrupt\)/,
      /(\s*Found invalid settings files.*?\r?\n){2,}/, // Repetitive patterns
      /([✳✢·✶✻✽✦☆★▪▫◆◇○●]\s*Flowing….*?\r?\n){2,}/ // Repetitive spinner patterns
    ];
    
    return corruptionPatterns.some(pattern => pattern.test(terminal));
  } catch (error) {
    console.warn(`Warning: Could not analyze checkpoint ${filePath}: ${error.message}`);
    return false;
  }
}

async function cleanCheckpoint(filePath) {
  try {
    // Create backup
    const backupPath = filePath + BACKUP_SUFFIX;
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Created backup: ${path.basename(backupPath)}`);
    
    // Read and parse checkpoint
    const content = await fs.readFile(filePath, 'utf8');
    const checkpoint = JSON.parse(content);
    
    if (!checkpoint.data?.snapshot?.terminal) {
      console.log(`⚠️  No terminal data to clean in ${path.basename(filePath)}`);
      return false;
    }
    
    // Get original terminal data
    const originalTerminal = checkpoint.data.snapshot.terminal;
    const originalSize = originalTerminal.length;
    
    // Apply filtering
    const cleanedTerminal = filterThinkingAnimations(originalTerminal);
    const newSize = cleanedTerminal.length;
    const reduction = originalSize - newSize;
    
    if (reduction > 0) {
      // Update checkpoint with cleaned data
      checkpoint.data.snapshot.terminal = cleanedTerminal;
      
      // Write cleaned checkpoint
      await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2));
      
      console.log(`🧹 Cleaned ${path.basename(filePath)}: ${reduction} characters removed (${originalSize} → ${newSize})`);
      return true;
    } else {
      console.log(`✨ ${path.basename(filePath)} already clean`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Failed to clean checkpoint ${filePath}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Coder1 IDE - Checkpoint Cleanup Script');
  console.log('🎯 Target: Remove Claude Code validation loops from checkpoints');
  console.log('📂 Scanning:', DATA_DIR);
  console.log('');
  
  try {
    // Find all checkpoint files
    console.log('🔍 Finding checkpoint files...');
    const checkpointFiles = await findCheckpointFiles(DATA_DIR);
    
    if (checkpointFiles.length === 0) {
      console.log('ℹ️  No checkpoint files found.');
      return;
    }
    
    console.log(`📋 Found ${checkpointFiles.length} checkpoint files`);
    console.log('');
    
    // Analyze corruption
    console.log('🔍 Analyzing for corruption...');
    const corruptedFiles = [];
    
    for (const filePath of checkpointFiles) {
      if (await isCorruptedCheckpoint(filePath)) {
        corruptedFiles.push(filePath);
        console.log(`🚨 Corrupted: ${path.basename(filePath)}`);
      }
    }
    
    if (corruptedFiles.length === 0) {
      console.log('✨ No corrupted checkpoints found! All checkpoints are clean.');
      return;
    }
    
    console.log(`\n⚠️  Found ${corruptedFiles.length} corrupted checkpoints`);
    console.log('');
    
    // Clean corrupted files
    console.log('🧹 Starting cleanup process...');
    let cleanedCount = 0;
    let errorCount = 0;
    
    for (const filePath of corruptedFiles) {
      const cleaned = await cleanCheckpoint(filePath);
      if (cleaned) {
        cleanedCount++;
      } else {
        errorCount++;
      }
    }
    
    console.log('');
    console.log('📊 Cleanup Summary:');
    console.log(`   ✅ Files cleaned: ${cleanedCount}`);
    console.log(`   ⚠️  Files with errors: ${errorCount}`);
    console.log(`   📁 Backups created: ${corruptedFiles.length}`);
    console.log('');
    
    if (cleanedCount > 0) {
      console.log('🎉 Alpha Launch Ready! Checkpoints no longer contain validation loops.');
      console.log('💡 Users can now restore checkpoints without getting stuck.');
      console.log('');
      console.log('🔍 Next steps:');
      console.log('   1. Test checkpoint restoration');
      console.log('   2. Verify terminals load cleanly');
      console.log('   3. Confirm Claude Code operation');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('📞 Contact development team for assistance.');
    process.exit(1);
  }
}

// Handle module import for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { findCheckpointFiles, isCorruptedCheckpoint, cleanCheckpoint };
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}