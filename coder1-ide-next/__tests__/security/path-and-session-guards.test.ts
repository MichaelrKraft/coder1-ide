/**
 * Regression tests for the Phase 2/3 security fixes (audit 2026-07-10).
 *
 * These cover the two pure guard primitives that the route fixes rely on:
 *   1. sessionId validation (checkpoint route, H1 traversal)
 *   2. path-containment with a trailing separator (files routes, H4 sibling bypass)
 *
 * They intentionally do NOT boot Next.js or the bridge — they lock the logic
 * that a traversal/enumeration attack would exploit. If these regress, the
 * route-level protections regress with them.
 */
import path from 'path';

// Mirror of the checkpoint route's SESSION_ID_RE guard. Kept in sync by intent;
// if the route's regex changes, update here and confirm the attack cases still fail.
const SESSION_ID_RE = /^[A-Za-z0-9_-]+$/;
function isValidSessionId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && SESSION_ID_RE.test(id);
}

// Mirror of the containment check used in the files routes.
function isContained(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, candidate);
  return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
}

describe('sessionId validation (checkpoint H1)', () => {
  it('accepts normal server-generated and client ids', () => {
    expect(isValidSessionId('session_1720000000000_a1b2c3')).toBe(true);
    expect(isValidSessionId('abc-123_DEF')).toBe(true);
  });

  it('rejects traversal and separator payloads', () => {
    for (const bad of ['../../etc', '..', 'a/b', 'a\\b', '/etc/passwd', 'x/../y', '']) {
      expect(isValidSessionId(bad)).toBe(false);
    }
  });

  it('rejects non-strings and over-long ids', () => {
    expect(isValidSessionId(undefined)).toBe(false);
    expect(isValidSessionId(null)).toBe(false);
    expect(isValidSessionId(123 as unknown)).toBe(false);
    expect(isValidSessionId('a'.repeat(129))).toBe(false);
  });
});

describe('path containment (files H4)', () => {
  const root = '/srv/app/project';

  it('allows the root itself and paths inside it', () => {
    expect(isContained(root, '.')).toBe(true);
    expect(isContained(root, 'src/index.ts')).toBe(true);
  });

  it('blocks the sibling-prefix bypass that a bare startsWith allows', () => {
    // The whole point of H4: `/srv/app/project-secrets` shares the string prefix
    // `/srv/app/project` but is NOT inside it.
    expect(isContained(root, '../project-secrets/creds')).toBe(false);
  });

  it('blocks traversal out of the root', () => {
    expect(isContained(root, '../../etc/passwd')).toBe(false);
    expect(isContained(root, '/etc/passwd')).toBe(false);
  });
});
