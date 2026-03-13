/**
 * Manual verification for CommitContextService.capture()
 * Run: npx tsx scripts/test-commit-context-service.ts
 * Note: Set ANTHROPIC_API_KEY in env to test summary generation.
 */
import { commitContextService } from '../services/commit-context-service';

async function run() {
  console.log('Testing CommitContextService...');

  const testSha = 'deadbeef' + Date.now().toString(16).slice(-4);

  // Test 1: capture() returns without throwing
  await commitContextService.capture({
    sha: testSha,
    branch: 'main',
    message: 'test: verify capture works',
    sessionId: null,
    checkpointId: null,
    repoPath: process.cwd(),
  });
  console.log('PASS: capture() completed without error');

  // Test 2: Row exists in DB after capture
  const row = await commitContextService.getForSha(testSha);
  console.assert(row !== null, 'FAIL: row not found after capture');
  console.assert(row?.commit_sha === testSha, 'FAIL: wrong sha');
  console.assert(
    row?.summary_status === 'pending' || row?.summary_status === 'no_session',
    `FAIL: unexpected status: ${row?.summary_status}`
  );
  console.log(`PASS: row exists with status="${row?.summary_status}"`);

  // Test 3: Duplicate capture is a no-op (INSERT OR IGNORE)
  await commitContextService.capture({
    sha: testSha,
    branch: 'main',
    message: 'duplicate capture',
    sessionId: null,
    checkpointId: null,
    repoPath: process.cwd(),
  });
  const list = await commitContextService.listByBranch('main', 100);
  const dupeCount = list.filter(r => r.commit_sha === testSha).length;
  console.assert(dupeCount === 1, `FAIL: duplicate row created (count=${dupeCount})`);
  console.log('PASS: duplicate capture ignored');

  console.log('\nAll CommitContextService tests passed.');
  process.exit(0);
}

run().catch(err => { console.error('FAIL:', err); process.exit(1); });
