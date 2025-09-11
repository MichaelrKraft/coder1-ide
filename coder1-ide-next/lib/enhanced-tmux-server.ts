/**
 * Enhanced tmux Server Implementation
 * This runs server-side only - simplified mock for client
 */

// Mock implementation for client-side
export interface SandboxSession {
  id: string;
  userId: string;
  projectId: string;
  path: string;
  tmuxSession: string;
  status: 'creating' | 'ready' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  lastActivity: Date;
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  processes: number[];
}

// In-memory storage for demo
const sandboxes = new Map<string, SandboxSession>();

export async function createSandbox(userId: string, projectId: string): Promise<SandboxSession> {
  const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const session: SandboxSession = {
    id: sandboxId,
    userId,
    projectId,
    path: `/tmp/coder1-workspaces/${userId}/sandboxes/${sandboxId}`,
    tmuxSession: `sandbox_${sandboxId}`,
    status: 'ready',
    createdAt: new Date(),
    lastActivity: new Date(),
    resources: {
      cpuUsage: 0,
      memoryUsage: 512,
      diskUsage: 100
    },
    processes: []
  };
  
  sandboxes.set(sandboxId, session);
  return session;
}

export async function getSandbox(sandboxId: string): Promise<SandboxSession | null> {
  return sandboxes.get(sandboxId) || null;
}

export async function listUserSandboxes(userId: string): Promise<SandboxSession[]> {
  return Array.from(sandboxes.values()).filter(s => s.userId === userId);
}

export async function destroySandbox(sandboxId: string): Promise<void> {
  sandboxes.delete(sandboxId);
}

export async function runInSandbox(sandboxId: string, command: string): Promise<{ stdout: string; stderr: string }> {
  // Mock implementation
  return {
    stdout: `Executed: ${command}`,
    stderr: ''
  };
}

export async function testSandbox(sandboxId: string): Promise<{ passed: boolean; results: any }> {
  // Mock test results
  return {
    passed: Math.random() > 0.3,
    results: {
      message: 'Test execution completed',
      tests: 5,
      passed: 4,
      failed: 1
    }
  };
}

export async function promoteSandbox(sandboxId: string, targetPath?: string): Promise<void> {
  const sandbox = sandboxes.get(sandboxId);
  if (sandbox) {
    sandbox.status = 'stopped';
  }
}