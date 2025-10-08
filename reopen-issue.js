const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '../.env.local' });

async function reopenIssue() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  console.log('🔄 Closing issue #7...');
  await octokit.issues.update({
    owner: 'MichaelrKraft',
    repo: 'coder1-ide',
    issue_number: 7,
    state: 'closed'
  });
  
  console.log('⏱️  Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('🔓 Reopening issue #7 to trigger workflow...');
  await octokit.issues.update({
    owner: 'MichaelrKraft',
    repo: 'coder1-ide',
    issue_number: 7,
    state: 'open'
  });
  
  console.log('✅ Issue #7 reopened!');
  console.log('\n⏱️  Check in 2 minutes:');
  console.log('   📧 support@callspot.ai');
  console.log('   🔍 https://github.com/MichaelrKraft/coder1-ide/actions');
}

reopenIssue().catch(e => console.error('Error:', e.message));
