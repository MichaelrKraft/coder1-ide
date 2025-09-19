#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix syntax errors from incomplete console.log removals
const ROOT_DIR = process.cwd();
const PATTERNS = ['**/*.{ts,tsx,js,jsx}'];
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.next/**', 
  'dist/**',
  'build/**',
  'coverage/**',
  'scripts/**'
];

let filesFixed = 0;

function fixSyntaxErrors(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    
    // Fix pattern: // REMOVED: console.log('...', { 
    // followed by uncommented object properties
    const regex = /\/\/ REMOVED: console\.log\([^{]*\{\s*\n([^}]*\n)*\s*\}\);?/g;
    
    newContent = newContent.replace(regex, (match) => {
      // Comment out all lines in the match
      return match.split('\n').map(line => {
        if (line.trim() && !line.trim().startsWith('//')) {
          return '    // ' + line;
        }
        return line;
      }).join('\n');
    });
    
    // Fix incomplete console removals like (() => // REMOVED: console.log('...'))
    newContent = newContent.replace(
      /\(\(\) => \/\/ REMOVED: console\.log\([^)]*\)\)/g,
      '(() => {})'
    );
    
    // Fix dangling console.log calls that weren't properly removed
    newContent = newContent.replace(
      /console\.log\([^;]*\)/g,
      '// REMOVED: $&'
    );
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      filesFixed++;
      console.log(`✅ Fixed: ${path.relative(ROOT_DIR, filePath)}`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Main execution
console.log('🔧 Fixing console.log syntax errors...\n');

PATTERNS.forEach(pattern => {
  const files = glob.sync(pattern, {
    ignore: EXCLUDE_PATTERNS,
    cwd: ROOT_DIR,
    absolute: true
  });
  
  files.forEach(fixSyntaxErrors);
});

console.log(`\n📊 Fixed syntax errors in ${filesFixed} files`);