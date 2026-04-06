'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Download, Copy, Check, FolderOpen, Loader2 } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';

interface ComponentDetection {
  type: string;
  description: string;
}

interface ScaffoldResultsProps {
  components: ComponentDetection[];
  code: string;
  framework: string;
  onReset: () => void;
  onRefine?: (instruction: string) => void;
  isStreaming?: boolean;
}

const COMPONENT_COLORS: Record<string, string> = {
  navbar: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  hero: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  card: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'card-grid': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  form: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  footer: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
  sidebar: 'bg-green-500/20 text-green-300 border-green-500/40',
  table: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  modal: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  header: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
};

function getChipColor(type: string): string {
  return COMPONENT_COLORS[type] ?? 'bg-text-muted/20 text-text-secondary border-border-default';
}

function toPascalCase(type: string): string {
  return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function buildComponentLineMap(code: string, components: ComponentDetection[]): Record<string, number> {
  const lines = code.split('\n');
  const map: Record<string, number> = {};
  for (const comp of components) {
    const pascal = toPascalCase(comp.type);
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes(`const ${pascal}`) ||
        lines[i].includes(`function ${pascal}`)
      ) {
        map[comp.type] = i;
        break;
      }
    }
  }
  return map;
}

function inferLanguage(framework: string): string {
  return framework === 'vue' ? 'vue' : 'typescriptreact';
}

export default function ScaffoldResults({
  components,
  code,
  framework,
  onReset,
  onRefine,
  isStreaming = false,
}: ScaffoldResultsProps) {
  const [copied, setCopied] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Open in Editor state
  const [openEditing, setOpenEditing] = useState(false);
  const [openPath, setOpenPath] = useState(`components/GeneratedScaffold.${framework === 'vue' ? 'vue' : 'tsx'}`);
  const [openStatus, setOpenStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [openError, setOpenError] = useState('');

  // Refine state
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);

  const openFile = useIDEStore(s => s.openFile);

  const componentLineMap = useMemo(
    () => buildComponentLineMap(code, components),
    [code, components]
  );

  function scrollToComponent(type: string) {
    const lineNum = componentLineMap[type];
    if (lineNum === undefined || !preRef.current) return;
    const LINE_HEIGHT = 18;
    preRef.current.scrollTop = Math.max(0, lineNum * LINE_HEIGHT - 40);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 1500);
  }

  const filename = `GeneratedScaffold.${framework === 'vue' ? 'vue' : 'tsx'}`;

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleOpenInEditor() {
    setOpenStatus('saving');
    setOpenError('');
    try {
      const res = await fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: openPath, content: code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create file');
      }
      const name = openPath.split('/').pop() ?? openPath;
      openFile({
        id: openPath,
        path: openPath,
        name,
        content: code,
        isDirty: false,
        isOpen: true,
        language: inferLanguage(framework),
        type: 'file' as const,
      } as Parameters<typeof openFile>[0]);
      setOpenStatus('success');
      setOpenEditing(false);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Unknown error');
      setOpenStatus('error');
    }
  }

  async function handleRefine() {
    if (!refineText.trim() || !onRefine) return;
    setRefining(true);
    onRefine(refineText.trim());
    setRefineText('');
    setRefining(false);
  }

  const actionsDisabled = isStreaming;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
      {/* Detected Components */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">
          Detected Components ({components.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {components.map((c, i) => {
            const hasAnchor = componentLineMap[c.type] !== undefined;
            return (
              <span
                key={i}
                onClick={hasAnchor ? () => scrollToComponent(c.type) : undefined}
                className={`px-2 py-0.5 text-xs rounded-full border font-medium ${getChipColor(c.type)} ${hasAnchor ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                title={hasAnchor ? `Jump to ${c.type} definition` : c.description}
              >
                {c.type}
              </span>
            );
          })}
        </div>
      </div>

      {/* Code Block */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            Generated Scaffold · {filename}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={actionsDisabled}
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-bg-tertiary hover:bg-coder1-cyan/10 border border-border-default hover:border-coder1-cyan/40 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy code"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              disabled={actionsDisabled}
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-bg-tertiary hover:bg-coder1-cyan/10 border border-border-default hover:border-coder1-cyan/40 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Download ${filename}`}
            >
              <Download className="w-3 h-3" />
              Download
            </button>
            {/* Open in Editor */}
            {openStatus === 'success' ? (
              <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-400">
                <Check className="w-3 h-3" /> Opened
              </span>
            ) : openEditing ? (
              <div className="flex items-center gap-1">
                <input
                  value={openPath}
                  onChange={e => setOpenPath(e.target.value)}
                  className="text-xs bg-bg-primary border border-coder1-cyan/40 rounded px-2 py-1 text-text-primary w-48 focus:outline-none focus:border-coder1-cyan"
                  onKeyDown={e => { if (e.key === 'Enter') handleOpenInEditor(); if (e.key === 'Escape') setOpenEditing(false); }}
                  autoFocus
                />
                <button
                  onClick={handleOpenInEditor}
                  disabled={openStatus === 'saving'}
                  className="px-2 py-1 text-xs bg-coder1-cyan/20 hover:bg-coder1-cyan/30 border border-coder1-cyan/40 text-coder1-cyan rounded transition-all disabled:opacity-50"
                >
                  {openStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : '↵'}
                </button>
                <button onClick={() => { setOpenEditing(false); setOpenError(''); }} className="px-1.5 py-1 text-xs text-text-muted hover:text-text-secondary">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setOpenEditing(true)}
                disabled={actionsDisabled}
                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-bg-tertiary hover:bg-coder1-cyan/10 border border-border-default hover:border-coder1-cyan/40 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Open in Monaco editor"
              >
                <FolderOpen className="w-3 h-3" />
                Open in Editor
              </button>
            )}
          </div>
        </div>
        {openError && (
          <p className="text-xs text-red-400 mb-1">{openError}</p>
        )}
        <div className={`relative h-full min-h-[200px] max-h-[400px] rounded-lg border overflow-hidden transition-all duration-300 ${flashing ? 'border-yellow-400/70 shadow-[0_0_8px_rgba(250,204,21,0.3)]' : 'border-border-default'}`}>
          <pre ref={preRef} className="h-full overflow-auto p-3 text-xs font-mono text-text-secondary bg-bg-primary leading-relaxed whitespace-pre-wrap">
            {code}
            {isStreaming && <span className="animate-pulse">▍</span>}
          </pre>
        </div>
      </div>

      {/* Refine / Iterate */}
      {onRefine && !isStreaming && (
        <div className="flex gap-2 items-center">
          <input
            value={refineText}
            onChange={e => setRefineText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRefine(); }}
            placeholder="Describe what to change…"
            className="flex-1 text-xs bg-bg-tertiary border border-border-default hover:border-coder1-cyan/30 focus:border-coder1-cyan/60 rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none transition-colors"
          />
          <button
            onClick={handleRefine}
            disabled={!refineText.trim() || refining}
            className="px-2.5 py-1.5 text-xs bg-coder1-cyan/20 hover:bg-coder1-cyan/30 border border-coder1-cyan/40 text-coder1-cyan rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refine scaffold"
          >
            {refining ? <Loader2 className="w-3 h-3 animate-spin" /> : '→'}
          </button>
        </div>
      )}

      {/* Reset button */}
      <button
        onClick={onReset}
        className="text-xs text-text-muted hover:text-text-secondary underline text-center transition-colors"
      >
        ← Analyze a different screenshot
      </button>
    </div>
  );
}
