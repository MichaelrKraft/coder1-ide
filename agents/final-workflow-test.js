#!/usr/bin/env node
require('dotenv').config({ path: '../.env.local' });
const { Octokit } = require('@octokit/rest');

async function triggerWorkflow() {
  console.log('🎯 Creating final test issue to trigger GitHub Actions...\n');
  
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  const issue = await octokit.issues.create({
    owner: 'MichaelrKraft',
    repo: 'coder1-ide',
    title: 'Email Workflow Test: Does the autonomous agent send emails?',
    body: `This is a test issue to verify the email approval workflow is working.

The agent should:
1. Detect this new issue via GitHub Actions
2. Generate an AI response using Claude
3. Send an email to support@callspot.ai with the draft
4. Include APPROVE/EDIT/REJECT options

Let's see if it works! 🤞`,
    labels: ['test']
  });
  
  console.log('✅ Test issue #' + issue.data.number + ' created!');
  console.log('🔗', issue.data.html_url);
  console.log('\n⏱️  Wait 2-3 minutes and check:');
  console.log('   📧 support@callspot.ai inbox');
  console.log('   🔍 https://github.com/MichaelrKraft/coder1-ide/actions');
  console.log('\n💡 If no workflow appears in Actions tab:');
  console.log('   The workflow might need manual activation on GitHub');
}

triggerWorkflow().catch(e => console.error('Error:', e.message));
