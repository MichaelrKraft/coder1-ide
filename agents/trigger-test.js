#!/usr/bin/env node
require('dotenv').config({ path: '../.env.local' });

const { Octokit } = require('@octokit/rest');
const DirectPoster = require('./github-direct-poster');

async function triggerTest() {
  console.log('🔍 Finding your test issue...\n');
  
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  try {
    // Get the most recent issue
    const { data: issues } = await octokit.issues.listForRepo({
      owner: 'MichaelrKraft',
      repo: 'coder1-ide',
      state: 'open',
      sort: 'created',
      direction: 'desc',
      per_page: 5
    });
    
    console.log(`Found ${issues.length} recent open issues:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. #${issue.number}: ${issue.title}`);
    });
    
    const testIssue = issues.find(i => i.title.includes('Test'));
    
    if (!testIssue) {
      console.log('\n❌ No test issue found. Please create one.');
      return;
    }
    
    console.log(`\n✅ Found test issue #${testIssue.number}: ${testIssue.title}`);
    console.log('🤖 Generating AI response...\n');
    
    const poster = new DirectPoster();
    const result = await poster.respondToIssue(testIssue);
    
    console.log('✅ Response posted successfully!');
    console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
    console.log(`\n🔗 View issue: ${testIssue.html_url}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

triggerTest();
