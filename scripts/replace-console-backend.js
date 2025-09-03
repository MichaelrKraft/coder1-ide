#!/usr/bin/env node

/**
 * Script to replace console.log/error with logger in backend code
 * Run with --dry-run to preview changes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const dryRun = process.argv.includes('--dry-run');

console.log(`🔧 ${dryRun ? 'DRY RUN - ' : ''}Replacing console calls with logger in backend...`);

// Files to process
const patterns = [
  'src/**/*.js',
  '!src/utils/logger.js',
  '!src/middleware/error-handler.js',
  '!node_modules/**',
  '!build/**',
  '!dist/**'
];

// Get all JS files in src directory
const files = glob.sync('src/**/*.js', {
  ignore: [
    'src/utils/logger.js',
    'src/middleware/error-handler.js',
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**'
  ],
  cwd: path.join(__dirname, '..')
});

console.log(`Found ${files.length} files to process`);

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  let replacements = 0;
  
  // Add logger import if not present and file uses console
  if (!content.includes("require('../utils/logger')") && 
      !content.includes("require('./utils/logger')") &&
      !content.includes("require('../../utils/logger')") &&
      (content.includes('console.error') || content.includes('console.warn'))) {
    
    // Determine correct relative path
    const fileDir = path.dirname(filePath);
    const loggerPath = path.join(__dirname, '..', 'src', 'utils', 'logger.js');
    let relativePath = path.relative(fileDir, loggerPath).replace(/\\/g, '/');
    
    // Remove .js extension
    relativePath = relativePath.replace('.js', '');
    
    // Add require at the top of the file
    const requireStatement = `const logger = require('${relativePath}');\n`;
    
    // Insert after first comment block or at the beginning
    const insertPosition = content.match(/^\/\*[\s\S]*?\*\/\n/);
    if (insertPosition) {
      content = content.slice(0, insertPosition.index + insertPosition[0].length) +
                requireStatement +
                content.slice(insertPosition.index + insertPosition[0].length);
    } else {
      content = requireStatement + content;
    }
    replacements++;
  }
  
  // Replace console.error with logger.error
  content = content.replace(
    /console\.error\((.*?)\);/g,
    (match, args) => {
      replacements++;
      return `logger.error(${args});`;
    }
  );
  
  // Replace console.warn with logger.warn
  content = content.replace(
    /console\.warn\((.*?)\);/g,
    (match, args) => {
      replacements++;
      return `logger.warn(${args});`;
    }
  );
  
  // Optionally replace console.log with logger.info for specific patterns
  // Only replace logs that look like important messages
  content = content.replace(
    /console\.log\((['"`][❌⚠️🔴🟡❗].*?['"`].*?)\);/g,
    (match, args) => {
      replacements++;
      return `logger.info(${args});`;
    }
  );
  
  if (replacements > 0) {
    totalReplacements += replacements;
    console.log(`  📝 ${file}: ${replacements} replacements`);
    
    if (!dryRun && content !== originalContent) {
      fs.writeFileSync(filePath, content);
    }
  }
});

if (dryRun) {
  console.log(`\n✅ DRY RUN complete: Would make ${totalReplacements} replacements`);
  console.log('Run without --dry-run to apply changes');
} else {
  console.log(`\n✅ Complete: Made ${totalReplacements} replacements`);
}