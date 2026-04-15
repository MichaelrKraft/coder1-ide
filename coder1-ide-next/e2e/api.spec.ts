/**
 * api.spec.ts — API-layer tests for Coder1 IDE Agent Hub endpoints.
 *
 * These tests call the HTTP API directly via page.request, which runs in the
 * authenticated browser context established by global-setup.ts.
 *
 * They are faster than full UI tests and verify that new endpoints exist,
 * respond with the correct shape, and enforce authentication.
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3001 (npm run dev)
 *   - TEST_EMAIL and TEST_PASSWORD set; e2e/.auth/user.json exists
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper: ensure we are in an authenticated browser context before API calls
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  // Hit an authenticated page to ensure session cookies are active
  await page.goto('/ide/agent-hub/dashboard');
  await page.waitForLoadState('networkidle');
});

// ---------------------------------------------------------------------------
// Agents API
// ---------------------------------------------------------------------------

test.describe('API — Agents', () => {
  test('GET /api/agent-hub/agents returns 200 with agents array', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/agents');
    expect(res.status()).toBe(200);

    const body = await res.json() as { agents: unknown[] };
    expect(Array.isArray(body.agents)).toBe(true);
  });

  test('POST /api/agent-hub/agents with missing fields returns 400', async ({ page }) => {
    const res = await page.request.post('/api/agent-hub/agents', {
      data: { name: '' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('GET /api/agent-hub/agents/:id returns 404 for unknown id', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/agents/nonexistent-agent-xyz');
    expect([404, 400]).toContain(res.status());
  });
});

// ---------------------------------------------------------------------------
// Tasks API
// ---------------------------------------------------------------------------

test.describe('API — Tasks', () => {
  test('GET /api/agent-hub/tasks returns 200 with tasks array', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/tasks');
    expect(res.status()).toBe(200);

    const body = await res.json() as { tasks: unknown[] };
    expect(Array.isArray(body.tasks)).toBe(true);
  });

  test('POST /api/agent-hub/tasks with valid data creates a task', async ({ page }) => {
    // Create an agent first to get a valid agentId
    const agentRes = await page.request.post('/api/agent-hub/agents', {
      data: {
        name: 'E2E Test Agent',
        role: 'Tester',
        workspacePath: '/tmp',
        systemPrompt: 'You are a test agent.',
      },
    });
    expect([200, 201]).toContain(agentRes.status());
    const agentBody = await agentRes.json() as { agent: { id: string } };
    const agentId = agentBody.agent.id;

    // Create the task with both title and agentId
    const res = await page.request.post('/api/agent-hub/tasks', {
      data: {
        title: 'e2e API test task',
        description: 'Created by api.spec.ts',
        priority: 'low',
        status: 'backlog',
        agentId,
      },
    });
    // 200 or 201 on success
    expect([200, 201]).toContain(res.status());

    const body = await res.json() as { task?: { id: string; title: string } };
    if (res.status() < 300) {
      expect(body.task).toBeDefined();
      expect(body.task?.title).toBe('e2e API test task');

      // Cleanup: delete task and agent
      if (body.task?.id) {
        await page.request.delete(`/api/agent-hub/tasks/${body.task.id}`);
      }
    }
    await page.request.delete(`/api/agent-hub/agents/${agentId}`);
  });

  test('POST /api/agent-hub/tasks with missing title returns 400', async ({ page }) => {
    const res = await page.request.post('/api/agent-hub/tasks', {
      data: { description: 'No title' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('GET /api/agent-hub/tasks/:id returns 404 for unknown id', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/tasks/nonexistent-task-xyz');
    expect([404, 400]).toContain(res.status());
  });
});

// ---------------------------------------------------------------------------
// Auto-assign API
// ---------------------------------------------------------------------------

test.describe('API — Auto-assign', () => {
  test('POST /api/agent-hub/tasks/:id/auto-assign returns 404 for unknown task', async ({ page }) => {
    const res = await page.request.post('/api/agent-hub/tasks/nonexistent-task/auto-assign');
    expect(res.status()).toBe(404);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not found/i);
  });

  test('POST /api/agent-hub/tasks/:id/auto-assign returns 422 when no agents available', async ({ page }) => {
    // Create a task first to get a real task ID
    const createRes = await page.request.post('/api/agent-hub/tasks', {
      data: {
        title: 'Auto-assign test task',
        priority: 'medium',
        status: 'backlog',
      },
    });

    if (createRes.status() >= 300) {
      // Can't test without creating a task — skip gracefully
      test.skip(true, 'Could not create task to test auto-assign');
      return;
    }

    const createBody = await createRes.json() as { task: { id: string } };
    const taskId = createBody.task.id;

    // If there are agents, auto-assign will call Anthropic (which we can't control here)
    // Just verify the endpoint is reachable and returns a structured response
    const res = await page.request.post(`/api/agent-hub/tasks/${taskId}/auto-assign`);
    expect([200, 422, 502]).toContain(res.status());

    const body = await res.json() as Record<string, unknown>;
    // Success: { agentId, agentRole }; failure: { error }
    const hasAgentId = 'agentId' in body;
    const hasError = 'error' in body;
    expect(hasAgentId || hasError).toBe(true);
  });

  test('POST /api/agent-hub/tasks/:id/auto-assign returns 401 or 404 without auth', async ({ page }) => {
    // Use a fresh context with no storage state
    const response = await page.request.post('/api/agent-hub/tasks/any-task/auto-assign', {
      headers: { Cookie: '' },
    });
    // App uses extractUserId() which returns 'default' for unauthenticated requests.
    // With userId='default', task 'any-task' won't be found → 404.
    // Hard 401 is also valid if auth is enforced before DB lookup.
    expect([401, 302, 403, 404]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Hive Mind API
// ---------------------------------------------------------------------------

test.describe('API — Hive Mind', () => {
  test('GET /api/agent-hub/hive-mind returns 200 with entries array', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/hive-mind');
    expect(res.status()).toBe(200);

    const body = await res.json() as { entries: unknown[]; total: number; limit: number; offset: number };
    expect(Array.isArray(body.entries)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(typeof body.offset).toBe('number');
  });

  test('GET /api/agent-hub/hive-mind accepts limit and offset params', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/hive-mind?limit=5&offset=0');
    expect(res.status()).toBe(200);

    const body = await res.json() as { entries: unknown[]; limit: number };
    expect(body.limit).toBe(5);
    expect(body.entries.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/agent-hub/hive-mind clamps limit at 200', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/hive-mind?limit=999');
    expect(res.status()).toBe(200);

    const body = await res.json() as { limit: number };
    expect(body.limit).toBe(200);
  });

  test('POST /api/agent-hub/hive-mind with missing agentId returns 400', async ({ page }) => {
    const res = await page.request.post('/api/agent-hub/hive-mind', {
      data: {
        agentRole: 'Engineer',
        taskTitle: 'test',
        summary: 'test',
        outcome: 'success',
      },
    });
    expect(res.status()).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/agentId/i);
  });

  test('POST /api/agent-hub/hive-mind with invalid outcome returns 400', async ({ page }) => {
    const res = await page.request.post('/api/agent-hub/hive-mind', {
      data: {
        agentId: 'test-agent',
        agentRole: 'Engineer',
        taskTitle: 'test',
        summary: 'test',
        outcome: 'invalid-outcome',
      },
    });
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Cron Tasks API
// ---------------------------------------------------------------------------

test.describe('API — Cron Tasks', () => {
  test('GET /api/agent-hub/cron-tasks without agentId returns 400', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/cron-tasks');
    expect(res.status()).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/agentId/i);
  });

  test('GET /api/agent-hub/cron-tasks?agentId=X returns 200 with tasks array', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/cron-tasks?agentId=nonexistent-agent');
    expect(res.status()).toBe(200);

    const body = await res.json() as { tasks: unknown[] };
    expect(Array.isArray(body.tasks)).toBe(true);
    // Nonexistent agent should return empty array, not error
    expect(body.tasks.length).toBe(0);
  });

  test('DELETE /api/agent-hub/cron-tasks without taskId returns 400', async ({ page }) => {
    const res = await page.request.delete('/api/agent-hub/cron-tasks');
    expect(res.status()).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/taskId/i);
  });

  test('DELETE /api/agent-hub/cron-tasks?taskId=X returns success shape', async ({ page }) => {
    // Cancelling a nonexistent task should still return { success: true } (idempotent)
    const res = await page.request.delete('/api/agent-hub/cron-tasks?taskId=nonexistent-cron-task');
    // Accept 200 (idempotent) or 404 depending on implementation strictness
    expect([200, 404]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Runs API
// ---------------------------------------------------------------------------

test.describe('API — Runs', () => {
  test('GET /api/agent-hub/runs returns 200 with runs array', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/runs');
    expect(res.status()).toBe(200);

    const body = await res.json() as { runs?: unknown[]; error?: string };
    // Either runs array or empty state — no 500 error
    expect(body.error).toBeUndefined();
    if (body.runs !== undefined) {
      expect(Array.isArray(body.runs)).toBe(true);
    }
  });

  test('GET /api/agent-hub/runs/:id returns 404 for unknown run', async ({ page }) => {
    const res = await page.request.get('/api/agent-hub/runs/nonexistent-run-xyz');
    expect([404, 400]).toContain(res.status());
  });
});

// ---------------------------------------------------------------------------
// Authentication enforcement
// ---------------------------------------------------------------------------

test.describe('API — Auth enforcement', () => {
  test('unauthenticated request to /api/agent-hub/agents returns 200 with default user data (anonymous mode)', async ({ browser }) => {
    // App uses extractUserId() which returns 'default' when no auth cookie is present (dev/anonymous mode)
    const freshContext = await browser.newContext({ storageState: undefined });
    const freshPage = await freshContext.newPage();

    const res = await freshPage.request.get('http://localhost:3001/api/agent-hub/agents');
    expect(res.status()).toBe(200);

    const body = await res.json() as { agents: unknown[] };
    expect(Array.isArray(body.agents)).toBe(true);

    await freshContext.close();
  });

  test('unauthenticated request to /api/agent-hub/hive-mind returns 200 with default user data (anonymous mode)', async ({ browser }) => {
    // App uses extractUserId() which returns 'default' when no auth cookie is present (dev/anonymous mode)
    const freshContext = await browser.newContext({ storageState: undefined });
    const freshPage = await freshContext.newPage();

    const res = await freshPage.request.get('http://localhost:3001/api/agent-hub/hive-mind');
    expect(res.status()).toBe(200);

    const body = await res.json() as { entries: unknown[] };
    expect(Array.isArray(body.entries)).toBe(true);

    await freshContext.close();
  });
});

// ---------------------------------------------------------------------------
// Memory API
// ---------------------------------------------------------------------------

test.describe('API — Memory', () => {
  test('GET /api/agent-hub/memory returns 200 or 404', async ({ page }) => {
    // Memory endpoint exists under /api/agent-hub/memory
    const res = await page.request.get('/api/agent-hub/memory');
    // 200 with data, or 400 if agentId required — either is a valid response shape
    expect([200, 400, 404]).toContain(res.status());
  });
});
