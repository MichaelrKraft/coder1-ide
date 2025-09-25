#!/usr/bin/env node

/**
 * Audio Alert Diagnostics Script
 * Checks the current state of the sound alert system and tests functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔊 Audio Alert Diagnostics Tool');
console.log('================================');

// Check Claude Code settings
const settingsPath = path.join(__dirname, '..', '.claude', 'settings.json');
let hasStopHook = false;

try {
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    console.log('✅ Found .claude/settings.json');
    
    if (settings.hooks && settings.hooks.Stop) {
      hasStopHook = true;
      console.log('✅ Stop hook is configured');
    } else {
      console.log('❌ Stop hook is missing');
    }
  } else {
    console.log('❌ .claude/settings.json not found');
  }
} catch (error) {
  console.log('❌ Error reading settings:', error.message);
}

// Check if SoundAlertService files exist
const soundServicePaths = [
  path.join(__dirname, '..', 'coder1-ide-next', 'lib', 'sound-alert-service.ts'),
  path.join(__dirname, '..', 'coder1-ide', 'coder1-ide-source', 'src', 'services', 'SoundAlertService.ts')
];

let soundServiceExists = false;
for (const servicePath of soundServicePaths) {
  if (fs.existsSync(servicePath)) {
    console.log(`✅ SoundAlertService found at: ${servicePath}`);
    soundServiceExists = true;
    break;
  }
}

if (!soundServiceExists) {
  console.log('❌ SoundAlertService not found');
}

// Check terminal components
const terminalPaths = [
  path.join(__dirname, '..', 'coder1-ide-next', 'components', 'terminal', 'Terminal.tsx'),
  path.join(__dirname, '..', 'coder1-ide', 'coder1-ide-source', 'src', 'components', 'Terminal.tsx')
];

let terminalExists = false;
for (const terminalPath of terminalPaths) {
  if (fs.existsSync(terminalPath)) {
    console.log(`✅ Terminal component found at: ${terminalPath}`);
    
    // Check if it has the completion alert code
    const content = fs.readFileSync(terminalPath, 'utf8');
    if (content.includes('playCompletionAlert')) {
      console.log('✅ Terminal has completion alert integration');
    } else {
      console.log('❌ Terminal missing completion alert integration');
    }
    
    if (content.includes('duration > 20000')) {
      console.log('⚠️  Terminal has 20-second duration threshold');
    }
    
    terminalExists = true;
    break;
  }
}

if (!terminalExists) {
  console.log('❌ Terminal component not found');
}

console.log('\n📋 Summary & Recommendations:');
console.log('=============================');

if (!hasStopHook) {
  console.log('❌ ISSUE: Missing Stop hook in Claude Code settings');
  console.log('   SOLUTION: Restore Stop hook configuration');
}

console.log('⚠️  NOTE: Completion alerts only play for sessions > 20 seconds');
console.log('⚠️  NOTE: Audio alerts must be enabled in browser localStorage');

console.log('\n🔧 Next Steps:');
console.log('1. Check browser localStorage for soundAlertsEnabled setting');
console.log('2. Test sound functionality in the IDE');
console.log('3. Verify Claude Code sessions are long enough (> 20s)');
console.log('4. Add debugging to track completion events');

console.log('\n💡 To test sound alerts manually:');
console.log('   - Open IDE at http://localhost:3001/ide');
console.log('   - Open browser dev tools → Console');
console.log('   - Run: localStorage.getItem("soundAlertsEnabled")');
console.log('   - If null or false, run: localStorage.setItem("soundAlertsEnabled", "true")');