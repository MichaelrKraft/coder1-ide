#!/usr/bin/env node
require('dotenv').config({ path: '../.env.local' });

const { Octokit } = require('@octokit/rest');

async function createTestIssue() {
  console.log('🎯 Creating a realistic test issue...\n');
  
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  try {
    const issue = await octokit.issues.create({
      owner: 'MichaelrKraft',
      repo: 'coder1-ide',
      title: 'Feature Request: Add dark mode theme toggle',
      body: `Hey team! 👋

I've been using Coder1 IDE and absolutely love it! The eternal memory feature is a game-changer.

**Feature Request:**
Would it be possible to add a dark mode theme toggle? I often code late at night and would love to have a darker interface option.

**Suggested Implementation:**
- Toggle button in the settings
- Remember user preference across sessions
- Maybe offer a few theme options (dark, light, auto based on system)

Thanks for building such an awesome IDE! 🚀`,
      labels: ['enhancement', 'good first issue']
    });
    
    console.log('✅ Issue created successfully!');
    console.log(`\n📍 Issue #${issue.data.number}: ${issue.data.title}`);
    console.log(`🔗 URL: ${issue.data.html_url}`);
    console.log('\n⏱️  Agent should respond within 2 minutes');
    console.log('📧 Check support@callspot.ai for email notification');
    console.log('\n👀 Watch these:');
    console.log('   - GitHub issue for agent comment');
    console.log('   - Your email inbox for approval request');
    console.log('   - GitHub Actions: https://github.com/MichaelrKraft/coder1-ide/actions');
    
  } catch (error) {
    console.error('❌ Error creating issue:', error.message);
  }
}

createTestIssue();
