#!/usr/bin/env node

/**
 * Checkpoint Cleanup Utility
 * Fixes legacy checkpoint files polluted with Claude Code status messages
 * 
 * Usage: node scripts/cleanup-polluted-checkpoints.js [--dry-run] [--session-id]
 */

const fs = require('fs').promises;
const path = require('path');

// Import the filtering function (simplified for Node.js)
function filterThinkingAnimations(terminalData) {
  if (!terminalData) return terminalData;
  
  let filtered = terminalData;
  
  // 🚨 CRITICAL FIX: Specific pattern for "plan mode on (shift+tab to cycle)"
  const planModeOnPatterns = [
    /^\s*⏸\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    /^\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    /\u001b\[[0-9;]*m?\s*⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*\u001b\[[0-9;]*m?/gi,
    /^[ \t]+⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    /\r?\n?\s*⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*\r?\n?/gi,
    /.*plan mode on\s*\(shift\+tab to cycle\).*/gi
  ];
  
  // Apply the critical fix FIRST
  for (const pattern of planModeOnPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Remove "Found invalid settings files" messages
  const validationLoopPatterns = [
    /.*Found invalid settings files\. They will be ignored\. Run \/doctor for details\..*\r?\n/g,
    /(\s*Found invalid settings files\. They will be ignored\. Run \/doctor for details\.\s*\r?\n){2,}/g,
  ];
  
  for (const pattern of validationLoopPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // CRITICAL: Statusline task messages - the main cause of repetition
  const statuslineTaskPatterns = [
    /.*\u001b\[\d+m\(esc to interrupt.*$/gm,
    /.*\(esc to interrupt.*$/gm,
    /.*\(esc to interrupt.*?ctrl\+t.*?\).*$/gm,
    /.*ctrl\+t to show todos.*$/gm,
    /.*ctrl\+t for todos.*$/gm,
    /^\s*⎿\s*Next:.*$/gm,
    /.*⎿.*Next:.*$/gm,
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+[^(]+\(esc to interrupt.*?\).*$/gm,
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?\s*\(esc.*?ctrl\+t.*?\).*$/gm,
    /\u001b\[.*?m[✶✳✢·✻✽✦☆★▪▫◆◇○●]\u001b\[.*?m\s+.*?\(esc to interrupt.*?\).*$/gm,
    /^\s*Next:.*$/gm,
    /^\s*\(esc to interrupt.*?\).*$/gm,
    /^\s*\(.*?ctrl\+t.*?\).*$/gm,
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+[A-Z][^.!?\n]*[a-z].*?\(esc.*?\).*$/gm,
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+[A-Z][\w\s]+.*?\(esc to interrupt.*?\).*$/gm,
    /^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?·\s*ctrl\+t.*$/gm,
    /.*\u001b\[[\d;]+m[✶✳✢·✻✽✦☆★▪▫◆◇○●]\u001b.*\u001b\[\d+m\(esc to interrupt.*$/gm,
    /.*\besc to interrupt\b.*$/gm
  ];
  
  // Apply statusline task message filters
  for (const pattern of statuslineTaskPatterns) {
    filtered = filtered.replace(pattern, '');
  }
  
  // Clean up any remaining isolated cursor movement codes
  filtered = filtered.replace(/(\u001b\[2K\u001b\[1A)+\u001b\[2K\u001b\[G/g, '');
  
  // Normalize multiple consecutive newlines to maximum 2
  filtered = filtered.replace(/(\r?\n){3,}/g, '\r\n\r\n');
  
  return filtered;
}

async function findCheckpointFiles(sessionId = null) {
  const dataDir = path.join(process.cwd(), 'coder1-ide-next/data/sessions');
  const checkpointFiles = [];
  
  try {
    const sessions = await fs.readdir(dataDir);
    
    for (const session of sessions) {
      if (sessionId && session !== sessionId) continue;
      
      const sessionDir = path.join(dataDir, session);
      const checkpointsDir = path.join(sessionDir, 'checkpoints');
      
      try {
        const checkpointFileNames = await fs.readdir(checkpointsDir);
        
        for (const fileName of checkpointFileNames) {
          if (fileName.endsWith('.json')) {
            const filePath = path.join(checkpointsDir, fileName);
            const stats = await fs.stat(filePath);
            
            checkpointFiles.push({
              path: filePath,
              session: session,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
      } catch (err) {
        // Skip sessions without checkpoints directory
      }
    }
  } catch (err) {
    console.error('Error scanning checkpoint files:', err);
    return [];
  }
  
  return checkpointFiles.sort((a, b) => b.size - a.size); // Largest files first
}

async function analyzeCheckpointPollution(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const checkpoint = JSON.parse(content);
    
    const analysis = {
      fileSize: content.length,
      terminalHistorySize: 0,
      dataTerminalHistorySize: 0,
      planModeCount: 0,
      invalidSettingsCount: 0,
      statuslineCount: 0
    };
    
    // Check terminalHistory field
    if (checkpoint.terminalHistory) {
      analysis.terminalHistorySize = checkpoint.terminalHistory.length;
      analysis.planModeCount += (checkpoint.terminalHistory.match(/plan mode on/g) || []).length;
      analysis.invalidSettingsCount += (checkpoint.terminalHistory.match(/Found invalid settings files/g) || []).length;
      analysis.statuslineCount += (checkpoint.terminalHistory.match(/esc to interrupt/g) || []).length;
    }
    
    // Check data.terminalHistory field
    if (checkpoint.data?.terminalHistory) {
      analysis.dataTerminalHistorySize = checkpoint.data.terminalHistory.length;
      analysis.planModeCount += (checkpoint.data.terminalHistory.match(/plan mode on/g) || []).length;
      analysis.invalidSettingsCount += (checkpoint.data.terminalHistory.match(/Found invalid settings files/g) || []).length;
      analysis.statuslineCount += (checkpoint.data.terminalHistory.match(/esc to interrupt/g) || []).length;
    }
    
    return analysis;
  } catch (err) {
    return { error: err.message };
  }
}

async function cleanCheckpointFile(filePath, dryRun = false) {
  try {
    console.log(`\n📄 Processing: ${path.basename(filePath)}`);
    
    const content = await fs.readFile(filePath, 'utf8');
    const checkpoint = JSON.parse(content);
    
    // Analyze before cleaning
    const beforeAnalysis = await analyzeCheckpointPollution(filePath);
    console.log(`   Before: ${beforeAnalysis.planModeCount} plan mode, ${beforeAnalysis.invalidSettingsCount} invalid settings, ${beforeAnalysis.statuslineCount} statusline messages`);
    
    let modified = false;
    
    // Clean terminalHistory field
    if (checkpoint.terminalHistory) {
      const originalLength = checkpoint.terminalHistory.length;
      checkpoint.terminalHistory = filterThinkingAnimations(checkpoint.terminalHistory);
      if (checkpoint.terminalHistory.length !== originalLength) {
        modified = true;
        console.log(`   🧹 Cleaned terminalHistory: ${originalLength} → ${checkpoint.terminalHistory.length} chars`);
      }
    }
    
    // Clean data.terminalHistory field
    if (checkpoint.data?.terminalHistory) {
      const originalLength = checkpoint.data.terminalHistory.length;
      checkpoint.data.terminalHistory = filterThinkingAnimations(checkpoint.data.terminalHistory);
      if (checkpoint.data.terminalHistory.length !== originalLength) {
        modified = true;
        console.log(`   🧹 Cleaned data.terminalHistory: ${originalLength} → ${checkpoint.data.terminalHistory.length} chars`);
      }
    }
    
    if (modified && !dryRun) {
      // Create backup
      const backupPath = filePath + '.backup-' + Date.now();
      await fs.copyFile(filePath, backupPath);
      console.log(`   💾 Backup created: ${path.basename(backupPath)}`);
      
      // Write cleaned version
      await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2));
      
      // Analyze after cleaning
      const afterAnalysis = await analyzeCheckpointPollution(filePath);
      console.log(`   After:  ${afterAnalysis.planModeCount} plan mode, ${afterAnalysis.invalidSettingsCount} invalid settings, ${afterAnalysis.statuslineCount} statusline messages`);
      
      const originalSize = content.length;
      const newContent = await fs.readFile(filePath, 'utf8');
      const newSize = newContent.length;
      const savedBytes = originalSize - newSize;
      const savedPercent = Math.round((savedBytes / originalSize) * 100);
      
      console.log(`   💿 File size: ${Math.round(originalSize/1024)}KB → ${Math.round(newSize/1024)}KB (saved ${savedPercent}%)`);
      
      return { cleaned: true, savedBytes, originalSize: originalSize };
    } else if (modified && dryRun) {
      console.log(`   🔍 DRY RUN: Would clean this file`);
      return { cleaned: false, wouldClean: true };
    } else {
      console.log(`   ✅ File is already clean`);
      return { cleaned: false, alreadyClean: true };
    }
    
  } catch (err) {
    console.error(`   ❌ Error processing ${filePath}:`, err.message);
    return { error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sessionIdArg = args.find(arg => arg.startsWith('--session-id='));
  const sessionId = sessionIdArg ? sessionIdArg.split('=')[1] : null;
  
  console.log('🧹 Checkpoint Cleanup Utility');
  console.log('=============================');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE: No files will be modified');
  }
  
  if (sessionId) {
    console.log(`🎯 Targeting session: ${sessionId}`);
  }
  
  console.log('\n📊 Scanning for checkpoint files...');
  
  const checkpointFiles = await findCheckpointFiles(sessionId);
  
  if (checkpointFiles.length === 0) {
    console.log('📭 No checkpoint files found');
    return;
  }
  
  console.log(`📁 Found ${checkpointFiles.length} checkpoint files`);
  
  // Show largest files first (most likely to be polluted)
  console.log('\n📋 File Analysis:');
  const pollutedFiles = [];
  
  for (const file of checkpointFiles.slice(0, 10)) { // Analyze top 10 largest files
    const analysis = await analyzeCheckpointPollution(file.path);
    const sizeKB = Math.round(file.size / 1024);
    const pollution = analysis.planModeCount + analysis.invalidSettingsCount + analysis.statuslineCount;
    
    console.log(`   📄 ${path.basename(file.path)} (${sizeKB}KB) - ${pollution} polluted messages`);
    
    if (pollution > 10) { // Consider files with >10 polluted messages as candidates for cleaning
      pollutedFiles.push(file);
    }
  }
  
  console.log(`\n🎯 Found ${pollutedFiles.length} polluted files that need cleaning`);
  
  if (pollutedFiles.length === 0) {
    console.log('✅ All checkpoint files are clean!');
    return;
  }
  
  if (!dryRun) {
    console.log('\n⚠️  Starting cleanup process...');
  }
  
  let totalSaved = 0;
  let totalOriginal = 0;
  let cleanedCount = 0;
  
  for (const file of pollutedFiles) {
    const result = await cleanCheckpointFile(file.path, dryRun);
    
    if (result.cleaned) {
      cleanedCount++;
      totalSaved += result.savedBytes;
      totalOriginal += result.originalSize;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${pollutedFiles.length}`);
  console.log(`   Files cleaned: ${cleanedCount}`);
  
  if (totalSaved > 0) {
    const totalSavedMB = Math.round(totalSaved / (1024 * 1024) * 10) / 10;
    const totalOriginalMB = Math.round(totalOriginal / (1024 * 1024) * 10) / 10;
    const percentSaved = Math.round((totalSaved / totalOriginal) * 100);
    console.log(`   Space saved: ${totalSavedMB}MB out of ${totalOriginalMB}MB (${percentSaved}%)`);
  }
  
  if (dryRun) {
    console.log('\n🔍 This was a dry run. Use without --dry-run to actually clean files.');
  } else if (cleanedCount > 0) {
    console.log('\n✅ Cleanup complete! Checkpoint files should no longer repeat Claude status messages.');
    console.log('💾 Backups were created for all modified files.');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { filterThinkingAnimations, cleanCheckpointFile, findCheckpointFiles, analyzeCheckpointPollution };