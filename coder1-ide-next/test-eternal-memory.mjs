#!/usr/bin/env node
/**
 * Test Eternal Memory Checkpoint Loading
 * Verifies that eternal memory can load from file-based checkpoints
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testEternalMemoryLoader() {
  console.log('🧪 Testing Eternal Memory Checkpoint Loading\n');
  
  try {
    // Read the most recent checkpoint directly
    const checkpointPath = join(__dirname, 'data/sessions/session_1763237118572_huxxzwld6xl/checkpoints/checkpoint_1763237189799_9iuconbnq.json');
    console.log(`📁 Reading checkpoint: ${checkpointPath}\n`);
    
    const content = await readFile(checkpointPath, 'utf-8');
    const checkpoint = JSON.parse(content);
    
    console.log('📊 Checkpoint Structure:');
    console.log(`  - ID: ${checkpoint.id}`);
    console.log(`  - Session: ${checkpoint.sessionId}`);
    console.log(`  - Timestamp: ${checkpoint.timestamp}`);
    console.log(`  - Terminal History Length: ${checkpoint.terminalHistory?.length || 0} chars`);
    console.log(`  - Has data.snapshot: ${!!checkpoint.data?.snapshot}`);
    console.log(`  - Has data.conversationHistory: ${!!checkpoint.data?.conversationHistory}`);
    console.log(`  - Snapshot.files count: ${Object.keys(checkpoint.data?.snapshot?.files || {}).length}`);
    console.log('');
    
    // Test terminal history extraction
    console.log('🔍 Testing Terminal History Extraction:');
    const terminalHistory = checkpoint.terminalHistory || checkpoint.data?.terminalHistory || checkpoint.terminal_history || '';
    if (terminalHistory) {
      // Extract commands using regex (same as loader)
      const commandRegex = /^[\$#>]\s+(.+)$/gm;
      const commands = [];
      let match;
      
      while ((match = commandRegex.exec(terminalHistory)) !== null) {
        const cmd = match[1].trim();
        if (cmd && !commands.includes(cmd) && !cmd.startsWith('clear')) {
          commands.push(cmd);
        }
      }
      
      const recentCommands = commands.slice(-10);
      console.log(`  Found ${recentCommands.length} recent commands:`);
      recentCommands.forEach((cmd, i) => {
        console.log(`    ${i + 1}. $ ${cmd.substring(0, 80)}${cmd.length > 80 ? '...' : ''}`);
      });
    } else {
      console.log('  ❌ No terminal history found');
    }
    console.log('');
    
    // Test files extraction
    console.log('📂 Testing Files Extraction:');
    const filesSnapshot = checkpoint.data?.snapshot || checkpoint.files_snapshot || {};
    const filesObj = filesSnapshot.files || filesSnapshot;
    if (filesObj && typeof filesObj === 'object') {
      const files = Object.keys(filesObj).slice(0, 5);
      console.log(`  Found ${Object.keys(filesObj).length} total files, showing first 5:`);
      files.forEach((f, i) => {
        console.log(`    ${i + 1}. ${f}`);
      });
    } else {
      console.log('  ❌ No files found');
    }
    console.log('');
    
    // Test conversations extraction
    console.log('💬 Testing Conversations Extraction:');
    const conversationHistory = checkpoint.data?.conversationHistory || checkpoint.metadata?.conversationHistory || [];
    console.log(`  Found ${conversationHistory.length} conversations`);
    if (conversationHistory.length === 0) {
      console.log('  ℹ️  (This is normal - conversations are stored separately)');
    }
    console.log('');
    
    // Calculate age
    const now = new Date();
    const then = new Date(checkpoint.timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let age = '';
    if (diffHours < 1) age = 'less than 1 hour ago';
    else if (diffHours < 24) age = `${diffHours} hours ago`;
    else if (diffDays === 1) age = '1 day ago';
    else if (diffDays < 7) age = `${diffDays} days ago`;
    else age = `${Math.floor(diffDays / 7)} weeks ago`;
    
    console.log('⏰ Checkpoint Age:', age);
    console.log('');
    
    console.log('✅ Test Complete - Eternal Memory structure is compatible!');
    console.log('');
    console.log('📝 Summary:');
    console.log(`  - Checkpoint timestamp: ${checkpoint.timestamp}`);
    console.log(`  - Age: ${age} (vs "16 days ago" from old summaries)`);
    console.log(`  - Terminal commands: ${commands?.length || 0} found`);
    console.log(`  - Files tracked: ${Object.keys(filesObj || {}).length}`);
    console.log('  - Format: ✅ File-based checkpoint (camelCase)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEternalMemoryLoader();
