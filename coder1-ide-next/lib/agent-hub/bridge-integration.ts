/**
 * Agent Hub Bridge Integration
 *
 * Uses global.bridgeManager (set in server.js) to route agent:start events
 * to the correct bridge socket for a given userId. The bridge owns the PTY
 * and will reply with agent:started, agent:output, agent:complete, agent:error.
 */

export interface AgentRunContext {
  runId: string;
  agentId: string;
  taskId: string;
  userId: string;
  workspacePath: string;
  systemPrompt: string;
  skills: string[];
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

function buildInjectedPrompt(ctx: AgentRunContext): string {
  const skillsSection =
    ctx.skills.length > 0 ? `\n\nEnabled skills: ${ctx.skills.join(', ')}` : '';

  return [
    ctx.systemPrompt,
    skillsSection,
    '',
    `## Task`,
    `**Title**: ${ctx.taskTitle}`,
    ctx.taskDescription ? `**Description**: ${ctx.taskDescription}` : '',
    '',
    `Working directory: ${ctx.workspacePath}`,
    `Run ID: ${ctx.runId}`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');
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

  const injectedPrompt = buildInjectedPrompt(ctx);

  bridge.socket.emit('agent:start', {
    runId: ctx.runId,
    workspacePath: ctx.workspacePath,
    prompt: injectedPrompt,
    model: ctx.model,
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
