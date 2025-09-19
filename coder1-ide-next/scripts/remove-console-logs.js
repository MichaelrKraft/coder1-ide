#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const ROOT_DIR = process.cwd();
const PATTERNS = ['**/*.{ts,tsx,js,jsx}'];
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.next/**', 
  'dist/**',
  'build/**',
  'coverage/**',
  'scripts/**',
  '**/*.test.*',
  '**/*.spec.*'
];

// Console methods to replace
const CONSOLE_METHODS = ['log', 'debug', 'info', 'warn', 'error'];

// Statistics
let stats = {
  filesProcessed: 0,
  logsRemoved: 0,
  filesChanged: 0
};

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileChanged = false;
    
    // Replace console statements
    CONSOLE_METHODS.forEach(method => {
      const regex = new RegExp(`console\\.${method}\\s*\\([^;]*\\);?`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        matches.forEach(match => {
          // Replace with appropriate logging
          let replacement = '';
          
          if (method === 'error') {
            // Keep error logs but use proper logger
            replacement = match.replace(`console.${method}`, 'logger?.error');
          } else if (method === 'warn') {
            // Keep warnings but use proper logger
            replacement = match.replace(`console.${method}`, 'logger?.warn');
          } else if (process.env.NODE_ENV === 'development') {
            // In development, keep info logs but make them conditional
            replacement = `// DEV: ${match}`;
          } else {
            // Remove debug/info/log statements in production
            replacement = `// REMOVED: ${match}`;
          }
          
          newContent = newContent.replace(match, replacement);
          stats.logsRemoved++;
          fileChanged = true;
        });
      }
    });
    
    // Write back if changed
    if (fileChanged) {
      fs.writeFileSync(filePath, newContent);
      stats.filesChanged++;
      console.log(`✅ Updated: ${path.relative(ROOT_DIR, filePath)} (${stats.logsRemoved} logs)`);
    }
    
    stats.filesProcessed++;
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main execution
console.log('🧹 Cleaning up console.log statements...\n');

PATTERNS.forEach(pattern => {
  const files = glob.sync(pattern, {
    ignore: EXCLUDE_PATTERNS,
    cwd: ROOT_DIR,
    absolute: true
  });
  
  files.forEach(processFile);
});

// Report results
console.log('\n📊 Results:');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Files changed: ${stats.filesChanged}`);
console.log(`Logs removed/modified: ${stats.logsRemoved}`);

// Add logger import suggestion
if (stats.filesChanged > 0) {
  console.log('\n💡 Next steps:');
  console.log('1. Add proper logger service');
  console.log('2. Import logger in files that use logger?.error/warn');
  console.log('3. Review // REMOVED comments and clean up if needed');
}