import { useEffect, useRef, useState } from 'react';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { getSocket } from '@/lib/socket';

const STORAGE_KEY = 'coder1-recent-projects';
const MAX_PROJECTS = 10;

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(projects: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Ignore storage errors
  }
}

interface ProjectHistory {
  recentProjects: string[];
  currentProject: string;
  switchProject: (path: string) => Promise<void>;
}

export function useProjectHistory(): ProjectHistory {
  const [recentProjects, setRecentProjects] = useState<string[]>(() => readFromStorage());
  const workingDirectory = useTerminalStore((state) => state.workingDirectory);
  const prevDirectoryRef = useRef<string>('');

  const addToHistory = (path: string) => {
    setRecentProjects((prev) => {
      const deduped = [path, ...prev.filter((p) => p !== path)].slice(0, MAX_PROJECTS);
      writeToStorage(deduped);
      return deduped;
    });
  };

  // Watch workingDirectory changes and add non-empty new values to history
  useEffect(() => {
    if (!workingDirectory) return;
    if (workingDirectory === prevDirectoryRef.current) return;
    prevDirectoryRef.current = workingDirectory;
    addToHistory(workingDirectory);
  }, [workingDirectory]);

  const switchProject = async (path: string): Promise<void> => {
    const socket = await getSocket();
    const sessionId = useTerminalStore.getState().currentSessionId;

    if (sessionId) {
      socket.emit('terminal:input', { id: sessionId, data: 'cd ' + path + '\r' });
    }

    useTerminalStore.getState().setWorkingDirectory(path);

    // Update file explorer root to match the new project
    window.dispatchEvent(new CustomEvent('coder1:setExplorerRoot', { detail: { path } }));
  };

  return {
    recentProjects,
    currentProject: workingDirectory,
    switchProject,
  };
}
