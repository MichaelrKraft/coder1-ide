'use client';

import { useEffect, useState } from 'react';
import { Trash2, Save } from 'lucide-react';
import GoalStatusChip from './GoalStatusChip';
import type { Goal } from '@/lib/agent-hub/goals';

interface Props {
  goalId: string;
  onDeleted: () => void;
  onUpdated: (goal: Goal) => void;
}

interface EditFields {
  title: string;
  description: string;
  status: Goal['status'];
  dueDate: string;
}

export default function GoalDetail({ goalId, onDeleted, onUpdated }: Props) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditFields>({
    title: '',
    description: '',
    status: 'active',
    dueDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setEditing(false);
    setConfirmDelete(false);

    fetch(`/api/agent-hub/goals/${goalId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load goal');
        const data = await res.json() as { goal: Goal };
        setGoal(data.goal);
        setFields({
          title: data.goal.title,
          description: data.goal.description,
          status: data.goal.status,
          dueDate: data.goal.dueDate ?? '',
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load goal');
      })
      .finally(() => setLoading(false));
  }, [goalId]);

  async function handleSave() {
    if (!goal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agent-hub/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fields.title,
          description: fields.description,
          status: fields.status,
          dueDate: fields.dueDate || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update goal');
      const data = await res.json() as { goal: Goal };
      setGoal(data.goal);
      onUpdated(data.goal);
      setEditing(false);
      setMutationError(null);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    try {
      const res = await fetch(`/api/agent-hub/goals/${goal.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  }

  if (loading) return <div className="p-4 text-text-muted text-sm">Loading…</div>;
  if (error) return <div className="p-4 text-red-400 text-xs">{error}</div>;
  if (!goal) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-border-default">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={fields.title}
              onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-2 py-1 rounded bg-bg-secondary border border-border-default text-sm font-semibold text-text-secondary focus:outline-none focus:border-coder1-cyan/50"
            />
          ) : (
            <h2 className="text-base font-semibold text-text-secondary truncate">{goal.title}</h2>
          )}
          <div className="flex items-center gap-2 mt-1">
            <GoalStatusChip status={editing ? fields.status : goal.status} />
            {goal.dueDate && !editing && (
              <span className="text-[10px] text-text-muted">
                Due {new Date(goal.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium border border-coder1-cyan/30 transition-colors disabled:opacity-50"
              >
                <Save size={12} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded text-text-muted hover:text-text-secondary text-xs transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded text-text-muted hover:text-text-secondary text-xs transition-colors border border-border-default hover:border-border-hover"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Mutation error */}
      {mutationError && (
        <p className="px-5 py-2 text-red-400 text-sm">{mutationError}</p>
      )}

      {/* Body */}
      <div className="flex-1 px-5 py-4 space-y-5">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">Progress</span>
            <span className="text-xs text-text-secondary font-medium">{goal.progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-border-default">
            <div
              className="h-2 rounded-full bg-coder1-cyan transition-all"
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">
            Description
          </span>
          {editing ? (
            <textarea
              value={fields.description}
              onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded bg-bg-secondary border border-border-default text-xs text-text-secondary focus:outline-none focus:border-coder1-cyan/50 resize-none"
            />
          ) : (
            <p className="text-xs text-text-secondary whitespace-pre-wrap">
              {goal.description || <span className="text-text-muted italic">No description</span>}
            </p>
          )}
        </div>

        {/* Status (edit mode only) */}
        {editing && (
          <div>
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">
              Status
            </span>
            <select
              value={fields.status}
              onChange={(e) => setFields((f) => ({ ...f, status: e.target.value as Goal['status'] }))}
              className="px-3 py-1.5 rounded bg-bg-secondary border border-border-default text-xs text-text-secondary focus:outline-none focus:border-coder1-cyan/50"
            >
              {(['active', 'completed', 'paused', 'abandoned'] as const).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Due date (edit mode only) */}
        {editing && (
          <div>
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">
              Due Date
            </span>
            <input
              type="date"
              value={fields.dueDate}
              onChange={(e) => setFields((f) => ({ ...f, dueDate: e.target.value }))}
              className="px-3 py-1.5 rounded bg-bg-secondary border border-border-default text-xs text-text-secondary focus:outline-none focus:border-coder1-cyan/50"
            />
          </div>
        )}

        {/* Linked tasks */}
        <div>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">
            Linked Tasks
          </span>
          {goal.taskIds.length === 0 ? (
            <p className="text-xs text-text-muted italic">No tasks linked — task linking coming soon.</p>
          ) : (
            <p className="text-xs text-text-secondary">
              {goal.taskIds.length} task{goal.taskIds.length !== 1 ? 's' : ''} linked.{' '}
              <span className="text-text-muted">Task linking UI coming soon.</span>
            </p>
          )}
        </div>
      </div>

      {/* Delete */}
      <div className="px-5 py-3 border-t border-border-default">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Delete this goal?</span>
            <button
              onClick={handleDelete}
              className="px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/30 transition-colors"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded text-text-muted hover:text-text-secondary text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
            Delete goal
          </button>
        )}
      </div>
    </div>
  );
}
