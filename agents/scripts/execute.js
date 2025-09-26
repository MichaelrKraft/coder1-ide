#!/usr/bin/env node
/**
 * Execute Script
 * Executes all approved items in the queue
 * Usage: npm run agent:execute
 */

require('dotenv').config({ path: '../../.env.local' });

const ReviewQueue = require('../review-queue');
const { Octokit } = require('@octokit/rest');

async function main() {
  const queue = new ReviewQueue();
  
  console.log('\n🚀 EXECUTING APPROVED ITEMS');
  console.log('='.repeat(50));
  
  // Get all approved items
  const approved = await queue.getApproved();
  
  if (approved.length === 0) {
    console.log('\n✨ No approved items to execute!');
    return;
  }
  
  console.log(`\n📋 Found ${approved.length} approved items to execute\n`);
  
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  let executed = 0;
  let failed = 0;
  
  for (const item of approved) {
    try {
      console.log(`\n🔄 Executing: ${item.type} (ID: ${item.id})`);
      
      if (item.type === 'issue_response') {
        await executeIssueResponse(octokit, item);
      } else if (item.type === 'pr_comment') {
        await executePRComment(octokit, item);
      } else if (item.type === 'blog_post') {
        await executeBlogPost(item);
      } else {
        console.warn(`⚠️ Unknown type: ${item.type}`);
        continue;
      }
      
      // Mark as executed
      await queue.markExecuted(item.id);
      executed++;
      console.log(`✅ Executed successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to execute:`, error.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Execution Summary:`);
  console.log(`   ✅ Executed: ${executed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  // Show updated stats
  const stats = await queue.getStats();
  console.log(`\n📈 Updated Queue Status:`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Approved: ${stats.approved}`);
  console.log(`   Rejected: ${stats.rejected}`);
}

async function executeIssueResponse(octokit, item) {
  console.log(`   Posting to issue #${item.issue_number}...`);
  
  const response = await octokit.issues.createComment({
    owner: process.env.GITHUB_OWNER || 'MichaelrKraft',
    repo: process.env.GITHUB_REPO || 'coder1-ide',
    issue_number: item.issue_number,
    body: item.draft_response
  });
  
  console.log(`   Posted: ${response.data.html_url}`);
  
  // Add labels if suggested
  if (item.metadata?.labels?.length > 0) {
    try {
      await octokit.issues.addLabels({
        owner: process.env.GITHUB_OWNER || 'MichaelrKraft',
        repo: process.env.GITHUB_REPO || 'coder1-ide',
        issue_number: item.issue_number,
        labels: item.metadata.labels
      });
      console.log(`   Added labels: ${item.metadata.labels.join(', ')}`);
    } catch (labelError) {
      console.warn(`   ⚠️ Could not add labels:`, labelError.message);
    }
  }
}

async function executePRComment(octokit, item) {
  console.log(`   Posting to PR #${item.pr_number}...`);
  
  const response = await octokit.pulls.createReview({
    owner: process.env.GITHUB_OWNER || 'MichaelrKraft',
    repo: process.env.GITHUB_REPO || 'coder1-ide',
    pull_number: item.pr_number,
    body: item.draft_response,
    event: 'COMMENT'
  });
  
  console.log(`   Posted: ${response.data.html_url}`);
}

async function executeBlogPost(item) {
  console.log(`   Publishing blog post: ${item.title}`);
  // TODO: Implement blog post publishing
  // This could post to a CMS, create a GitHub Pages post, etc.
  console.log(`   Blog post publishing not yet implemented`);
}

// Run the script
main().catch(console.error);