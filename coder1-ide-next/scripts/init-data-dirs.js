#!/usr/bin/env node

/**
 * Initialize data directories for Coder1 IDE
 * Ensures all required data directories exist
 */

const fs = require('fs').promises;
const path = require('path');

async function initializeDataDirectories() {
  const dataRoot = path.join(process.cwd(), 'data');
  
  const directories = [
    'usage',           // Token usage data
    'sessions',        // Session checkpoints
    'documentation',   // Documentation cache
    'analytics',       // Analytics data
    'hooks',          // Hook configurations
    'patterns'        // Detected patterns
  ];
  
  console.log('🗂️ Initializing data directories...');
  
  for (const dir of directories) {
    const dirPath = path.join(dataRoot, dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✅ ${dir}/`);
    } catch (error) {
      console.error(`❌ Failed to create ${dir}:`, error.message);
    }
  }
  
  // Create .gitignore for data directory
  const gitignorePath = path.join(dataRoot, '.gitignore');
  const gitignoreContent = `# Ignore all data files except this gitignore
*
!.gitignore
`;
  
  try {
    await fs.writeFile(gitignorePath, gitignoreContent);
    console.log('✅ Created data/.gitignore');
  } catch (error) {
    console.error('Failed to create .gitignore:', error.message);
  }
  
  console.log('✨ Data directories initialized');
}

// Run if called directly
if (require.main === module) {
  initializeDataDirectories().catch(console.error);
}

module.exports = { initializeDataDirectories };