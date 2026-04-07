'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Run, RunLogChunk, RunThought } from '@/lib/agent-hub/runs';
import { RunStatusChip } from './RunStatusChip';
import WorktreeMergePanel from './WorktreeMergePanel';
import { getSocket } from '@/lib/socket';

// Dynamic imports — SSR unsafe
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  { ssr: false }
);

interface RunDetail {
  run: Run;
  logChunks: RunLogChunk[];
  thoughts: RunThought[];
}

interface Props {
  runId: string;
}

function formatElapsed(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function RunViewer({ runId }: Props): React.ReactElement {
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<unknown>(null);

  // Fetch run detail + replay log chunks
  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-hub/runs/${runId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RunDetail;
      setDetail(data);
      if (data.run.gitDiff) setDiffContent(data.run.gitDiff);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load run');
      return null;
    }
  }, [runId]);

  // Initialize xterm terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    let term: { write: (s: string) => void; dispose: () => void } | null = null;
    let fitAddon: { fit: () => void } | null = null;

    const initTerm = async () => {
      // Dynamic imports — xterm cannot run server-side
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      term = new Terminal({
        theme: { background: '#0d1117', foreground: '#e6edf3' },
        fontFamily: 'Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        cursorBlink: false,
        convertEol: true,
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (terminalRef.current) {
        term.open(terminalRef.current);
        fitAddon.fit();
      }

      termRef.current = term;

      // Replay existing chunks
      const data = await fetchDetail();
      if (data?.logChunks) {
        for (const chunk of data.logChunks) {
          term.write(chunk.content);
        }
      }
    };

    void initTerm();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon?.fit();
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      term?.dispose();
      termRef.current = null;
    };
  }, [runId, fetchDetail]);

  // Socket.IO: join room, stream events
  useEffect(() => {
    let socketInstance: Awaited<ReturnType<typeof getSocket>> | null = null;

    const setup = async () => {
      socketInstance = await getSocket();
      socketInstance.emit('run:join', { runId });

      socketInstance.on('run:stdout', ({ chunk }: { chunk: string }) => {
        const t = termRef.current as { write: (s: string) => void } | null;
        t?.write(chunk);
      });

      socketInstance.on('run:stderr', ({ chunk }: { chunk: string }) => {
        const t = termRef.current as { write: (s: string) => void } | null;
        t?.write(`\x1b[31m${chunk}\x1b[0m`);
      });

      socketInstance.on('run:diff', ({ diff }: { diff: string }) => {
        setDiffContent(diff);
      });

      socketInstance.on('run:complete', () => {
        void fetchDetail();
      });
    };

    void setup();

    return () => {
      if (socketInstance) {
        socketInstance.emit('run:leave', { runId });
        socketInstance.off('run:stdout');
        socketInstance.off('run:stderr');
        socketInstance.off('run:diff');
        socketInstance.off('run:complete');
      }
    };
  }, [runId, fetchDetail]);

  if (error) {
    return <div className="p-6 text-red-400 text-sm">Error: {error}</div>;
  }

  const run = detail?.run;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-border text-xs text-text-secondary">
        {run && (
          <>
            <RunStatusChip status={run.status} />
            <span>Model: <span className="text-text-primary">{run.model}</span></span>
            <span>Started: <span className="text-text-primary">{new Date(run.startedAt).toLocaleTimeString()}</span></span>
            {run && (
              <span>
                Elapsed: <span className="text-text-primary">{formatElapsed(run.startedAt, run.completedAt)}</span>
              </span>
            )}
            <span>Cost: <span className="text-text-primary">${(run.costCents / 100).toFixed(2)}</span></span>
            {run.exitCode !== null && (
              <span>Exit: <span className={run.exitCode === 0 ? 'text-green-400' : 'text-red-400'}>{run.exitCode}</span></span>
            )}
          </>
        )}
        {!run && <span className="text-text-muted">Loading run...</span>}
      </div>

      {/* Worktree merge panel */}
      {run?.worktreePath && (
        <WorktreeMergePanel runId={runId} />
      )}

      {/* Two-pane body */}
      <div className="flex flex-1 min-h-0">
        {/* Terminal */}
        <div className="flex flex-col w-1/2 border-r border-border">
          <div className="px-3 py-1.5 text-xs text-text-muted border-b border-border">stdout / stderr</div>
          <div ref={terminalRef} className="flex-1 overflow-hidden" />
        </div>

        {/* Git diff */}
        <div className="flex flex-col w-1/2">
          <div className="px-3 py-1.5 text-xs text-text-muted border-b border-border">git diff</div>
          <div className="flex-1 min-h-0">
            {diffContent ? (
              <DiffEditor
                height="100%"
                theme="vs-dark"
                language="diff"
                original=""
                modified={diffContent}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  renderSideBySide: false,
                }}
              />
            ) : (
              <div className="p-4 text-text-muted text-sm">No diff yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
