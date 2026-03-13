/**
 * Manual verification script for commit-context-db.ts
 * Run: npx tsx scripts/test-commit-context-db.ts
 */
import {
  initCommitContextTable,
  insertCommitContext,
  getCommitContext,
  listCommitContexts,
  updateSummaryStatus,
  getPendingCommits,
} from '../lib/commit-context-db';

async function run() {
  console.log('Testing commit-context-db...');

  // Test 1: Table init (idempotent)
  const db = await initCommitContextTable();
  console.assert(db !== null, 'FAIL: initCommitContextTable returned null');
  console.log('PASS: initCommitContextTable');

  // Test 2: Insert
  const testSha = 'abc' + Date.now().toString(36);
  await insertCommitContext(db, {
    id: `cc_test_${Date.now()}`,
    commit_sha: testSha,
    branch: 'main',
    commit_message: 'test commit',
    summary_status: 'pending',
  });
  console.log('PASS: insertCommitContext');

  // Test 3: Get by SHA
  const row = await getCommitContext(db, testSha);
  console.assert(row?.commit_sha === testSha, 'FAIL: getCommitContext wrong sha');
  console.assert(row?.summary_status === 'pending', 'FAIL: wrong status');
  console.log('PASS: getCommitContext');

  // Test 4: Update status
  await updateSummaryStatus(db, testSha, 'done', 'Test summary text');
  const updated = await getCommitContext(db, testSha);
  console.assert(updated?.summary_status === 'done', 'FAIL: status not updated');
  console.assert(updated?.session_summary === 'Test summary text', 'FAIL: summary not saved');
  console.log('PASS: updateSummaryStatus');

  // Test 5: List
  const list = await listCommitContexts(db, { limit: 10 });
  console.assert(list.length >= 1, 'FAIL: listCommitContexts empty');
  console.log('PASS: listCommitContexts');

  // Test 6: Duplicate insert is ignored
  await insertCommitContext(db, {
    id: `cc_test_dup_${Date.now()}`,
    commit_sha: testSha,
    branch: 'main',
    commit_message: 'duplicate',
    summary_status: 'pending',
  });
  const dupeCheck = await listCommitContexts(db, { limit: 100 });
  const shaCount = dupeCheck.filter(r => r.commit_sha === testSha).length;
  console.assert(shaCount === 1, `FAIL: duplicate row inserted (count=${shaCount})`);
  console.log('PASS: duplicate insert ignored (INSERT OR IGNORE)');

  db.close();
  console.log('\nAll tests passed.');
}

run().catch(err => { console.error('FAIL:', err); process.exit(1); });
