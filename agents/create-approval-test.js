#!/usr/bin/env node
require('dotenv').config({ path: '../.env.local' });

const { Octokit } = require('@octokit/rest');

async function createApprovalTest() {
  console.log('🎯 Creating test issue for email approval workflow...\n');
  
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  try {
    const issue = await octokit.issues.create({
      owner: 'MichaelrKraft',
      repo: 'coder1-ide',
      title: 'Bug Report: Terminal not responding to keyboard input',
      body: `**Describe the bug:**
When I open the integrated terminal in Coder1 IDE, I can see the terminal window but it doesn't respond to any keyboard input. The cursor just blinks but nothing happens when I type.

**Steps to reproduce:**
1. Open Coder1 IDE
2. Click on terminal panel
3. Try to type commands
4. Nothing appears

**Expected behavior:**
Terminal should accept keyboard input and execute commands.

**Environment:**
- OS: macOS Sonoma 14.5
- Coder1 IDE version: Latest from GitHub
- Browser: Chrome 120

**Additional context:**
This started happening after the latest update. It was working fine before.`,
      labels: ['bug']
    });
    
    console.log('✅ Issue created successfully!');
    console.log(`\n📍 Issue #${issue.data.number}: ${issue.data.title}`);
    console.log(`🔗 URL: ${issue.data.html_url}`);
    console.log('\n⏱️  Within 2 minutes you should receive:');
    console.log('   📧 Email at support@callspot.ai with approval request');
    console.log('   📋 Draft response for you to review');
    console.log('   🎯 Options: APPROVE, EDIT, or REJECT');
    console.log('\n👀 Monitor:');
    console.log('   - Your email inbox (support@callspot.ai)');
    console.log('   - GitHub Actions: https://github.com/MichaelrKraft/coder1-ide/actions');
    
  } catch (error) {
    console.error('❌ Error creating issue:', error.message);
  }
}

createApprovalTest();
