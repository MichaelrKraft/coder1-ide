#!/usr/bin/env node
/**
 * Setup ManusLive for Coder1 Alpha
 *
 * Creates symlink from ~/.coder1/manuslive to the ManusLive installation.
 * This allows Coder1 to auto-start ManusLive daemon for Johnny5 autonomy.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CODER1_DIR = path.join(os.homedir(), '.coder1');
const MANUSLIVE_LINK = path.join(CODER1_DIR, 'manuslive');

// Check for custom path from environment
const MANUSLIVE_SOURCE = process.env.MANUSLIVE_PATH ||
  path.join(os.homedir(), 'manuslive/manuslive');

console.log('🔧 Setting up ManusLive for Coder1...\n');

// 1. Ensure .coder1 directory exists
if (!fs.existsSync(CODER1_DIR)) {
  fs.mkdirSync(CODER1_DIR, { recursive: true });
  console.log(`✅ Created ~/.coder1 directory`);
}

// 2. Check if ManusLive source exists
if (!fs.existsSync(MANUSLIVE_SOURCE)) {
  console.log(`⚠️  ManusLive not found at: ${MANUSLIVE_SOURCE}`);
  console.log('');
  console.log('To install ManusLive:');
  console.log('  git clone <manuslive-repo> ~/manuslive/manuslive');
  console.log('  cd ~/manuslive/manuslive && npm install && npm run build');
  console.log('');
  console.log('Or set MANUSLIVE_PATH environment variable to your installation.');
  console.log('');
  console.log('Johnny5 will work without ManusLive (uses Bridge or Gemini fallback).');
  process.exit(0); // Not an error - ManusLive is optional
}

// 3. Create/update symlink
try {
  // Remove existing symlink if present
  if (fs.existsSync(MANUSLIVE_LINK)) {
    const stats = fs.lstatSync(MANUSLIVE_LINK);
    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(MANUSLIVE_LINK);
      if (currentTarget === MANUSLIVE_SOURCE) {
        console.log(`✅ ManusLive symlink already exists and is correct`);
        console.log(`   ${MANUSLIVE_LINK} → ${MANUSLIVE_SOURCE}`);
        process.exit(0);
      }
      // Different target - remove and recreate
      fs.unlinkSync(MANUSLIVE_LINK);
    } else {
      console.error(`❌ ${MANUSLIVE_LINK} exists but is not a symlink`);
      console.error('   Please remove it manually and run setup again.');
      process.exit(1);
    }
  }

  // Create symlink
  fs.symlinkSync(MANUSLIVE_SOURCE, MANUSLIVE_LINK);
  console.log(`✅ Created ManusLive symlink:`);
  console.log(`   ${MANUSLIVE_LINK} → ${MANUSLIVE_SOURCE}`);
  console.log('');
  console.log('ManusLive is now configured for Coder1!');
  console.log('Johnny5 will auto-start ManusLive daemon when Coder1 launches.');

} catch (err) {
  console.error(`❌ Failed to create symlink: ${err.message}`);
  process.exit(1);
}
