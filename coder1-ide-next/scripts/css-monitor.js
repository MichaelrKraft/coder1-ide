#!/usr/bin/env node

/**
 * CSS Monitor - Automatic CSS Recovery Script
 * 
 * This script monitors for CSS issues and automatically rebuilds when CSS disappears.
 * Run this alongside your development server to prevent CSS loss.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const CSS_CHECK_INTERVAL = 5000; // Check every 5 seconds
const CSS_PATH = path.join(__dirname, '../.next/static/css/app/layout.css');
const BUILD_DIR = path.join(__dirname, '../.next');

let isRebuilding = false;
let lastRebuildTime = 0;
const MIN_REBUILD_INTERVAL = 30000; // Don't rebuild more than once per 30 seconds

console.log('🔍 CSS Monitor Started');
console.log(`📁 Watching: ${CSS_PATH}`);
console.log('⏱️  Check interval: 5 seconds');
console.log('🛡️  Will auto-rebuild if CSS disappears\n');

async function checkCSS() {
  try {
    // Check if .next directory exists
    if (!fs.existsSync(BUILD_DIR)) {
      console.log('⚠️  Build directory missing - triggering rebuild');
      await rebuildCSS();
      return;
    }

    // Check if CSS file exists
    if (!fs.existsSync(CSS_PATH)) {
      console.log('❌ CSS file missing!');
      await rebuildCSS();
      return;
    }

    // Check if CSS file has content
    const stats = fs.statSync(CSS_PATH);
    if (stats.size === 0) {
      console.log('❌ CSS file is empty!');
      await rebuildCSS();
      return;
    }

    // All good
    process.stdout.write('.');
  } catch (error) {
    console.error('Error checking CSS:', error.message);
  }
}

async function rebuildCSS() {
  if (isRebuilding) {
    console.log('🔄 Already rebuilding, skipping...');
    return;
  }

  const now = Date.now();
  if (now - lastRebuildTime < MIN_REBUILD_INTERVAL) {
    console.log('⏱️  Too soon since last rebuild, waiting...');
    return;
  }

  isRebuilding = true;
  lastRebuildTime = now;

  console.log('\n🔧 Rebuilding CSS...');
  
  try {
    // First, try a quick CSS-only rebuild
    console.log('  → Attempting quick CSS rebuild...');
    await execAsync('cd ' + path.dirname(BUILD_DIR) + ' && npx tailwindcss -i ./app/globals.css -o ./.next/static/css/app/layout.css --minify');
    console.log('  ✅ Quick CSS rebuild complete');
    
    // Verify the file exists and has content
    if (fs.existsSync(CSS_PATH)) {
      const stats = fs.statSync(CSS_PATH);
      if (stats.size > 0) {
        console.log(`  ✅ CSS restored (${stats.size} bytes)`);
        console.log('  💡 Refresh your browser to load new CSS\n');
        isRebuilding = false;
        return;
      }
    }
    
    // If quick rebuild didn't work, do a full Next.js build
    console.log('  → Quick rebuild failed, attempting full rebuild...');
    await execAsync('cd ' + path.dirname(BUILD_DIR) + ' && npm run build');
    console.log('  ✅ Full rebuild complete');
    console.log('  💡 Refresh your browser to load new CSS\n');
    
  } catch (error) {
    console.error('  ❌ Rebuild failed:', error.message);
    console.log('  💡 Try manually running: npm run build\n');
  }
  
  isRebuilding = false;
}

// Check immediately on start
checkCSS();

// Set up interval check
setInterval(checkCSS, CSS_CHECK_INTERVAL);

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 CSS Monitor shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 CSS Monitor shutting down');
  process.exit(0);
});

console.log('\n✅ CSS Monitor is running. Press Ctrl+C to stop.\n');