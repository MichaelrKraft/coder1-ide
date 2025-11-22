#!/usr/bin/env node

/**
 * Backfill Embeddings for Existing Conversations
 * 
 * This script generates embeddings for all conversations that don't have them yet.
 * Safe to run multiple times - only processes conversations with NULL embeddings.
 * 
 * Usage: node scripts/backfill-embeddings.js
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// OpenAI API integration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 20; // Process 20 at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  console.error('   Please add your OpenAI API key to .env.local');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'db', 'context-memory.db');

async function generateEmbedding(text) {
  // Preprocess text (same as embedding-service.ts)
  const cleanText = text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);

  if (!cleanText) {
    return null;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        input: cleanText,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error(`   ⚠️  Failed to generate embedding: ${error.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillEmbeddings() {
  console.log('🚀 Starting embedding backfill process...\n');

  let db;
  try {
    // Open database connection
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Count conversations needing embeddings
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM claude_conversations WHERE embedding IS NULL'
    ).get();

    const totalCount = countResult.count;

    if (totalCount === 0) {
      console.log('✅ All conversations already have embeddings!');
      db.close();
      return;
    }

    console.log(`📊 Found ${totalCount} conversations without embeddings`);
    console.log(`💰 Estimated cost: ~$${(totalCount * 400 * 0.00000002).toFixed(4)}\n`);

    // Get all conversations without embeddings
    const conversations = db.prepare(
      `SELECT id, user_input, claude_reply 
       FROM claude_conversations 
       WHERE embedding IS NULL 
       ORDER BY timestamp ASC`
    ).all();

    // Prepare update statement
    const updateStmt = db.prepare(
      'UPDATE claude_conversations SET embedding = ? WHERE id = ?'
    );

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < conversations.length; i += BATCH_SIZE) {
      const batch = conversations.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(conversations.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} conversations)...`);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (conv) => {
          const combinedText = `${conv.user_input} ${conv.claude_reply}`;
          const embedding = await generateEmbedding(combinedText);
          
          if (embedding) {
            // Update database within transaction
            const transaction = db.transaction(() => {
              updateStmt.run(JSON.stringify(embedding), conv.id);
            });
            transaction();
            return { id: conv.id, success: true };
          } else {
            return { id: conv.id, success: false };
          }
        })
      );

      // Count results
      results.forEach(result => {
        processed++;
        if (result.status === 'fulfilled' && result.value.success) {
          successful++;
          process.stdout.write('.');
        } else {
          failed++;
          process.stdout.write('x');
        }
      });

      // Progress update
      const percentage = Math.round((processed / totalCount) * 100);
      console.log(`\n   Progress: ${processed}/${totalCount} (${percentage}%)`);
      console.log(`   ✅ Successful: ${successful} | ❌ Failed: ${failed}`);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < conversations.length) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKFILL COMPLETE!\n');
    console.log(`📊 Results:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Successful: ${successful} (${Math.round((successful/processed)*100)}%)`);
    console.log(`   Failed: ${failed} (${Math.round((failed/processed)*100)}%)`);
    
    // Verify final state
    const finalCount = db.prepare(
      'SELECT COUNT(*) as count FROM claude_conversations WHERE embedding IS NOT NULL'
    ).get();
    console.log(`\n🎯 Database state:`);
    console.log(`   Conversations with embeddings: ${finalCount.count}`);
    console.log(`   Conversations without embeddings: ${totalCount - successful}`);

    if (failed > 0) {
      console.log(`\n⚠️  Note: ${failed} conversations failed to get embeddings.`);
      console.log(`   You can re-run this script to retry failed conversations.`);
    }

    console.log('\n🚀 Semantic search is now ready!');
    console.log('   Restart your server to use the new embeddings.');

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    console.error('   Database was not modified for this batch.');
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run the backfill
backfillEmbeddings().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
