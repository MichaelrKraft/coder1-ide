#!/usr/bin/env node
/**
 * Quick Test: Try \n instead of \r
 */

const { spawn } = require('node-pty');

console.log('🚀 Quick PTY Test - Using \\n instead of \\r\n');

const pty = spawn('/opt/homebrew/bin/claude', ['--model', 'claude-sonnet-4-5-20250929'], {
  name: 'xterm-color',
  cols: 100,
  rows: 30,
  cwd: process.cwd(),
  env: {
    ...process.env,
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN
  }
});

let welcomeReceived = false;

pty.onData((data) => {
  process.stdout.write(data);
  
  if (!welcomeReceived && data.includes('Welcome to Claude Code')) {
    welcomeReceived = true;
    console.log('\n\n✅ Welcome received, waiting 1 second then sending prompt...\n');
    
    setTimeout(() => {
      const prompt = 'Say "HELLO PTY" and nothing else.';
      console.log(`📤 Sending: "${prompt}\\n"\n`);
      
      pty.write(prompt);
      pty.write('\n');  // ← THIS IS THE KEY: \n instead of \r
      
      console.log('✅ Sent! Watching for response...\n');
    }, 1000);
  }
  
  if (data.includes('HELLO PTY')) {
    console.log('\n\n🎉🎉🎉 SUCCESS! Claude responded! \\n works! 🎉🎉🎉\n');
    process.exit(0);
  }
});

pty.onExit(({ exitCode }) => {
  console.log(`\n❌ PTY exited with code ${exitCode}`);
  process.exit(1);
});

setTimeout(() => {
  console.log('\n⏱️ Timeout - no response after 30 seconds');
  console.log('❌ Test failed');
  process.exit(1);
}, 30000);
