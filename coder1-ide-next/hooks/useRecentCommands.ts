'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'coder1:recent-commands';
const MAX_RECENT = 5;

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(slugs: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

export function useRecentCommands() {
  const [recentSlugs, setRecentSlugs] = useState<string[]>(readFromStorage);

  const recordUsage = useCallback((slug: string) => {
    setRecentSlugs((prev) => {
      const filtered = prev.filter((s) => s !== slug);
      const next = [slug, ...filtered].slice(0, MAX_RECENT);
      writeToStorage(next);
      return next;
    });
  }, []);

  return { recentSlugs, recordUsage };
}
