'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LayoutDashboard, Bot, ListTodo, Play, Target, Plus, ChevronDown } from 'lucide-react';

const tabs = [
  { href: '/ide/agent-hub/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ide/agent-hub/agents', label: 'Agents', icon: Bot },
  { href: '/ide/agent-hub/tasks',  label: 'Tasks',  icon: ListTodo },
  { href: '/ide/agent-hub/runs',   label: 'Runs',   icon: Play },
  { href: '/ide/agent-hub/goals',  label: 'Goals',  icon: Target },
];

const PROJECT_COLORS = ['#00d9ff', '#ec4899', '#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#ef4444', '#eab308'];

interface ProjectSummary {
  id: string;
  name: string;
  color: string;
}

function AgentHubLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedProjectId = searchParams.get('project');

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [showProjects, setShowProjects] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#00d9ff');
  const [newProjectPath, setNewProjectPath] = useState('');

  useEffect(() => {
    fetch('/api/agent-hub/projects')
      .then(r => r.json())
      .then(data => setProjects(data.projects ?? []))
      .catch(() => {});
  }, []);

  const navigateToProject = (projectId: string | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (projectId) {
      sp.set('project', projectId);
    } else {
      sp.delete('project');
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectPath.trim()) return;
    const res = await fetch('/api/agent-hub/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newProjectName.trim(),
        color: newProjectColor,
        workspacePath: newProjectPath.trim(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(prev => [...prev, data.project]);
      setNewProjectName('');
      setNewProjectPath('');
      setShowNewProject(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <nav className="flex border-b border-border-default shrink-0">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                active
                  ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Project sidebar */}
      <div className="border-b border-border-default px-3 py-2">
        <button
          onClick={() => setShowProjects(v => !v)}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-widest w-full"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showProjects ? '' : '-rotate-90'}`} />
          Projects
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setShowNewProject(v => !v); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowNewProject(v => !v); } }}
            className="ml-auto text-text-muted hover:text-coder1-cyan"
          >
            <Plus className="w-3 h-3" />
          </span>
        </button>

        {showProjects && (
          <div className="mt-2 space-y-1">
            {/* All Projects option */}
            <button
              onClick={() => navigateToProject(null)}
              className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-colors ${
                !selectedProjectId ? 'text-coder1-cyan bg-bg-tertiary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All Projects
            </button>

            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => navigateToProject(p.id)}
                className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-colors ${
                  selectedProjectId === p.id ? 'text-text-primary bg-bg-tertiary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}

            {/* Inline new project form */}
            {showNewProject && (
              <form onSubmit={handleCreateProject} className="space-y-1.5 pt-1 border-t border-border-default mt-1">
                <input
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                />
                <input
                  value={newProjectPath}
                  onChange={e => setNewProjectPath(e.target.value)}
                  placeholder="/path/to/project"
                  className="w-full bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                />
                <div className="flex gap-1">
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewProjectColor(c)}
                      className={`w-4 h-4 rounded-full border-2 ${newProjectColor === c ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setShowNewProject(false)} className="text-xs text-text-muted">
                    Cancel
                  </button>
                  <button type="submit" className="text-xs text-coder1-cyan">
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}

export default function AgentHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-text-muted text-xs">Loading...</div>}>
      <AgentHubLayoutInner>{children}</AgentHubLayoutInner>
    </Suspense>
  );
}
