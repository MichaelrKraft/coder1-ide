'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Loader2, Sparkles } from '@/lib/icons';

interface TeamSpawnInputProps {
  onSpawn: (requirement: string) => void;
  isSpawning: boolean;
  error: string | null;
}

export default function TeamSpawnInput({ onSpawn, isSpawning, error }: TeamSpawnInputProps) {
  const [requirement, setRequirement] = useState('');
  const spawnCalledRef = useRef(false);

  const handleSpawn = useCallback(() => {
    const trimmed = requirement.trim();
    if (!trimmed || isSpawning || spawnCalledRef.current) return;
    spawnCalledRef.current = true;
    onSpawn(trimmed);
    // Reset debounce after a short delay
    setTimeout(() => { spawnCalledRef.current = false; }, 1000);
  }, [requirement, isSpawning, onSpawn]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSpawn();
    }
  }, [handleSpawn]);

  const charCount = requirement.length;
  const isOverLimit = charCount > 2000;
  const canSpawn = requirement.trim().length > 0 && !isSpawning && !isOverLimit;

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          disabled={isSpawning}
          className={`
            w-full h-24 px-3 py-2 text-sm rounded-lg resize-none
            bg-bg-primary border transition-colors duration-200
            text-text-primary placeholder-text-muted
            focus:outline-none focus:ring-1
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-border-default focus:border-coder1-cyan focus:ring-coder1-cyan/30'
            }
          `}
        />
        {charCount > 1500 && (
          <span className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-400' : 'text-text-muted'}`}>
            {charCount}/2000
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">Shift+Enter to submit</span>
        <button
          onClick={handleSpawn}
          disabled={!canSpawn}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
            transition-all duration-200
            ${canSpawn
              ? 'bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white hover:shadow-lg hover:shadow-coder1-cyan/30 cursor-pointer'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
            }
          `}
        >
          {isSpawning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Spawning...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Spawn Team
            </>
          )}
        </button>
      </div>
    </div>
  );
}
