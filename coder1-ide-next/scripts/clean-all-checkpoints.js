#!/usr/bin/env node

/**
 * Clean All Checkpoints Script
 * Applies the new filtering to all existing checkpoints to remove "plan mode on" text
 * Run this once to fix all corrupted checkpoints
 */

const fs = require('fs').promises;
const path = require('path');

// Import the filtering function
const { filterThinkingAnimations, processCheckpointDataForSave } = require('../lib/checkpoint-utils');

async function cleanAllCheckpoints() {
  console.log('🧹 Starting checkpoint cleanup...\n');
  
  const dataDir = path.join(__dirname, '..', 'data', 'sessions');
  let totalCleaned = 0;
  let totalPlanModeRemoved = 0;
  
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
              console.log(`📍 Found ${beforeCount} "plan mode on" in: ${sessionDir}/${file}`);
              
              // Apply the new filtering
              checkpoint.data.snapshot.terminal = filterThinkingAnimations(originalTerminal);
              
              // Count after cleaning
              const afterCount = (checkpoint.data.snapshot.terminal.match(/plan mode on/gi) || []).length;
              
              // Save cleaned checkpoint
              await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
              
              console.log(`   ✅ Removed ${beforeCount - afterCount} instances\n`);
              totalPlanModeRemoved += (beforeCount - afterCount);
              totalCleaned++;
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Error processing ${file}:`, error.message);
        }
      }
    }
    
    console.log('════════════════════════════════════════');
    console.log('🎉 Checkpoint Cleanup Complete!');
    console.log(`📊 Checkpoints cleaned: ${totalCleaned}`);
    console.log(`🧹 Total "plan mode on" removed: ${totalPlanModeRemoved}`);
    console.log('════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanAllCheckpoints().catch(console.error);