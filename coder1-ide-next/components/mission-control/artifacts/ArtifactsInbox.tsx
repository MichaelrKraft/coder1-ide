'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Artifact, ArtifactType } from '@/types/mission-control';

/**
 * Type icons for artifacts
 */
const TYPE_ICONS: Record<ArtifactType, string> = {
  video: '🎬',
  screenshot: '📸',
  trace: '📊',
  document: '📄',
  code: '💻'
};

/**
 * Syntax highlighting colors for code preview
 */
const getLanguageFromMimeType = (mimeType?: string): string => {
  const mimeToLang: Record<string, string> = {
    'text/typescript': 'typescript',
    'text/typescript-react': 'tsx',
    'text/javascript': 'javascript',
    'text/javascript-react': 'jsx',
    'text/css': 'css',
    'text/html': 'html',
    'application/json': 'json',
    'text/markdown': 'markdown',
    'text/python': 'python',
    'text/sql': 'sql'
  };
  return mimeToLang[mimeType || ''] || 'text';
};

/**
 * Format bytes to human readable size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format relative time
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Artifacts Inbox Component
 *
 * Displays pending artifacts from agent work for review.
 * User can save (keep) or delete (discard) each item.
 */
export default function ArtifactsInbox() {
  const [inbox, setInbox] = useState<Artifact[]>([]);
  const [saved, setSaved] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'saved'>('inbox');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Fetch artifacts on mount
  useEffect(() => {
    fetchArtifacts();
  }, []);

  // Fetch content when artifact is selected
  const fetchArtifactContent = useCallback(async (artifactId: string) => {
    setIsLoadingContent(true);
    setArtifactContent(null);

    try {
      const response = await fetch(`/api/artifacts/${artifactId}/content`);
      const data = await response.json();
      if (data.success && data.content) {
        setArtifactContent(data.content);
      }
    } catch (error) {
      console.error('Failed to fetch artifact content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  // Handle artifact selection
  const handleSelectArtifact = useCallback((artifact: Artifact) => {
    setSelectedArtifact(artifact);
    // Only fetch content for code and document types that have content
    if ((artifact.type === 'code' || artifact.type === 'document') &&
        artifact.metadata?.hasContent) {
      fetchArtifactContent(artifact.id);
    } else {
      setArtifactContent(null);
    }
  }, [fetchArtifactContent]);

  const fetchArtifacts = async () => {
    try {
      const response = await fetch('/api/artifacts/inbox');
      const data = await response.json();
      if (data.success) {
        setInbox(data.inbox?.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })) || []);
        setSaved(data.saved?.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save a single artifact
  const handleSave = async (id: string) => {
    try {
      const response = await fetch(`/api/artifacts/${id}/save`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        // Move from inbox to saved
        const artifact = inbox.find(a => a.id === id);
        if (artifact) {
          setInbox(inbox.filter(a => a.id !== id));
          setSaved([{ ...artifact, status: 'saved' }, ...saved]);
        }
      }
    } catch (error) {
      console.error('Failed to save artifact:', error);
    }
  };

  // Delete a single artifact
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setInbox(inbox.filter(a => a.id !== id));
        setSaved(saved.filter(a => a.id !== id));
        if (selectedArtifact?.id === id) {
          setSelectedArtifact(null);
          setArtifactContent(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete artifact:', error);
    }
  };

  // Save all pending artifacts
  const handleSaveAll = async () => {
    try {
      const response = await fetch('/api/artifacts/inbox/save-all', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSaved([...inbox.map(a => ({ ...a, status: 'saved' as const })), ...saved]);
        setInbox([]);
      }
    } catch (error) {
      console.error('Failed to save all:', error);
    }
  };

  // Delete all pending artifacts
  const handleDeleteAll = async () => {
    if (!confirm('Delete all pending artifacts? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/artifacts/inbox/delete-all', { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setInbox([]);
        setSelectedArtifact(null);
        setArtifactContent(null);
      }
    } catch (error) {
      console.error('Failed to delete all:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Loading artifacts...</div>
      </div>
    );
  }

  const currentItems = activeTab === 'inbox' ? inbox : saved;

  return (
    <div className="h-full flex flex-col bg-bg-primary" data-testid="artifacts-inbox">
      {/* Header */}
      <div className="p-6 border-b border-border-default">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-coder1-cyan">Artifacts</h2>
            <p className="text-sm text-text-secondary mt-1">
              Review items from agent work
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-bg-secondary rounded-lg p-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'inbox'
                  ? 'bg-coder1-cyan text-black'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Inbox {inbox.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                  {inbox.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'saved'
                  ? 'bg-coder1-cyan text-black'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Saved {saved.length > 0 && (
                <span className="ml-1.5 text-text-muted text-xs">
                  ({saved.length})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bulk actions for inbox */}
        {activeTab === 'inbox' && inbox.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              className="px-3 py-1.5 text-sm font-medium text-green-400 border border-green-400/30 rounded hover:bg-green-400/10 transition-colors"
            >
              Save All
            </button>
            <button
              onClick={handleDeleteAll}
              className="px-3 py-1.5 text-sm font-medium text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
            >
              Delete All
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Items list */}
        <div className="w-1/2 border-r border-border-default overflow-y-auto">
          {currentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary p-6">
              <h3 className="text-lg font-medium mb-2">
                {activeTab === 'inbox' ? 'Inbox Empty' : 'No Saved Items'}
              </h3>
              <p className="text-sm text-center">
                {activeTab === 'inbox'
                  ? 'New artifacts from agent work will appear here'
                  : 'Saved artifacts will be stored here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {currentItems.map(artifact => (
                <div
                  key={artifact.id}
                  onClick={() => handleSelectArtifact(artifact)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedArtifact?.id === artifact.id
                      ? 'bg-coder1-cyan/10 border-l-2 border-coder1-cyan'
                      : 'hover:bg-bg-secondary border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{TYPE_ICONS[artifact.type]}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary truncate">
                        {artifact.name}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {artifact.sourceAgent && (
                          <span className="text-coder1-cyan">{artifact.sourceAgent}</span>
                        )}
                        {artifact.sourceAgent && ' • '}
                        {formatTimeAgo(new Date(artifact.createdAt))}
                        {' • '}
                        {formatSize(artifact.size)}
                      </p>
                      {artifact.metadata?.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {artifact.metadata.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  {activeTab === 'inbox' && (
                    <div className="flex gap-2 mt-3 ml-9">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(artifact.id); }}
                        className="px-3 py-1 text-xs font-medium text-green-400 bg-green-400/10 rounded hover:bg-green-400/20 transition-colors"
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(artifact.id); }}
                        className="px-3 py-1 text-xs font-medium text-red-400 bg-red-400/10 rounded hover:bg-red-400/20 transition-colors"
                      >
                        ✗ Delete
                      </button>
                    </div>
                  )}

                  {activeTab === 'saved' && (
                    <div className="flex gap-2 mt-3 ml-9">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(artifact.id); }}
                        className="px-3 py-1 text-xs font-medium text-red-400 bg-red-400/10 rounded hover:bg-red-400/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="w-1/2 overflow-y-auto bg-bg-secondary">
          {selectedArtifact ? (
            <div className="p-6">
              {/* Preview header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">{TYPE_ICONS[selectedArtifact.type]}</div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {selectedArtifact.name}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {selectedArtifact.type.charAt(0).toUpperCase() + selectedArtifact.type.slice(1)}
                    {' • '}
                    {formatSize(selectedArtifact.size)}
                  </p>
                </div>
              </div>

              {/* Content Preview */}
              <div className="mb-6">
                {isLoadingContent ? (
                  <div className="aspect-video bg-bg-primary rounded-lg border border-border-default flex items-center justify-center">
                    <div className="text-center text-text-muted">
                      <div className="animate-pulse text-4xl mb-2">⏳</div>
                      <p className="text-sm">Loading content...</p>
                    </div>
                  </div>
                ) : artifactContent ? (
                  <div className="bg-bg-primary rounded-lg border border-border-default overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-bg-secondary/50">
                      <span className="text-xs font-mono text-text-muted">
                        {getLanguageFromMimeType(selectedArtifact.metadata?.mimeType)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(artifactContent);
                        }}
                        className="text-xs text-coder1-cyan hover:text-coder1-cyan/80 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="p-4 overflow-auto max-h-[400px] text-sm font-mono text-text-primary whitespace-pre-wrap break-words">
                      <code>{artifactContent}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="aspect-video bg-bg-primary rounded-lg border border-border-default flex items-center justify-center">
                    <div className="text-center text-text-muted">
                      <div className="text-6xl mb-2">{TYPE_ICONS[selectedArtifact.type]}</div>
                      <p className="text-sm">
                        {selectedArtifact.metadata?.hasContent
                          ? 'Content preview not available'
                          : 'No content stored for this artifact'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-4">
                {selectedArtifact.sourceAgent && (
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Source</label>
                    <p className="text-text-primary">{selectedArtifact.sourceAgent}</p>
                  </div>
                )}

                {selectedArtifact.metadata?.description && (
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Description</label>
                    <p className="text-text-secondary">{selectedArtifact.metadata.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Created</label>
                  <p className="text-text-secondary">
                    {new Date(selectedArtifact.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Path</label>
                  <p className="text-text-secondary font-mono text-sm">{selectedArtifact.path}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-border-default flex gap-3">
                {selectedArtifact.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleSave(selectedArtifact.id)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white font-medium rounded hover:bg-green-600 transition-colors"
                    >
                      Save Artifact
                    </button>
                    <button
                      onClick={() => handleDelete(selectedArtifact.id)}
                      className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded hover:bg-red-500/30 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDelete(selectedArtifact.id)}
                    className="px-4 py-2 text-red-400 border border-red-400/30 font-medium rounded hover:bg-red-400/10 transition-colors"
                  >
                    Remove from Saved
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-text-muted p-6">
              <p>Select an item to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
