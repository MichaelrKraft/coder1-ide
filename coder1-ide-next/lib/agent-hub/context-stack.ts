import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const OWNER_PROFILE_PATH = path.join(process.env.HOME || '~', '.coder1', 'owner.md');
const MAX_OWNER_SIZE = 4 * 1024;
const MAX_CONTEXT_SIZE = 8 * 1024;

export async function readOwnerProfile(): Promise<string | null> {
  try {
    if (!existsSync(OWNER_PROFILE_PATH)) return null;
    const raw = await readFile(OWNER_PROFILE_PATH, 'utf-8');
    return raw.slice(0, MAX_OWNER_SIZE) || null;
  } catch {
    return null;
  }
}

export async function readProjectContext(workspacePath: string): Promise<string | null> {
  try {
    const contextPath = path.resolve(workspacePath, 'CONTEXT.md');
    const normalizedWorkspace = path.resolve(workspacePath);

    if (!contextPath.startsWith(normalizedWorkspace + path.sep)) {
      return null;
    }

    if (!existsSync(contextPath)) return null;
    const raw = await readFile(contextPath, 'utf-8');
    return raw.slice(0, MAX_CONTEXT_SIZE) || null;
  } catch {
    return null;
  }
}

export interface ContextStackOptions {
  systemPrompt: string;
  skills: string[];
  taskTitle: string;
  taskDescription: string;
  runId: string;
  workspacePath: string;
  supervisorSection?: string | null;
  memorySection?: string | null;
}

export async function buildContextStack(options: ContextStackOptions): Promise<string> {
  const sections: string[] = [];

  const ownerProfile = await readOwnerProfile();
  if (ownerProfile) {
    sections.push(`## Owner Profile\n\n${ownerProfile}`);
  }

  const projectContext = await readProjectContext(options.workspacePath);
  if (projectContext) {
    sections.push(`## Project Context\n\n${projectContext}`);
  }

  sections.push(options.systemPrompt);

  if (options.skills.length > 0) {
    sections.push(`Enabled skills: ${options.skills.join(', ')}`);
  }

  if (options.supervisorSection) {
    sections.push(options.supervisorSection);
  }

  if (options.memorySection) {
    sections.push(options.memorySection);
  }

  const taskLines = [
    '## Task',
    `**Title**: ${options.taskTitle}`,
  ];
  if (options.taskDescription) {
    taskLines.push(`**Description**: ${options.taskDescription}`);
  }
  taskLines.push('');
  taskLines.push(`Working directory: ${options.workspacePath}`);
  taskLines.push(`Run ID: ${options.runId}`);
  sections.push(taskLines.join('\n'));

  return sections.join('\n\n');
}
