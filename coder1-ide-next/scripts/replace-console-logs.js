#!/usr/bin/env node
/**
 * Automated Console.log Replacer Script
 * 
 * Replaces all console.log/warn/error statements with our safe logger
 * Preserves important debugging context
 * Can be run as part of build process
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  rootDir: path.join(__dirname, '..'),
  patterns: [
    'app/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'services/**/*.{ts,tsx,js,jsx}',
    'stores/**/*.{ts,tsx,js,jsx}'
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/logger.ts', // Don't modify the logger itself
    '**/scripts/**'
  ],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Replacement mappings
const replacements = {
  'console.log': 'logger.debug',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
  'console.debug': 'logger.debug'
};

// Files that need logger import
const filesNeedingImport = new Set();

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: 0,
  errors: 0
};

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let modified = false;
    
    // Check if file already imports logger
    const hasLoggerImport = /import\s+.*\{.*logger.*\}.*from\s+['"].*logger['"]/.test(content);
    
    // Replace console statements
    Object.entries(replacements).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from.replace('.', '\\.')}\\s*\\(`, 'g');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        content = content.replace(regex, `${to}(`);
        modified = true;
        stats.replacements += matches.length;
        
        if (config.verbose) {
          console.log(`  Replacing ${matches.length} instances of ${from} in ${path.relative(config.rootDir, filePath)}`);
        }
      }
    });
    
    // Add logger import if needed and file was modified
    if (modified && !hasLoggerImport) {
      const importPath = calculateImportPath(filePath);
      const importStatement = `import { logger } from '${importPath}';\n`;
      
      // Try to add import after existing imports
      const importMatch = content.match(/((?:^import\s+.*\n)+)/m);
      if (importMatch) {
        const insertPosition = importMatch.index + importMatch[0].length;
        content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
      } else {
        // Add at the beginning if no imports found
        content = importStatement + '\n' + content;
      }
      
      filesNeedingImport.add(filePath);
    }
    
    // Write back if modified and not dry run
    if (modified) {
      if (!config.dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      stats.filesModified++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    stats.errors++;
    return false;
  }
}

function calculateImportPath(fromFile) {
  const loggerPath = path.join(config.rootDir, 'lib/logger');
  const fromDir = path.dirname(fromFile);
  let relativePath = path.relative(fromDir, loggerPath);
  
  // Convert to forward slashes and add ./ if needed
  relativePath = relativePath.replace(/\\/g, '/');
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  // Use @ alias if available for cleaner imports
  if (fromFile.includes('/app/') || fromFile.includes('/components/') || fromFile.includes('/stores/')) {
    return '@/lib/logger';
  }
  
  return relativePath;
}

function findFiles() {
  const files = [];
  
  config.patterns.forEach(pattern => {
    const matches = glob.sync(pattern, {
      cwd: config.rootDir,
      absolute: true,
      ignore: config.excludePatterns
    });
    files.push(...matches);
  });
  
  return [...new Set(files)]; // Remove duplicates
}

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('Console.log Replacement Report');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'ACTUAL REPLACEMENT'}`);
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Total replacements: ${stats.replacements}`);
  console.log(`Errors: ${stats.errors}`);
  
  if (filesNeedingImport.size > 0) {
    console.log(`\nFiles that ${config.dryRun ? 'would need' : 'needed'} logger import:`);
    filesNeedingImport.forEach(file => {
      console.log(`  - ${path.relative(config.rootDir, file)}`);
    });
  }
  
  if (config.dryRun) {
    console.log('\n⚠️  This was a dry run. Use without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Changes have been applied.');
  }
}

// Main execution
function main() {
  console.log('Starting console.log replacement...\n');
  
  const files = findFiles();
  console.log(`Found ${files.length} files to process\n`);
  
  files.forEach(file => {
    stats.filesProcessed++;
    processFile(file);
  });
  
  generateReport();
  
  // Exit with error code if there were errors
  if (stats.errors > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { processFile, findFiles };