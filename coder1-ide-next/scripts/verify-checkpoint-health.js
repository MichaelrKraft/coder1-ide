#!/usr/bin/env node

/**
 * Checkpoint Health Verification System
 * Ensures all checkpoints are free from "plan mode on" contamination
 * Run this before alpha launch to verify system integrity
 */

const fs = require('fs').promises;
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function verifyCheckpointHealth() {
  console.log(`${colors.blue}${colors.bold}🔍 CHECKPOINT HEALTH VERIFICATION SYSTEM${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const dataDir = path.join(__dirname, '..', 'data', 'sessions');
  const results = {
    totalCheckpoints: 0,
    healthyCheckpoints: 0,
    contaminatedCheckpoints: [],
    missingTerminalData: 0,
    errors: []
  };
  
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
        
        results.totalCheckpoints++;
        const checkpointPath = path.join(checkpointsPath, file);
        
        try {
          // Read checkpoint
          const content = await fs.readFile(checkpointPath, 'utf8');
          const checkpoint = JSON.parse(content);
          
          // Check if terminal data exists
          if (!checkpoint?.data?.snapshot?.terminal) {
            results.missingTerminalData++;
            results.healthyCheckpoints++; // No terminal data = no contamination
            continue;
          }
          
          const terminalData = checkpoint.data.snapshot.terminal;
          
          // Check for "plan mode on" contamination
          const planModeMatches = terminalData.match(/plan\s*mode\s*on/gi) || [];
          
          if (planModeMatches.length > 0) {
            results.contaminatedCheckpoints.push({
              session: sessionDir,
              file: file,
              count: planModeMatches.length,
              path: checkpointPath
            });
          } else {
            results.healthyCheckpoints++;
          }
          
        } catch (error) {
          results.errors.push({
            file: `${sessionDir}/${file}`,
            error: error.message
          });
        }
      }
    }
    
    // Display results
    console.log(`${colors.bold}📊 VERIFICATION RESULTS${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    console.log(`📁 Total Checkpoints Scanned: ${colors.bold}${results.totalCheckpoints}${colors.reset}`);
    console.log(`✅ Healthy Checkpoints: ${colors.green}${colors.bold}${results.healthyCheckpoints}${colors.reset}`);
    console.log(`📄 Checkpoints without terminal data: ${results.missingTerminalData}`);
    
    if (results.contaminatedCheckpoints.length > 0) {
      console.log(`\n${colors.red}${colors.bold}⚠️  CONTAMINATED CHECKPOINTS FOUND${colors.reset}`);
      console.log(`${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      
      for (const contaminated of results.contaminatedCheckpoints) {
        console.log(`${colors.red}❌ ${contaminated.session}/${contaminated.file}${colors.reset}`);
        console.log(`   Found ${colors.bold}${contaminated.count}${colors.reset} instances of "plan mode on"`);
      }
      
      console.log(`\n${colors.yellow}${colors.bold}⚠️  ACTION REQUIRED${colors.reset}`);
      console.log(`${colors.yellow}Run the cleanup script to fix contaminated checkpoints:${colors.reset}`);
      console.log(`${colors.cyan}  node scripts/clean-all-checkpoints-standalone.js${colors.reset}\n`);
      
    } else {
      console.log(`\n${colors.green}${colors.bold}🎉 ALL CHECKPOINTS ARE HEALTHY!${colors.reset}`);
      console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log(`${colors.green}✨ No "plan mode on" contamination detected${colors.reset}`);
      console.log(`${colors.green}✅ System is ready for alpha launch!${colors.reset}\n`);
    }
    
    if (results.errors.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Processing Errors:${colors.reset}`);
      for (const error of results.errors) {
        console.log(`   ${error.file}: ${error.error}`);
      }
    }
    
    // Health score calculation
    const healthScore = (results.healthyCheckpoints / results.totalCheckpoints * 100).toFixed(1);
    
    console.log(`\n${colors.blue}${colors.bold}📈 SYSTEM HEALTH SCORE${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    if (healthScore == 100) {
      console.log(`${colors.green}${colors.bold}Health Score: ${healthScore}% - PERFECT! 🌟${colors.reset}`);
    } else if (healthScore >= 95) {
      console.log(`${colors.green}Health Score: ${healthScore}% - Excellent${colors.reset}`);
    } else if (healthScore >= 80) {
      console.log(`${colors.yellow}Health Score: ${healthScore}% - Good (cleanup recommended)${colors.reset}`);
    } else {
      console.log(`${colors.red}Health Score: ${healthScore}% - Poor (cleanup required!)${colors.reset}`);
    }
    
    // Final verification status
    console.log(`\n${colors.blue}${colors.bold}🚀 ALPHA LAUNCH READINESS${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    const isReady = results.contaminatedCheckpoints.length === 0 && healthScore == 100;
    
    if (isReady) {
      console.log(`${colors.green}${colors.bold}✅ SYSTEM VERIFIED: Ready for Alpha Launch!${colors.reset}`);
      console.log(`${colors.green}🎯 All checkpoints are clean and healthy${colors.reset}`);
      console.log(`${colors.green}🛡️ "Plan mode on" issue permanently resolved${colors.reset}`);
    } else {
      console.log(`${colors.yellow}${colors.bold}⚠️  SYSTEM NOT READY: Cleanup required before launch${colors.reset}`);
      console.log(`${colors.yellow}📋 Run cleanup script, then verify again${colors.reset}`);
    }
    
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Verification completed at: ${new Date().toLocaleString()}${colors.reset}\n`);
    
    // Return exit code based on health
    process.exit(isReady ? 0 : 1);
    
  } catch (error) {
    console.error(`${colors.red}❌ Fatal error during verification:${colors.reset}`, error);
    process.exit(2);
  }
}

// Run the verification
verifyCheckpointHealth().catch(console.error);