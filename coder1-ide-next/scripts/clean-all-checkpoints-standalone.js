#!/usr/bin/env node

/**
 * Clean All Checkpoints Script (Standalone Version)
 * Applies the new filtering to all existing checkpoints to remove "plan mode on" text
 */

const fs = require('fs').promises;
const path = require('path');

// Inline the critical filtering function for "plan mode on"
function filterPlanModeOn(terminalData) {
  if (!terminalData) return terminalData;
  
  let filtered = terminalData;
  
  // 🚨 ENHANCED patterns for complex ANSI-embedded "plan mode on (shift+tab to cycle)"
  const planModeOnPatterns = [
    // Original patterns
    /^\s*⏸\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    /^\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    /\u001b\[[0-9;]*m?\s*⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*\u001b\[[0-9;]*m?/gi,
    /^[ \t]+⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*$/gim,
    /\r?\n?\s*⏸?\s*plan mode on\s*\(shift\+tab to cycle\)\s*\r?\n?/gi,
    /.*plan mode on\s*\(shift\+tab to cycle\).*/gi,
    
    // NEW: Complex ANSI patterns found in production checkpoints
    // Pattern: \u001b[38;5;73m⏸ plan mode on\u001b[38;5;246m\u001b[2m (shift+tab to cycle)\u001b[22m\u001b[39m
    /\\u001b\[38;5;\d+m[⏸\s]*plan mode on\\u001b\[38;5;\d+m\\u001b\[\d+m[^\\]*\(shift\+tab to cycle\)\\u001b\[\d+m\\u001b\[\d+m/gi,
    
    // Handle escaped unicode sequences
    /\\u001b\[[^\]]*m[⏸\s]*plan mode on[^\\]*(shift\+tab to cycle)[^\\]*\\u001b\[[^\]]*m/gi,
    
    // Handle literal backslash-u patterns
    /\\\\u001b.*?plan mode on.*?\(shift\+tab to cycle\).*?\\\\u001b/gi,
    
    // More aggressive: Remove any line containing "plan mode on" with ANSI codes
    /^.*\\u001b.*plan mode on.*shift\+tab to cycle.*$/gim,
    
    // Handle JSON-escaped versions
    /"[^"]*plan mode on[^"]*shift\+tab to cycle[^"]*"/gi,
    
    // Handle whitespace variations
    /\s*plan\s+mode\s+on\s*\([^)]*shift[^)]*tab[^)]*cycle[^)]*\)\s*/gi,
    
    // Terminal history specific pattern (embedded in arrays)
    /,\s*"[^"]*plan mode on[^"]*",?/gi,
    
    // Most aggressive: Any occurrence with flexible spacing
    /plan\s*mode\s*on[^)]*\)/gi
  ];
  
  // Apply all patterns sequentially
  for (const pattern of planModeOnPatterns) {
    const before = filtered.length;
    filtered = filtered.replace(pattern, '');
    const after = filtered.length;
    if (before !== after) {
      console.log(`      Pattern removed ${before - after} characters`);
    }
  }
  
  // Clean up terminal history arrays that might be broken
  filtered = filtered.replace(/,\s*,+/g, ','); // Remove multiple commas
  filtered = filtered.replace(/\[\s*,/g, '['); // Remove leading commas in arrays
  filtered = filtered.replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
  
  // Also remove excessive newlines
  filtered = filtered.replace(/(\r?\n){4,}/g, '\r\n\r\n');
  
  return filtered;
}

async function cleanAllCheckpoints() {
  console.log('🧹 Starting checkpoint cleanup...\n');
  
  const dataDir = path.join(__dirname, '..', 'data', 'sessions');
  let totalCleaned = 0;
  let totalPlanModeRemoved = 0;
  let checkpointsProcessed = 0;
  
  try {
    // Get all session directories
    const sessionDirs = await fs.readdir(dataDir);
    
    for (const sessionDir of sessionDirs) {
      const sessionPath = path.join(dataDir, sessionDir);
      const stats = await fs.stat(sessionPath);
      
      if (!stats.isDirectory()) continue;
      
      const checkpointsPath = path.join(sessionPath, 'checkpoints');
      
      // Check if checkpoints directory exists
      try {
        await fs.access(checkpointsPath);
      } catch {
        continue; // No checkpoints directory
      }
      
      // Get all checkpoint files
      const checkpointFiles = await fs.readdir(checkpointsPath);
      
      for (const file of checkpointFiles) {
        if (!file.endsWith('.json')) continue;
        
        checkpointsProcessed++;
        const checkpointPath = path.join(checkpointsPath, file);
        
        try {
          // Read checkpoint
          const content = await fs.readFile(checkpointPath, 'utf8');
          const checkpoint = JSON.parse(content);
          
          // Check if terminal data exists
          if (checkpoint?.data?.snapshot?.terminal) {
            const originalTerminal = checkpoint.data.snapshot.terminal;
            
            // Count "plan mode on" occurrences before cleaning
            const beforeCount = (originalTerminal.match(/plan mode on/gi) || []).length;
            
            if (beforeCount > 0) {
              console.log(`📍 Found ${beforeCount} "plan mode on" instances in:`);
              console.log(`   Session: ${sessionDir}`);
              console.log(`   File: ${file}`);
              
              // Apply the filtering
              checkpoint.data.snapshot.terminal = filterPlanModeOn(originalTerminal);
              
              // Count after cleaning
              const afterCount = (checkpoint.data.snapshot.terminal.match(/plan mode on/gi) || []).length;
              
              // Create backup before saving
              const backupPath = checkpointPath + '.backup-' + Date.now();
              await fs.writeFile(backupPath, content);
              console.log(`   📦 Backup created: ${path.basename(backupPath)}`);
              
              // Save cleaned checkpoint
              await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
              
              const removed = beforeCount - afterCount;
              console.log(`   ✅ Removed ${removed} instances (${afterCount} remaining)\n`);
              
              totalPlanModeRemoved += removed;
              totalCleaned++;
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Error processing ${file}:`, error.message);
        }
      }
    }
    
    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉 CHECKPOINT CLEANUP COMPLETE!');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`📊 Total checkpoints scanned: ${checkpointsProcessed}`);
    console.log(`🔧 Checkpoints cleaned: ${totalCleaned}`);
    console.log(`🧹 Total "plan mode on" instances removed: ${totalPlanModeRemoved}`);
    console.log('════════════════════════════════════════════════════════════');
    
    if (totalCleaned === 0) {
      console.log('\n✨ All checkpoints are already clean!');
    } else {
      console.log('\n✅ Your checkpoints are now ready for the alpha launch!');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
console.log('🚀 Checkpoint Cleanup Tool - Permanent Fix for "plan mode on" Issue\n');
cleanAllCheckpoints().catch(console.error);