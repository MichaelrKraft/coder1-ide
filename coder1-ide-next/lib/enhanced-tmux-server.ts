/**
 * Enhanced tmux Server Implementation
 * Bridges the real tmux service to the API layer
 */

import { getEnhancedTmuxService } from '../services/enhanced-tmux-service';
import type { SandboxSession as ServiceSandboxSession } from '../services/enhanced-tmux-service';

// Re-export the interface for consistency
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

// Get the singleton tmux service instance
const tmuxService = getEnhancedTmuxService();

// Convert Set to Array for processes field
function convertSession(session: ServiceSandboxSession): SandboxSession {
  return {
    ...session,
    processes: Array.from(session.processes)
  };
}

export async function createSandbox(userId: string, projectId: string): Promise<SandboxSession> {
  const session = await tmuxService.createSandbox({
    userId,
    projectId
  });
  return convertSession(session);
}

export async function getSandbox(sandboxId: string): Promise<SandboxSession | null> {
  const session = tmuxService.getSandbox(sandboxId);
  return session ? convertSession(session) : null;
}

export async function listUserSandboxes(userId: string): Promise<SandboxSession[]> {
  const sessions = tmuxService.listUserSandboxes(userId);
  return sessions.map(convertSession);
}

export async function destroySandbox(sandboxId: string): Promise<void> {
  await tmuxService.destroySandbox(sandboxId);
}

export async function runInSandbox(sandboxId: string, command: string): Promise<{ stdout: string; stderr: string }> {
  return await tmuxService.runInSandbox(sandboxId, command);
}

export async function testSandbox(sandboxId: string): Promise<{ passed: boolean; results: any }> {
  return await tmuxService.testSandbox(sandboxId);
}

export async function promoteSandbox(sandboxId: string, targetPath?: string): Promise<void> {
  await tmuxService.promoteSandbox(sandboxId, targetPath);
}