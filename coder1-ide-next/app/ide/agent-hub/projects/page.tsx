'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FolderKanban, Trash2, ChevronRight, X, Bot, CheckSquare, Play, DollarSign } from 'lucide-react';

const PROJECT_COLORS = ['#00d9ff', '#ec4899', '#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#ef4444', '#eab308'];

interface Project {
  id: string;
  name: string;
  color: string;
  workspacePath: string;
  createdAt: string;
}

interface ProjectStats {
  agents: { id: string; name: string; role: string; status: string }[];
  tasks: { id: string; title: string; status: string; priority: string }[];
  totalRuns: number;
  totalCostCents: number;
}

const TASK_STATUS_DOTS: Record<string, string> = {
  done: 'bg-green-400',
  in_progress: 'bg-amber-400',
  in_review: 'bg-blue-400',
  todo: 'bg-gray-400',
  backlog: 'bg-gray-500',
  cancelled: 'bg-red-400',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#00d9ff');
  const [workspacePath, setWorkspacePath] = useState('');

  const fetchProjects = useCallback(() => {
    fetch('/api/agent-hub/projects')
      .then(r => r.json())
      .then(data => setProjects(data.projects ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!selectedId) { setStats(null); return; }
    fetch(`/api/agent-hub/projects/${selectedId}/stats`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => setStats(null));
  }, [selectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspacePath.trim()) return;
    const res = await fetch('/api/agent-hub/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color, workspacePath: workspacePath.trim() }),
    });
    if (res.ok) {
      setName(''); setWorkspacePath(''); setShowForm(false);
      fetchProjects();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? Agents linked to it will not be deleted.')) return;
    const res = await fetch(`/api/agent-hub/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedId === id) setSelectedId(null);
      fetchProjects();
    }
  };

  const selectedProject = projects.find(p => p.id === selectedId);

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Left: Project List */}
      <div className={`${selectedId ? 'w-[220px] min-w-[220px]' : 'w-full max-w-3xl'} border-r border-border-default flex flex-col shrink-0 ${!selectedId ? 'mx-auto border-r-0' : ''}`}>
        <div className="p-4 border-b border-border-default shrink-0">
          <div className="flex items-center justify-between">
            <h1 className={`${selectedId ? 'text-sm' : 'text-lg'} font-semibold text-text-primary`}>Projects</h1>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1 px-2 py-1 bg-coder1-cyan/10 text-coder1-cyan text-xs font-medium rounded hover:bg-coder1-cyan/20 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {!selectedId && 'New'}
            </button>
          </div>
          {!selectedId && <p className="text-xs text-text-muted mt-0.5">Group agents and tasks under named projects.</p>}
        </div>

        {showForm && !selectedId && (
          <form onSubmit={handleCreate} className="p-4 border-b border-border-default space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name"
              className="w-full bg-bg-tertiary border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50" autoFocus />
            <input value={workspacePath} onChange={e => setWorkspacePath(e.target.value)} placeholder="/path/to/project"
              className="w-full bg-bg-tertiary border border-border-default rounded px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Color:</span>
              {PROJECT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 bg-coder1-cyan/10 text-coder1-cyan text-xs font-medium rounded hover:bg-coder1-cyan/20">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-text-muted">Cancel</button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FolderKanban className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No projects yet.</p>
            </div>
          ) : (
            <div className={selectedId ? 'py-1' : 'p-4 space-y-2'}>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left flex items-center gap-3 transition-colors ${
                    selectedId
                      ? `px-4 py-2.5 ${p.id === selectedId ? 'bg-coder1-cyan/10 text-coder1-cyan' : 'text-text-secondary hover:bg-bg-secondary'}`
                      : 'bg-bg-secondary border border-border-default rounded-lg px-4 py-3 group hover:border-coder1-cyan/30'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className={`${selectedId ? 'text-xs' : 'text-sm'} font-medium truncate`}>{p.name}</p>
                    {!selectedId && <p className="text-xs text-text-muted font-mono truncate">{p.workspacePath}</p>}
                  </div>
                  {!selectedId && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Project Detail */}
      {selectedId && selectedProject && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-default shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <button onClick={() => setSelectedId(null)} className="hover:text-text-secondary">Projects</button>
              <ChevronRight size={12} />
              <span className="text-text-secondary">{selectedProject.name}</span>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-text-muted hover:text-text-secondary">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Project info */}
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color }} />
              <div>
                <h2 className="text-base font-semibold text-text-primary">{selectedProject.name}</h2>
                <p className="text-xs text-text-muted font-mono">{selectedProject.workspacePath}</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Created {new Date(selectedProject.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard icon={<Bot size={14} className="text-coder1-cyan" />} label="Agents" value={String(stats.agents.length)} />
                  <StatCard icon={<CheckSquare size={14} className="text-blue-400" />} label="Tasks" value={String(stats.tasks.length)} />
                  <StatCard icon={<Play size={14} className="text-green-400" />} label="Runs" value={String(stats.totalRuns)} />
                  <StatCard icon={<DollarSign size={14} className="text-amber-400" />} label="Spent" value={`$${(stats.totalCostCents / 100).toFixed(2)}`} />
                </div>

                {/* Agents */}
                <section>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Agents ({stats.agents.length})
                  </p>
                  {stats.agents.length === 0 ? (
                    <p className="text-xs text-text-muted bg-bg-secondary rounded-lg p-3">No agents assigned to this project.</p>
                  ) : (
                    <div className="bg-bg-secondary border border-border-default rounded-lg divide-y divide-border-default">
                      {stats.agents.map(a => (
                        <div key={a.id} className="flex items-center gap-2.5 px-3 py-2">
                          <Bot size={12} className="text-text-muted shrink-0" />
                          <span className="text-xs text-text-secondary flex-1 truncate">{a.name}</span>
                          <span className="text-[10px] text-text-muted">{a.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Tasks */}
                <section>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Tasks ({stats.tasks.length})
                  </p>
                  {stats.tasks.length === 0 ? (
                    <p className="text-xs text-text-muted bg-bg-secondary rounded-lg p-3">No tasks in this project yet.</p>
                  ) : (
                    <div className="bg-bg-secondary border border-border-default rounded-lg divide-y divide-border-default">
                      {stats.tasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2.5 px-3 py-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TASK_STATUS_DOTS[t.status] ?? 'bg-gray-500'}`} />
                          <span className="text-xs text-text-secondary flex-1 truncate">{t.title}</span>
                          <span className="text-[10px] text-text-muted">{t.status.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Delete */}
                <section className="pt-4 border-t border-border-default">
                  <button
                    onClick={() => handleDelete(selectedProject.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete project
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-bg-tertiary flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted">{label}</p>
        <p className="text-sm font-semibold text-text-secondary truncate">{value}</p>
      </div>
    </div>
  );
}
