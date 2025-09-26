#!/usr/bin/env node
/**
 * Reject CLI Script
 * Usage: npm run agent:reject [queue-id] --reason "rejection reason"
 */

require('dotenv').config({ path: '../../.env.local' });

const ReviewQueue = require('../review-queue');

async function main() {
  const args = process.argv.slice(2);
  const queueId = args[0];
  
  if (!queueId) {
    console.error('❌ Error: Please provide a queue ID');
    console.log('Usage: npm run agent:reject [queue-id] --reason "why rejected"');
    process.exit(1);
  }
  
  // Check for reason flag
  const reasonIndex = args.indexOf('--reason');
  const reason = reasonIndex > -1 ? args.slice(reasonIndex + 1).join(' ') : 'No reason provided';
  
  const queue = new ReviewQueue();
  
  try {
    // Get the item details first
    const item = await queue.get(queueId);
    console.log(`\n📋 Rejecting: ${item.type} for issue #${item.issue_number}`);
    
    // Reject the item
    await queue.reject(queueId, reason);
    
    console.log(`\n❌ Successfully rejected!`);
    console.log(`📝 Reason: ${reason}`);
    console.log(`📊 Queue stats:`, await queue.getStats());
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);