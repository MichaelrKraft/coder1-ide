'use client';

import { useState, useEffect, useCallback } from 'react';

type HiveMindEntry = {
  id: string;
  agentId: string;
  agentRole: string;
  taskTitle: string;
  outcome: string;
  createdAt: string;
};

const DAY_OPTIONS = [7, 30, 90] as const;

export default function HiveMindList() {
  const [entries, setEntries] = useState<HiveMindEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [days, setDays] = useState<number>(7);
  const [agentFilter, setAgentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (agentFilter.trim()) params.set('agentId', agentFilter.trim());
      const res = await fetch(`/api/agent-hub/hive-mind?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { entries: HiveMindEntry[]; total: number };
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [days, agentFilter]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  const outcomeColor = (outcome: string) => {
    if (outcome === 'success') return 'text-green-400';
    if (outcome === 'failed') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 shrink-0">
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Days</label>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
        >
          {DAY_OPTIONS.map(d => (
            <option key={d} value={d}>Last {d} days</option>
          ))}
        </select>
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider ml-4">Agent</label>
        <input
          type="text"
          placeholder="Filter by agent ID..."
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="bg-gray-800 text-white text-xs border border-gray-600 rounded px-2 py-1 w-48 focus:outline-none focus:border-cyan-500 placeholder-gray-500"
        />
        <span className="ml-auto text-xs text-gray-500">{total} total</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading...</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No activity in last {days} days
          </div>
        )}
        {!loading && !error && entries.length > 0 && (
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wider">Agent</th>
                <th className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wider">Task</th>
                <th className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wider">Outcome</th>
                <th className="px-4 py-2 text-gray-400 font-semibold uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-gray-300 font-mono truncate max-w-[140px]" title={entry.agentId}>
                    {entry.agentRole || entry.agentId}
                  </td>
                  <td className="px-4 py-2 text-white truncate max-w-[260px]" title={entry.taskTitle}>
                    {entry.taskTitle}
                  </td>
                  <td className={`px-4 py-2 font-semibold capitalize ${outcomeColor(entry.outcome)}`}>
                    {entry.outcome}
                  </td>
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
