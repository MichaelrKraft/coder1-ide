'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, Save, Loader2, History, Lock, FileText, AlertCircle, X } from 'lucide-react';

// Monaco Editor — client-side only, large bundle
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ============================================================================
// Types
// ============================================================================

interface LivingFile {
  filename: string;
  content: string;
  writeMode: 'readonly' | 'append' | 'writable' | 'auto';
  sizeBytes: number;
  lastModified: string | null;
  exists: boolean;
  description: string;
}

interface SnapshotEntry {
  filename: string;
  timestamp: string;
  sizeBytes: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isEditable(writeMode: LivingFile['writeMode']): boolean {
  return writeMode === 'append' || writeMode === 'writable';
}

function writeModeLabel(writeMode: LivingFile['writeMode']): string {
  switch (writeMode) {
    case 'readonly': return 'Read-only';
    case 'append':   return 'Editable';
    case 'writable': return 'Editable';
    case 'auto':     return 'Auto-generated';
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function WriteModeIcon({ writeMode }: { writeMode: LivingFile['writeMode'] }) {
  if (writeMode === 'readonly' || writeMode === 'auto') {
    return <Lock className="w-3 h-3 text-text-muted flex-shrink-0" />;
  }
  return <FileText className="w-3 h-3 text-coder1-cyan/70 flex-shrink-0" />;
}

// ============================================================================
// History Modal
// ============================================================================

interface HistoryModalProps {
  file: LivingFile;
  onClose: () => void;
  onRestore: (content: string) => void;
}

function HistoryModal({ file, onClose, onRestore }: HistoryModalProps) {
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [snapshotContent, setSnapshotContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    fetch(`/api/johnny5/living-files/${file.filename}/history`)
      .then(r => r.json())
      .then(data => {
        setSnapshots(data.snapshots ?? []);
      })
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [file.filename]);

  const loadSnapshotContent = async (snapshotFilename: string) => {
    setSelectedSnapshot(snapshotFilename);
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/johnny5/living-files/${file.filename}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotFilename }),
      });
      const data = await res.json();
      setSnapshotContent(data.content ?? null);
    } catch {
      setSnapshotContent(null);
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary border border-border-primary rounded-lg w-[800px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-coder1-cyan" />
            <span className="text-sm font-medium text-text-primary">Version History — {file.filename}</span>
            <span className="text-xs text-text-muted">({snapshots.length} snapshots)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Snapshot list */}
          <div className="w-56 border-r border-border-primary overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-text-muted text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-text-muted text-xs px-4 text-center">
                No history snapshots yet
              </div>
            ) : (
              <ul>
                {snapshots.map((snap) => (
                  <li key={snap.filename}>
                    <button
                      onClick={() => loadSnapshotContent(snap.filename)}
                      className={`w-full text-left px-3 py-2.5 border-b border-border-primary/50 transition-colors ${
                        selectedSnapshot === snap.filename
                          ? 'bg-coder1-cyan/10 border-l-2 border-l-coder1-cyan'
                          : 'hover:bg-bg-tertiary'
                      }`}
                    >
                      <div className="text-xs text-text-primary font-mono">
                        {new Date(snap.timestamp).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">{formatBytes(snap.sizeBytes)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Snapshot content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedSnapshot ? (
              <div className="flex items-center justify-center h-full text-text-muted text-xs">
                Select a snapshot to view its content
              </div>
            ) : loadingContent ? (
              <div className="flex items-center justify-center h-full text-text-muted text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading snapshot...
              </div>
            ) : snapshotContent !== null ? (
              <>
                <div className="flex-1 overflow-auto">
                  <MonacoEditor
                    height="100%"
                    language="markdown"
                    theme="vs-dark"
                    value={snapshotContent}
                    options={{
                      readOnly: true,
                      wordWrap: 'on',
                      minimap: { enabled: false },
                      lineNumbers: 'off',
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
                {isEditable(file.writeMode) && (
                  <div className="px-3 py-2 border-t border-border-primary flex justify-end">
                    <button
                      onClick={() => { onRestore(snapshotContent); onClose(); }}
                      className="px-3 py-1.5 bg-coder1-cyan/20 hover:bg-coder1-cyan/30 border border-coder1-cyan/50 text-coder1-cyan text-xs rounded transition-colors"
                    >
                      Restore this version
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-red-400 text-xs">
                Failed to load snapshot content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function LivingFilesPanel() {
  const [files, setFiles] = useState<LivingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string>('SOUL.md');
  const [edits, setEdits] = useState<Record<string, string>>({}); // filename → current editor content
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Record<string, Date>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load all files ──────────────────────────────────────────────────────────
  const loadFiles = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch('/api/johnny5/living-files');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const loaded: LivingFile[] = data.files ?? [];
      setFiles(loaded);

      // Seed edits map with loaded content (only for files not already being edited)
      setEdits(prev => {
        const next = { ...prev };
        for (const f of loaded) {
          if (!(f.filename in next)) {
            next[f.filename] = f.content;
          }
        }
        return next;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Auto-refresh every 60s when panel is visible
  useEffect(() => {
    const start = () => {
      autoRefreshRef.current = setInterval(() => {
        if (!document.hidden) {
          loadFiles(true);
        }
      }, 60000);
    };

    start();
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [loadFiles]);

  // ── Select file ─────────────────────────────────────────────────────────────
  const selectedFile = files.find(f => f.filename === selectedFilename) ?? null;
  const currentContent = selectedFilename in edits ? edits[selectedFilename] : (selectedFile?.content ?? '');
  const originalContent = selectedFile?.content ?? '';
  const hasUnsavedChanges = currentContent !== originalContent;

  const handleSelectFile = (filename: string) => {
    if (filename === selectedFilename) return;

    if (hasUnsavedChanges) {
      const ok = window.confirm(
        `You have unsaved changes in ${selectedFilename}. Discard them?`
      );
      if (!ok) return;
      // Reset that file's edit to original
      setEdits(prev => ({ ...prev, [selectedFilename]: originalContent }));
    }

    setSelectedFilename(filename);
    setSaveError(null);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedFile || !isEditable(selectedFile.writeMode)) return;
    if (!hasUnsavedChanges) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/johnny5/living-files/${selectedFilename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed');
        return;
      }

      // Update the "original" content to reflect the saved state
      setFiles(prev =>
        prev.map(f =>
          f.filename === selectedFilename
            ? { ...f, content: currentContent, sizeBytes: new TextEncoder().encode(currentContent).length, lastModified: new Date().toISOString() }
            : f
        )
      );
      setLastSaved(prev => ({ ...prev, [selectedFilename]: new Date() }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [selectedFile, selectedFilename, hasUnsavedChanges, currentContent]);

  // ── Refresh single file ─────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFiles(true);
    // Reset edit for current file to freshly loaded content
    setEdits(prev => {
      const freshFile = files.find(f => f.filename === selectedFilename);
      if (!freshFile) return prev;
      return { ...prev, [selectedFilename]: freshFile.content };
    });
  };

  // ── Keyboard shortcut Cmd/Ctrl+S ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // ── Initialize files ────────────────────────────────────────────────────────
  const handleInitialize = async () => {
    console.log('[LivingFilesPanel] handleInitialize called');
    setLoading(true);
    setLoadError(null);

    try {
      console.log('[LivingFilesPanel] Fetching /api/johnny5/living-files/init...');
      const res = await fetch('/api/johnny5/living-files/init', { method: 'POST' });
      console.log('[LivingFilesPanel] Init response status:', res.status);
      const data = await res.json();
      console.log('[LivingFilesPanel] Init response data:', data);

      if (!res.ok) {
        console.error('[LivingFilesPanel] Init failed:', data.error);
        setLoadError(data.error || 'Failed to initialize living files');
        setLoading(false);
        return;
      }

      console.log('[LivingFilesPanel] Init succeeded, reloading files...');
      await loadFiles();
    } catch (err) {
      console.error('[LivingFilesPanel] Init error:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to initialize living files');
      setLoading(false);
    }
  };

  // ── Restore from history ─────────────────────────────────────────────────────
  const handleRestore = (content: string) => {
    setEdits(prev => ({ ...prev, [selectedFilename]: content }));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  // Empty state — no files initialized
  const noneExist = files.length > 0 && files.every(f => !f.exists);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading living files...</span>
      </div>
    );
  }

  if (loadError && files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted px-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-center text-red-400">{loadError}</p>
        <button
          onClick={() => loadFiles()}
          className="px-4 py-2 text-xs bg-bg-tertiary hover:bg-bg-hover rounded border border-border-primary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (noneExist) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
        <FileText className="w-12 h-12 text-text-muted/50" />
        <div>
          <p className="text-sm font-medium text-text-primary mb-1">No living files found</p>
          <p className="text-xs text-text-muted">
            Johnny5&apos;s memory files haven&apos;t been initialized yet.
          </p>
        </div>
        <button
          onClick={handleInitialize}
          disabled={loading}
          className="px-4 py-2 text-sm bg-coder1-cyan/20 hover:bg-coder1-cyan/30 border border-coder1-cyan/50 text-coder1-cyan rounded transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Initializing...
            </>
          ) : (
            'Initialize Living Files'
          )}
        </button>
      </div>
    );
  }

  const editable = selectedFile ? isEditable(selectedFile.writeMode) : false;
  const lineCount = currentContent.split('\n').length;
  const charCount = currentContent.length;

  return (
    <>
      <div className="h-full flex overflow-hidden">
        {/* ── Left: File List ── */}
        <div className="w-52 shrink-0 flex flex-col border-r border-border-primary bg-bg-primary overflow-y-auto">
          <div className="px-3 py-2 border-b border-border-primary">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Living Files
            </span>
          </div>

          <ul className="flex-1">
            {files.map((file) => {
              const isSelected = file.filename === selectedFilename;
              const isDirty = edits[file.filename] !== undefined && edits[file.filename] !== file.content;

              return (
                <li key={file.filename}>
                  <button
                    onClick={() => handleSelectFile(file.filename)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border-primary/30 transition-colors group ${
                      isSelected
                        ? 'bg-coder1-cyan/10 border-l-2 border-l-coder1-cyan'
                        : 'hover:bg-bg-secondary border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <WriteModeIcon writeMode={file.writeMode} />
                      <span className={`text-xs font-medium truncate ${isSelected ? 'text-coder1-cyan' : 'text-text-primary'}`}>
                        {file.filename}
                      </span>
                      {isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" title="Unsaved changes" />
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted leading-tight line-clamp-2">
                      {file.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-text-muted/60">{formatBytes(file.sizeBytes)}</span>
                      {file.lastModified && (
                        <span className="text-[10px] text-text-muted/60">
                          {formatRelativeTime(file.lastModified)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Right: Editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-secondary shrink-0">
                <div className="flex items-center gap-2">
                  <WriteModeIcon writeMode={selectedFile.writeMode} />
                  <span className="text-sm font-medium text-text-primary">{selectedFile.filename}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    editable
                      ? 'text-coder1-cyan/80 border-coder1-cyan/30 bg-coder1-cyan/10'
                      : 'text-text-muted border-border-primary bg-bg-tertiary'
                  }`}>
                    {writeModeLabel(selectedFile.writeMode)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Refresh */}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh from disk"
                    className="p-1.5 hover:bg-bg-tertiary rounded transition-colors text-text-muted hover:text-text-primary disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>

                  {/* History */}
                  <button
                    onClick={() => setShowHistory(true)}
                    title="View version history"
                    className="p-1.5 hover:bg-bg-tertiary rounded transition-colors text-text-muted hover:text-text-primary"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={!editable || !hasUnsavedChanges || saving}
                    title={editable ? 'Save (⌘S)' : `Cannot edit — ${writeModeLabel(selectedFile.writeMode)}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      editable && hasUnsavedChanges
                        ? 'bg-coder1-cyan text-bg-primary hover:bg-coder1-cyan/90'
                        : 'bg-bg-tertiary text-text-muted cursor-not-allowed opacity-50'
                    }`}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Concurrent-edit warning for large append files */}
              {selectedFile.sizeBytes > 10000 && editable && (
                <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[10px] text-yellow-400/80 shrink-0">
                  Johnny5 may append to this file during conversations. Refresh before saving to avoid overwriting new entries.
                </div>
              )}

              {/* Save error */}
              {saveError && (
                <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[10px] text-red-400 shrink-0 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language="markdown"
                  theme="vs-dark"
                  value={currentContent}
                  onChange={(value) => {
                    if (!editable) return;
                    setEdits(prev => ({ ...prev, [selectedFilename]: value ?? '' }));
                    setSaveError(null);
                  }}
                  onMount={(editor) => {
                    // Bind Cmd+S / Ctrl+S inside Monaco
                    editor.addAction({
                      id: 'save-living-file',
                      label: 'Save Living File',
                      keybindings: [
                        // Monaco keybinding for Cmd+S (Mac) / Ctrl+S (Win/Linux)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (window as any).monaco?.KeyMod?.CtrlCmd | (window as any).monaco?.KeyCode?.KeyS,
                      ].filter(Boolean),
                      run: () => handleSave(),
                    });
                  }}
                  options={{
                    readOnly: !editable,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    fontSize: 12,
                    scrollBeyondLastLine: false,
                    renderLineHighlight: editable ? 'all' : 'none',
                    cursorStyle: editable ? 'line' : 'block',
                  }}
                />
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-3 py-1 border-t border-border-primary bg-bg-primary text-[10px] text-text-muted shrink-0">
                <span>{lineCount} lines · {charCount.toLocaleString()} chars · {formatBytes(selectedFile.sizeBytes)}</span>
                <span>
                  {lastSaved[selectedFilename]
                    ? `Saved ${formatRelativeTime(lastSaved[selectedFilename].toISOString())}`
                    : selectedFile.lastModified
                    ? `Last modified ${formatRelativeTime(selectedFile.lastModified)}`
                    : ''}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              Select a file to view
            </div>
          )}
        </div>
      </div>

      {/* History modal */}
      {showHistory && selectedFile && (
        <HistoryModal
          file={selectedFile}
          onClose={() => setShowHistory(false)}
          onRestore={handleRestore}
        />
      )}
    </>
  );
}
