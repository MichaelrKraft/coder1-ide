/**
 * Agent Hub Bridge Integration
 *
 * Uses global.bridgeManager (set in server.js) to route agent:start events
 * to the correct bridge socket for a given userId. The bridge owns the PTY
 * and will reply with agent:started, agent:output, agent:complete, agent:error.
 */

import { createWorktreeForRun } from './git-tracker';
import { updateRun, getLastHumanInputResponse } from './runs';
import { listSubordinates } from './agents';

export interface AgentRunContext {
  runId: string;
  agentId: string;
  taskId: string;
  userId: string;
  workspacePath: string;
  systemPrompt: string;
  skills: string[];
  mcpServers: string[];
  taskTitle: string;
  taskDescription: string;
  model: string;
}

interface BridgeManager {
  getBridgeForUser(userId: string): { socket: { id: string; connected: boolean; emit: (event: string, data: unknown) => void } } | null;
}

function getBridgeManager(): BridgeManager | null {
  // global.bridgeManager is set in server.js after bridge-manager service loads
  const g = global as unknown as Record<string, unknown>;
  return (g['bridgeManager'] as BridgeManager) ?? null;
}

async function buildInjectedPrompt(ctx: AgentRunContext): Promise<string> {
  const { buildContextStack } = await import('./context-stack');

  // Recall relevant memories for this agent based on the task description
  let memorySection: string | null = null;
  try {
    const { recallMemory } = await import('./memory');
    const query = `${ctx.taskTitle} ${ctx.taskDescription || ''}`.trim();
    const memories = recallMemory(ctx.agentId, ctx.userId, query, 5);
    if (memories.length > 0) {
      memorySection = '## Previous Context\n\n' +
        memories.map(m => m.summary).join('\n\n---\n\n');
    }
  } catch {
    // Memory module may not be available yet — skip silently
  }

  // Inject human input response if this task was previously escalated
  let humanInputSection: string | null = null;
  try {
    const response = getLastHumanInputResponse(ctx.taskId, ctx.userId);
    if (response) {
      humanInputSection = '## Human Input (Provided in Response to Your Earlier Request)\n\n' + response;
    }
  } catch {
    // Non-critical — skip if unavailable
  }

  return buildContextStack({
    systemPrompt: ctx.systemPrompt,
    skills: ctx.skills,
    taskTitle: ctx.taskTitle,
    taskDescription: ctx.taskDescription,
    runId: ctx.runId,
    workspacePath: ctx.workspacePath,
    supervisorSection: null,
    memorySection: [memorySection, humanInputSection].filter(Boolean).join('\n\n---\n\n') || null,
  });
}

function buildSupervisorSection(ctx: AgentRunContext): string | null {
  const subordinates = listSubordinates(ctx.agentId, ctx.userId);
  if (subordinates.length === 0) return null;

  const serverUrl = process.env.CODER1_SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const token = process.env.AGENT_HUB_INTERNAL_TOKEN || '';

  if (!token) {
    console.warn('[bridge-integration] AGENT_HUB_INTERNAL_TOKEN not set — supervisor tools disabled');
    return null;
  }

  const teamList = subordinates
    .slice(0, 10)
    .map((a) => `- ${a.name} | Role: ${a.role} | agentId: ${a.id} | workspace: ${a.workspacePath}`)
    .join('\n');

  return [
    '## Supervisor Tools',
    'You can delegate work to your team by creating tasks via HTTP:',
    '',
    '```',
    `curl -X POST ${serverUrl}/api/agent-hub/internal/create-task \\`,
    `  -H "X-Internal-Token: ${token}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"title":"...","description":"...","agentId":"<ID>","parentTaskId":"${ctx.taskId}","userId":"${ctx.userId}","autoRun":true}'`,
    '```',
    '',
    `YOUR TEAM (${Math.min(subordinates.length, 10)} of ${subordinates.length}):`,
    teamList,
    '',
    'After creating subtasks, track their IDs. Report their status in your final summary.',
  ].join('\n');
}

export async function startAgentRun(
  ctx: AgentRunContext
): Promise<{ success: true; sessionId: string } | { success: false; error: string }> {
  const manager = getBridgeManager();
  if (!manager) {
    return {
      success: false,
      error: 'Bridge manager not available. The server may still be starting up.',
    };
  }

  const bridge = manager.getBridgeForUser(ctx.userId);
  if (!bridge || !bridge.socket.connected) {
    return {
      success: false,
      error: 'No bridge connected for this workspace. Start coder1-bridge on the target machine first.',
    };
  }

  // Create isolated worktree for this run
  let worktreePath: string;
  try {
    worktreePath = await createWorktreeForRun(ctx.workspacePath, ctx.runId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to create worktree: ${msg}` };
  }

  // Persist worktree path on the run record
  updateRun(ctx.runId, ctx.userId, { worktreePath });

  // Build prompt with worktree as the working directory
  const injectedPrompt = await buildInjectedPrompt({ ...ctx, workspacePath: worktreePath });

  // Append supervisor tools if this agent has subordinates
  const supervisorSection = buildSupervisorSection(ctx);

  const fullPrompt = supervisorSection
    ? injectedPrompt + '\n\n' + supervisorSection
    : injectedPrompt;

  bridge.socket.emit('agent:start', {
    runId: ctx.runId,
    workspacePath: worktreePath,
    prompt: fullPrompt,
    model: ctx.model,
    mcpServers: ctx.mcpServers,
  });

  // sessionId is assigned by the bridge when it starts the Claude process;
  // we return a placeholder and it gets updated via agent:started event.
  return { success: true, sessionId: `pending-${ctx.runId}` };
}

export async function stopAgentRun(
  runId: string,
  workspacePath: string,
  userId: string
): Promise<boolean> {
  const manager = getBridgeManager();
  if (!manager) return false;

  const bridge = manager.getBridgeForUser(userId);
  if (!bridge || !bridge.socket.connected) return false;

  bridge.socket.emit('agent:stop', { runId, workspacePath });
  return true;
}

export function findBridgeSocketForWorkspace(workspacePath: string, userId: string): string | null {
  const manager = getBridgeManager();
  if (!manager) return null;

  const bridge = manager.getBridgeForUser(userId);
  if (!bridge || !bridge.socket.connected) return null;

  // workspacePath is available for future bridge-side workspace registry lookups.
  void workspacePath;

  return bridge.socket.id;
}
