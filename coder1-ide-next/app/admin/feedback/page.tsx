'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import AdminFeedbackItem from '@/components/admin/AdminFeedbackItem';

type FeedbackType = 'all' | 'bug' | 'feature' | 'general';
type FeedbackStatus = 'all' | 'new' | 'reviewed' | 'resolved';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string;
  status: 'new' | 'reviewed' | 'resolved';
  createdAt: string;
}

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FeedbackType>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/feedback?${params}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    // Optimistic update
    setItems(prev => prev.filter(f => f.id !== id));

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) fetchData(); // Revert on error
    } catch {
      fetchData();
    }
  };

  const handleStatusChange = async (id: string, status: FeedbackItem['status']) => {
    // Optimistic update
    setItems(prev => prev.map(f => f.id === id ? { ...f, status } : f));

    try {
      await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      // Revert on error
      fetchData();
    }
  };

  const counts = {
    all: items.length,
    new: items.filter(f => f.status === 'new').length,
    reviewed: items.filter(f => f.status === 'reviewed').length,
    resolved: items.filter(f => f.status === 'resolved').length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback</h1>
          <p className="text-sm text-gray-400 mt-1">{items.length} items · {counts.new} unread</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {(['all', 'bug', 'feature', 'general'] as FeedbackType[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                typeFilter === t ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {(['all', 'new', 'reviewed', 'resolved'] as FeedbackStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {s}{s !== 'all' && counts[s] > 0 ? ` (${counts[s]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-500 text-sm">
          No feedback found.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <AdminFeedbackItem
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
