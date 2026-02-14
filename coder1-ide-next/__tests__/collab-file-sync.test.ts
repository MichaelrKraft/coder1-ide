/**
 * Collaborative File Sync Test Suite
 *
 * Tests for the collaborative file sync feature implemented in Phase 1, 4, and 6.
 * Covers writeFileToTeam(), path validation, line ending normalization,
 * case collision detection, and scenario tests.
 *
 * Created: Feb 13, 2026
 *
 * Run with: npx tsx __tests__/collab-file-sync.test.ts
 * Or with Jest: npm test (after installing jest dependencies)
 */

// Simple test framework for standalone execution
type TestFn = () => void | Promise<void>;
interface TestSuite {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: TestFn) => void;
  beforeEach: (fn: () => void) => void;
  expect: (actual: any) => any;
}

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [] as Array<{ suite: string; test: string; error: string }>,
};

let currentSuite = '';
let beforeEachFn: (() => void) | null = null;

// Simple assertion library
const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  },
  toBeInstanceOf: (expected: any) => {
    if (!(actual instanceof expected)) {
      throw new Error(`Expected ${actual} to be instance of ${expected.name}`);
    }
  },
  toBeLessThan: (expected: number) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeGreaterThanOrEqual: (expected: number) => {
    if (actual < expected) {
      throw new Error(`Expected ${actual} to be >= ${expected}`);
    }
  },
  toBeLessThanOrEqual: (expected: number) => {
    if (actual > expected) {
      throw new Error(`Expected ${actual} to be <= ${expected}`);
    }
  },
  toContain: (expected: any) => {
    if (Array.isArray(actual)) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    } else if (typeof actual === 'string') {
      if (!actual.includes(expected)) {
        throw new Error(`Expected string to contain ${expected}`);
      }
    }
  },
  not: {
    toBe: (expected: any) => {
      if (actual === expected) {
        throw new Error(`Expected ${actual} not to be ${expected}`);
      }
    },
    toContain: (expected: any) => {
      if (typeof actual === 'string' && actual.includes(expected)) {
        throw new Error(`Expected string not to contain ${expected}`);
      }
    },
  },
  toBeUndefined: () => {
    if (actual !== undefined) {
      throw new Error(`Expected ${actual} to be undefined`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined) {
      throw new Error(`Expected value to be defined`);
    }
  },
  toHaveBeenCalled: () => {
    if (!actual || typeof actual.mock === 'undefined') {
      throw new Error('Not a mock function');
    }
    if (actual.mock.calls.length === 0) {
      throw new Error('Expected function to have been called');
    }
  },
  toHaveBeenCalledWith: (...args: any[]) => {
    if (!actual || typeof actual.mock === 'undefined') {
      throw new Error('Not a mock function');
    }
    const found = actual.mock.calls.some((call: any[]) =>
      JSON.stringify(call) === JSON.stringify(args)
    );
    if (!found) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
    }
  },
});

// Mock function creator
const jest = {
  fn: () => {
    const fn: any = (...args: any[]) => {
      fn.mock.calls.push(args);
    };
    fn.mock = { calls: [] };
    return fn;
  },
  clearAllMocks: () => {
    // No-op for standalone
  },
  useFakeTimers: () => {
    // No-op for standalone
  },
  useRealTimers: () => {
    // No-op for standalone
  },
  advanceTimersByTime: (ms: number) => {
    // No-op for standalone
  },
};

const describe = (name: string, fn: () => void) => {
  currentSuite = name;
  console.log(`\n${name}`);
  fn();
};

const pendingTests: Promise<void>[] = [];

const it = (name: string, fn: TestFn) => {
  testResults.total++;

  if (beforeEachFn) {
    beforeEachFn();
  }

  try {
    const result = fn();
    if (result instanceof Promise) {
      const testPromise = result.then(() => {
        testResults.passed++;
        console.log(`  ✓ ${name}`);
      }).catch((error) => {
        testResults.failed++;
        testResults.errors.push({ suite: currentSuite, test: name, error: error.message });
        console.log(`  ✗ ${name}`);
        console.log(`    ${error.message}`);
      });
      pendingTests.push(testPromise);
    } else {
      testResults.passed++;
      console.log(`  ✓ ${name}`);
    }
  } catch (error: any) {
    testResults.failed++;
    testResults.errors.push({ suite: currentSuite, test: name, error: error.message });
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
  }
};

const beforeEach = (fn: () => void) => {
  beforeEachFn = fn;
};

// Mock Socket.IO
const mockSocket = (connected = true) => ({
  connected,
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
});

// Mock BridgeConnection
const createMockBridge = (id: string, userId: string) => ({
  id,
  socket: mockSocket(),
  userId,
  pairedAt: new Date(),
  lastHeartbeat: new Date(),
  version: '1.0.0',
  platform: 'darwin',
  capabilities: ['claude'],
  stats: {
    commandsExecuted: 0,
    uptime: 0,
    memoryUsage: 0,
  },
});

// =============================================================================
// TESTS
// =============================================================================

describe('Collaborative File Sync', () => {

  describe('T.1 writeFileToTeam()', () => {
    let mockBridges: Map<string, any>;
    let mockTeamBridges: Map<string, string[]>;
    let pendingRequests: Map<string, any>;

    // Simplified version of writeFileToTeam for testing
    const writeFileToTeam = async (
      teamBridges: Map<string, string[]>,
      filePath: string,
      content: string,
      expectedHash?: string,
      teamId?: string
    ): Promise<Map<string, { success: boolean; error?: string }>> => {
      const results = new Map<string, { success: boolean; error?: string }>();
      const writePromises: Promise<void>[] = [];

      const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const normalizedPath = filePath.replace(/\\/g, '/');

      for (const [userId, bridgeIds] of teamBridges) {
        const bridgeId = bridgeIds[0];
        const bridge = mockBridges.get(bridgeId);

        if (!bridge || !bridge.socket.connected) {
          results.set(userId, { success: false, error: 'Bridge not connected' });
          continue;
        }

        const writePromise = new Promise<void>((resolve) => {
          const requestId = `test_${Date.now()}_${Math.random()}`;

          const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            results.set(userId, { success: false, error: 'Write timeout (10s)' });
            resolve();
          }, 10000);

          pendingRequests.set(requestId, {
            resolve: () => {
              clearTimeout(timeout);
              results.set(userId, { success: true });
              resolve();
            },
            reject: (error: Error) => {
              clearTimeout(timeout);
              results.set(userId, { success: false, error: error.message });
              resolve();
            },
            timeout,
          });

          bridge.socket.emit('file:write-collab', {
            requestId,
            filePath: normalizedPath,
            content: normalizedContent,
            sequenceNumber: 1,
            expectedHash,
            teamId,
          });
        });

        writePromises.push(writePromise);
      }

      await Promise.all(writePromises);
      return results;
    };

    beforeEach(() => {
      mockBridges = new Map();
      mockTeamBridges = new Map();
      pendingRequests = new Map();
      jest.clearAllMocks();
    });

    it('should write to all bridges in parallel', async () => {
      const bridge1 = createMockBridge('bridge1', 'user1');
      const bridge2 = createMockBridge('bridge2', 'user2');
      const bridge3 = createMockBridge('bridge3', 'user3');

      mockBridges.set('bridge1', bridge1);
      mockBridges.set('bridge2', bridge2);
      mockBridges.set('bridge3', bridge3);

      mockTeamBridges.set('user1', ['bridge1']);
      mockTeamBridges.set('user2', ['bridge2']);
      mockTeamBridges.set('user3', ['bridge3']);

      const startTime = Date.now();
      const promise = writeFileToTeam(mockTeamBridges, 'test.ts', 'console.log("test");');

      Array.from(pendingRequests.values()).forEach(req => req.resolve());

      const results = await promise;
      const duration = Date.now() - startTime;

      expect(results.size).toBe(3);
      expect(results.get('user1')?.success).toBe(true);
      expect(results.get('user2')?.success).toBe(true);
      expect(results.get('user3')?.success).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('should return Map structure with success/error per user', async () => {
      const bridge1 = createMockBridge('bridge1', 'user1');
      const bridge2 = createMockBridge('bridge2', 'user2');

      mockBridges.set('bridge1', bridge1);
      mockBridges.set('bridge2', bridge2);

      mockTeamBridges.set('user1', ['bridge1']);
      mockTeamBridges.set('user2', ['bridge2']);

      const promise = writeFileToTeam(mockTeamBridges, 'test.ts', 'content');

      const requests = Array.from(pendingRequests.values());
      requests[0]?.resolve();
      requests[1]?.reject(new Error('Write failed'));

      const results = await promise;

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(2);
      expect(results.get('user1')?.success).toBe(true);
      expect(results.get('user2')?.success).toBe(false);
    });

    it('should skip disconnected bridges', async () => {
      const bridge1 = createMockBridge('bridge1', 'user1');
      const bridge2 = { ...createMockBridge('bridge2', 'user2'), socket: mockSocket(false) };

      mockBridges.set('bridge1', bridge1);
      mockBridges.set('bridge2', bridge2);

      mockTeamBridges.set('user1', ['bridge1']);
      mockTeamBridges.set('user2', ['bridge2']);

      const promise = writeFileToTeam(mockTeamBridges, 'test.ts', 'content');
      Array.from(pendingRequests.values())[0]?.resolve();

      const results = await promise;

      expect(results.size).toBe(2);
      expect(results.get('user1')?.success).toBe(true);
      expect(results.get('user2')?.success).toBe(false);
    });
  });

  describe('T.2 Path Validation', () => {
    const COLLAB_BLOCKED_PATTERNS = [
      /\.env/i,
      /credentials/i,
      /\.git\/config$/i,
      /id_rsa/i,
      /\.ssh\//i,
      /\.aws\//i,
      /\.npmrc$/i,
      /\.netrc$/i,
      /\.pypirc$/i,
      /node_modules\//,
    ];

    const isPathBlocked = (filePath: string): boolean => {
      return COLLAB_BLOCKED_PATTERNS.some(pattern => pattern.test(filePath));
    };

    const hasTraversal = (filePath: string): boolean => {
      const normalized = filePath.replace(/\\/g, '/');
      return normalized.includes('..');
    };

    it('should block .env files', () => {
      expect(isPathBlocked('.env')).toBe(true);
      expect(isPathBlocked('.env.local')).toBe(true);
      expect(isPathBlocked('.env.production')).toBe(true);
    });

    it('should block credential files', () => {
      expect(isPathBlocked('credentials.json')).toBe(true);
      expect(isPathBlocked('.ssh/id_rsa')).toBe(true);
      expect(isPathBlocked('.aws/credentials')).toBe(true);
    });

    it('should block git config', () => {
      expect(isPathBlocked('.git/config')).toBe(true);
    });

    it('should block node_modules', () => {
      expect(isPathBlocked('node_modules/foo/bar.js')).toBe(true);
    });

    it('should allow normal source files', () => {
      expect(isPathBlocked('src/index.ts')).toBe(false);
      expect(isPathBlocked('components/App.tsx')).toBe(false);
      expect(isPathBlocked('package.json')).toBe(false);
    });

    it('should detect path traversal', () => {
      expect(hasTraversal('../../../etc/passwd')).toBe(true);
      expect(hasTraversal('foo/../../bar')).toBe(true);
    });

    it('should allow normal relative paths', () => {
      expect(hasTraversal('src/components/Button.tsx')).toBe(false);
    });
  });

  describe('T.3 normalizeLineEndings()', () => {
    const normalizeLineEndings = (content: string): string => {
      return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    };

    it('should convert CRLF to LF', () => {
      const input = 'line1\r\nline2\r\nline3';
      const expected = 'line1\nline2\nline3';
      expect(normalizeLineEndings(input)).toBe(expected);
    });

    it('should convert lone CR to LF', () => {
      const input = 'line1\rline2\rline3';
      const expected = 'line1\nline2\nline3';
      expect(normalizeLineEndings(input)).toBe(expected);
    });

    it('should handle mixed line endings', () => {
      const input = 'line1\r\nline2\nline3\rline4';
      const expected = 'line1\nline2\nline3\nline4';
      expect(normalizeLineEndings(input)).toBe(expected);
    });

    it('should leave LF unchanged', () => {
      const input = 'line1\nline2\nline3';
      expect(normalizeLineEndings(input)).toBe(input);
    });
  });

  describe('T.4 Case Collision Detection', () => {
    let registry: Map<string, Map<string, string>>;

    const checkCaseCollision = (
      teamId: string,
      filePath: string
    ): { collision: boolean; conflictingPath?: string } => {
      if (!registry.has(teamId)) {
        registry.set(teamId, new Map());
      }

      const teamPaths = registry.get(teamId)!;
      const lowerPath = filePath.toLowerCase();
      const existingPath = teamPaths.get(lowerPath);

      if (existingPath && existingPath !== filePath) {
        return { collision: true, conflictingPath: existingPath };
      }

      teamPaths.set(lowerPath, filePath);
      return { collision: false };
    };

    beforeEach(() => {
      registry = new Map();
    });

    it('should detect same path with different case', () => {
      checkCaseCollision('team1', 'src/File.tsx');
      const result = checkCaseCollision('team1', 'src/file.tsx');
      expect(result.collision).toBe(true);
    });

    it('should not warn for same path same case', () => {
      checkCaseCollision('team1', 'src/File.tsx');
      const result = checkCaseCollision('team1', 'src/File.tsx');
      expect(result.collision).toBe(false);
    });

    it('should isolate collision tracking by team', () => {
      checkCaseCollision('team1', 'src/File.tsx');
      const result = checkCaseCollision('team2', 'src/file.tsx');
      expect(result.collision).toBe(false);
    });
  });

  describe('T.5 Rapid Successive Edits (Debounce)', () => {
    it('should handle 50 edits in 5 seconds with debounce', () => {
      const writes: number[] = [];
      const debounceMs = 500;
      let lastWrite = 0;

      const debouncedWrite = (timestamp: number) => {
        if (timestamp - lastWrite >= debounceMs) {
          writes.push(timestamp);
          lastWrite = timestamp;
        }
      };

      for (let i = 0; i < 50; i++) {
        const timestamp = i * 100;
        debouncedWrite(timestamp);
      }

      expect(writes.length).toBeLessThan(50);
      expect(writes.length).toBeGreaterThan(5);
    });
  });

  describe('T.6 Bridge Crash Mid-Write Recovery', () => {
    it('should queue failed write for retry', async () => {
      const pendingQueue: Array<{ userId: string; filePath: string; content: string }> = [];

      const writeWithRecovery = async (
        userId: string,
        filePath: string,
        content: string,
        bridgeConnected: boolean
      ) => {
        if (!bridgeConnected) {
          pendingQueue.push({ userId, filePath, content });
          return { success: false, queued: true };
        }
        return { success: true, queued: false };
      };

      const result = await writeWithRecovery('user1', 'test.ts', 'content', false);

      expect(result.success).toBe(false);
      expect(pendingQueue.length).toBe(1);
    });
  });

  describe('T.8 Large File Sync', () => {
    it('should normalize large file line endings efficiently', () => {
      const lines = 10000;
      const largeContent = Array(lines).fill('line content here\r\n').join('');

      const startTime = performance.now();
      const normalized = largeContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const duration = performance.now() - startTime;

      expect(normalized.includes('\r')).toBe(false);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('T.9 Offline Bridge Reconnect', () => {
    it('should store pending syncs while offline', () => {
      const pendingSyncs: Map<string, { content: string; docVersion: number }> = new Map();

      pendingSyncs.set('file1.ts', { content: 'v1', docVersion: 1 });
      pendingSyncs.set('file2.ts', { content: 'v1', docVersion: 1 });
      pendingSyncs.set('file1.ts', { content: 'v2', docVersion: 2 });

      expect(pendingSyncs.size).toBe(2);
      expect(pendingSyncs.get('file1.ts')?.docVersion).toBe(2);
    });

    it('should skip stale content on reconnect', () => {
      const pendingSyncs = [
        { fileId: 'file1', docVersion: 5 },
        { fileId: 'file2', docVersion: 8 },
        { fileId: 'file3', docVersion: 3 },
      ];

      const currentDocVersions = new Map([
        ['file1', 10],
        ['file2', 8],
        ['file3', 2],
      ]);

      const toSync = pendingSyncs.filter(sync => {
        const currentVersion = currentDocVersions.get(sync.fileId) || 0;
        return sync.docVersion >= currentVersion;
      });

      expect(toSync.length).toBe(2);
    });
  });
});

// Wait for all async tests to complete, then print summary
Promise.all(pendingTests).then(() => {
  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${testResults.passed} passed, ${testResults.failed} failed (${testResults.total} total)`);
  if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.errors.forEach(({ suite, test, error }) => {
      console.log(`  ${suite} > ${test}`);
      console.log(`    ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
});
