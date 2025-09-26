#!/usr/bin/env node
/**
 * Review CLI Script
 * Shows all pending items for review
 * Usage: npm run agent:review
 */

require('dotenv').config({ path: '../../.env.local' });

const ReviewQueue = require('../review-queue');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const queue = new ReviewQueue();
  
  console.log('\n🔍 CODER1 AGENT REVIEW DASHBOARD');
  console.log('='.repeat(50));
  
  // Get queue statistics
  const stats = await queue.getStats();
  console.log(`\n📊 Queue Status:`);
  console.log(`   Pending: ${stats.pending} items`);
  console.log(`   Approved: ${stats.approved} ready to execute`);
  console.log(`   Rejected: ${stats.rejected} items`);
  
  // Get pending items
  const pending = await queue.getPending();
  
  if (pending.length === 0) {
    console.log('\n✨ No items pending review!');
    rl.close();
    return;
  }
  
  console.log(`\n📋 Pending Items:`);
  console.log('-'.repeat(50));
  
  for (const item of pending) {
    displayItem(item);
  }
  
  // Show commands
  console.log('\n📝 Commands:');
  console.log('   npm run agent:approve [id]       - Approve an item');
  console.log('   npm run agent:approve [id] --edit "new content" - Approve with edits');
  console.log('   npm run agent:reject [id]        - Reject an item');
  console.log('   npm run agent:execute            - Execute all approved items');
  console.log('');
  
  rl.close();
}

function displayItem(item) {
  const priority = item.metadata?.priority || 'normal';
  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  
  console.log(`\n${priorityEmoji} ID: ${item.id}`);
  console.log(`   Type: ${item.type}`);
  
  if (item.type === 'issue_response') {
    console.log(`   Issue: #${item.issue_number} - ${item.issue_title}`);
    console.log(`   Author: @${item.issue_author}`);
  }
  
  console.log(`   Confidence: ${(item.confidence * 100).toFixed(0)}%`);
  console.log(`   Created: ${new Date(item.queued_at).toLocaleString()}`);
  console.log(`   Labels: ${item.metadata?.labels?.join(', ') || 'none'}`);
  
  console.log(`\n   Draft Response (first 200 chars):`);
  console.log(`   "${item.draft_response.substring(0, 200)}..."`);
  console.log('-'.repeat(50));
}

// Run the script
main().catch(console.error);