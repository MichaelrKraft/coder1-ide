'use client';

import { useEffect, useState } from 'react';
import { Plus, Target } from 'lucide-react';
import GoalStatusChip from './GoalStatusChip';
import EmptyState from '@/components/agent-hub/shared/EmptyState';
import type { Goal } from '@/lib/agent-hub/goals';

type StatusFilter = 'all' | Goal['status'];

interface Props {
  onGoalSelect: (id: string) => void;
  selectedGoalId: string | null;
}

interface NewGoalForm {
  title: string;
  description: string;
}

export default function GoalList({ onGoalSelect, selectedGoalId }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewGoalForm>({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  async function loadGoals() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-hub/goals');
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to fetch');
      }
      const data = await res.json() as { goals: Goal[] };
      setGoals(data.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGoals();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/agent-hub/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), description: form.description.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      const data = await res.json() as { goal: Goal };
      setGoals((prev) => [data.goal, ...prev]);
      setForm({ title: '', description: '' });
      setShowForm(false);
      setError(null);
      onGoalSelect(data.goal.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = statusFilter === 'all' ? goals : goals.filter((g) => g.status === statusFilter);

  const FILTERS: StatusFilter[] = ['all', 'active', 'completed', 'paused', 'abandoned'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Goals
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium border border-coder1-cyan/30 transition-colors"
        >
          <Plus size={13} />
          New Goal
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-3 border-b border-border-default bg-bg-secondary">
          <input
            autoFocus
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Goal title"
            className="w-full mb-2 px-3 py-1.5 rounded bg-bg-primary border border-border-default text-xs text-text-secondary placeholder-text-muted focus:outline-none focus:border-coder1-cyan/50"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full mb-2 px-3 py-1.5 rounded bg-bg-primary border border-border-default text-xs text-text-secondary placeholder-text-muted focus:outline-none focus:border-coder1-cyan/50"
          />
          {error && showForm && (
            <p className="text-red-400 text-xs mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-1.5 rounded bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium border border-coder1-cyan/30 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded text-text-muted hover:text-text-secondary text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Status filters */}
      <div className="flex gap-1 px-3 py-2 border-b border-border-default overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
              statusFilter === f
                ? 'bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/30'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-text-muted text-sm">Loading…</div>
        ) : error ? (
          <div className="p-4 text-red-400 text-xs">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Target size={28} />}
            title="No goals yet"
            description="Create an objective to organise your agent tasks and track progress."
            action={{ label: 'Create goal', onClick: () => setShowForm(true) }}
          />
        ) : (
          <ul className="divide-y divide-border-default">
            {filtered.map((goal) => (
              <li key={goal.id}>
                <button
                  onClick={() => onGoalSelect(goal.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors ${
                    selectedGoalId === goal.id
                      ? 'bg-bg-secondary border-l-2 border-coder1-cyan'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-text-secondary truncate">
                      {goal.title}
                    </span>
                    <GoalStatusChip status={goal.status} />
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-border-default mb-1.5">
                    <div
                      className="h-1 rounded-full bg-coder1-cyan transition-all"
                      style={{ width: `${goal.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-text-muted">
                      {goal.taskIds.length} task{goal.taskIds.length !== 1 ? 's' : ''}
                    </span>
                    {goal.dueDate && (
                      <span className="text-[10px] text-text-muted">
                        Due {new Date(goal.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
