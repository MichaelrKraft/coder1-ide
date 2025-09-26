#!/usr/bin/env node
/**
 * Approval CLI Script
 * Usage: npm run agent:approve [queue-id]
 *        npm run agent:approve [queue-id] --edit "edited content"
 */

require('dotenv').config({ path: '../../.env.local' });

const ReviewQueue = require('../review-queue');
const { Octokit } = require('@octokit/rest');

async function main() {
  const args = process.argv.slice(2);
  const queueId = args[0];
  
  if (!queueId) {
    console.error('❌ Error: Please provide a queue ID');
    console.log('Usage: npm run agent:approve [queue-id]');
    process.exit(1);
  }
  
  // Check for edit flag
  const editIndex = args.indexOf('--edit');
  const editedContent = editIndex > -1 ? args.slice(editIndex + 1).join(' ') : null;
  
  const queue = new ReviewQueue();
  
  try {
    // Get the item details first
    const item = await queue.get(queueId);
    console.log(`\n📋 Approving: ${item.type} for issue #${item.issue_number}`);
    
    // Approve the item
    const approved = await queue.approve(queueId, editedContent);
    
    // Post to GitHub
    if (approved.type === 'issue_response') {
      await postIssueComment(approved);
    } else if (approved.type === 'pr_comment') {
      await postPRComment(approved);
    }
    
    // Mark as executed
    await queue.markExecuted(queueId);
    
    console.log(`\n✅ Successfully approved and posted!`);
    console.log(`📊 Queue stats:`, await queue.getStats());
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

async function postIssueComment(item) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  console.log(`\n📮 Posting to issue #${item.issue_number}...`);
  
  try {
    const response = await octokit.issues.createComment({
      owner: process.env.GITHUB_OWNER || 'MichaelrKraft',
      repo: process.env.GITHUB_REPO || 'coder1-ide',
      issue_number: item.issue_number,
      body: item.draft_response
    });
    
    console.log(`✅ Posted: ${response.data.html_url}`);
    
    // Add suggested labels if any
    if (item.metadata?.labels?.length > 0) {
      try {
        await octokit.issues.addLabels({
          owner: process.env.GITHUB_OWNER || 'MichaelrKraft',
          repo: process.env.GITHUB_REPO || 'coder1-ide',
          issue_number: item.issue_number,
          labels: item.metadata.labels
        });
        console.log(`🏷️ Added labels: ${item.metadata.labels.join(', ')}`);
      } catch (labelError) {
        console.warn(`⚠️ Could not add labels:`, labelError.message);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to post to GitHub:`, error.message);
    throw error;
  }
}

async function postPRComment(item) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  console.log(`\n📮 Posting to PR #${item.pr_number}...`);
  
  try {
    const response = await octokit.pulls.createReview({
      owner: process.env.GITHUB_OWNER || 'MichaelrKraft',
      repo: process.env.GITHUB_REPO || 'coder1-ide',
      pull_number: item.pr_number,
      body: item.draft_response,
      event: 'COMMENT'
    });
    
    console.log(`✅ Posted: ${response.data.html_url}`);
  } catch (error) {
    console.error(`❌ Failed to post to GitHub:`, error.message);
    throw error;
  }
}

// Run the script
main().catch(console.error);