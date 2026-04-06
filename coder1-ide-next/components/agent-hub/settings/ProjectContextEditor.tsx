'use client';

import { useState, useEffect } from 'react';
import { Save, FolderOpen } from 'lucide-react';

const MAX_SIZE = 8 * 1024;

interface Project {
  id: string;
  name: string;
  workspacePath: string;
}

export default function ProjectContextEditor() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/agent-hub/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setContent('');
      return;
    }
    setLoading(true);
    setError('');
    fetch(`/api/agent-hub/settings/project-context?projectId=${encodeURIComponent(selectedId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content || '');
        }
      })
      .catch(() => setError('Failed to load context'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/agent-hub/settings/project-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedId, content }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-coder1-cyan" />
        <h2 className="text-sm font-semibold text-text-primary">Project Context</h2>
      </div>
      <p className="text-xs text-text-muted">
        Edit CONTEXT.md for a project. This file is injected as context into agent runs scoped to that project.
      </p>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
      >
        <option value="">Select a project...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {selectedId && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {projects.find((p) => p.id === selectedId)?.workspacePath}/CONTEXT.md
            </span>
            <span
              className={`text-[10px] font-mono ${
                content.length > MAX_SIZE * 0.9 ? 'text-red-400' : 'text-text-muted'
              }`}
            >
              {content.length.toLocaleString()} / {MAX_SIZE.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_SIZE))}
            disabled={loading}
            className="w-full h-64 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 resize-y disabled:opacity-50"
            placeholder="# Project Context\n\nDescribe project-specific context here..."
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/10 text-coder1-cyan text-xs font-medium rounded hover:bg-coder1-cyan/20 transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saved && <span className="text-xs text-green-400">Saved</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
