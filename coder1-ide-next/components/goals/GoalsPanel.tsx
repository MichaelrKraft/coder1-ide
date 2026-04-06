'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, ChevronDown, ChevronRight, X } from 'lucide-react';
import GoalCard from './GoalCard';

interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  ownerId: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  dueDate?: string;
  taskIds: string[];
  progressPercent: number;
  turn: 'user' | 'claude' | 'done';
  createdAt: string;
  updatedAt: string;
}

export default function GoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-hub/goals');
      if (!res.ok) throw new Error('Failed to fetch goals');
      const data = await res.json();
      setGoals(data.goals ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 10_000);
    return () => clearInterval(interval);
  }, [fetchGoals]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/agent-hub/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          ownerId: 'user',
          status: 'active',
          taskIds: [],
          progressPercent: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      setTitle('');
      setDescription('');
      setShowForm(false);
      await fetchGoals();
    } catch {
      setError('Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const userTurn = goals.filter((g) => g.turn === 'user' && g.status !== 'completed');
  const claudeTurn = goals.filter((g) => g.turn === 'claude' && g.status !== 'completed');
  const done = goals.filter((g) => g.turn === 'done' || g.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-text-muted text-sm">
        Loading goals...
      </div>
    );
  }

  if (error && goals.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <h2 className="text-sm font-medium text-text-primary">Goals</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-xs text-coder1-cyan hover:opacity-80 transition-opacity"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="px-3 py-2 border-b border-border-default space-y-2">
          <input
            type="text"
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm px-2 py-1.5 rounded bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm px-2 py-1.5 rounded bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="w-full text-xs py-1.5 rounded bg-coder1-cyan text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-text-muted gap-2">
          <Target className="w-8 h-8" />
          <p className="text-sm text-center">No goals yet. Click + to start.</p>
        </div>
      )}

      {/* Sections */}
      <div className="flex-1 px-2 py-2 space-y-3">
        {/* Your Turn */}
        {userTurn.length > 0 && (
          <Section title="Your Turn" count={userTurn.length} color="text-amber-400" defaultOpen>
            {userTurn.map((g) => (
              <GoalCard key={g.id} goal={g} isExpanded={expandedId === g.id} onToggle={handleToggle} />
            ))}
          </Section>
        )}

        {/* Claude's Turn */}
        {claudeTurn.length > 0 && (
          <Section title="Claude's Turn" count={claudeTurn.length} color="text-teal-400" defaultOpen>
            {claudeTurn.map((g) => (
              <GoalCard key={g.id} goal={g} isExpanded={expandedId === g.id} onToggle={handleToggle} />
            ))}
          </Section>
        )}

        {/* Done */}
        {done.length > 0 && (
          <Section
            title="Done"
            count={done.length}
            color="text-gray-400"
            defaultOpen={false}
            collapsed={!showDone}
            onToggleCollapse={() => setShowDone((v) => !v)}
          >
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} isExpanded={expandedId === g.id} onToggle={handleToggle} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  color,
  defaultOpen = true,
  collapsed,
  onToggleCollapse,
  children,
}: {
  title: string;
  count: number;
  color: string;
  defaultOpen?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}) {
  const isCollapsed = collapsed ?? !defaultOpen;
  const toggle = onToggleCollapse ?? (() => {});

  return (
    <div>
      <button
        onClick={onToggleCollapse ? toggle : undefined}
        className={`flex items-center gap-1.5 mb-1.5 text-xs font-medium ${color} ${onToggleCollapse ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
      >
        {onToggleCollapse && (
          isCollapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
        )}
        {title} ({count})
      </button>
      {!isCollapsed && <div className="space-y-1.5">{children}</div>}
    </div>
  );
}
