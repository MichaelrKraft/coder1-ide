'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Zap, Calendar } from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminSimpleChart from '@/components/admin/AdminSimpleChart';

interface CostsData {
  today: { tokens: number; cost: number; sessions: number };
  weekly: { totalTokens: number; totalCost: number; avgDailyCost: number };
  projectedMonthlyCost: number;
  chartData: Array<{ label: string; value: number; tokens: number }>;
}

export default function AdminCosts() {
  const [data, setData] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/costs');
      if (res.ok) {
        setData(await res.json());
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch costs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fmtCost = (n: number) => `$${n.toFixed(4)}`;
  const fmtTokens = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API Costs</h1>
          <p className="text-sm text-gray-400 mt-1">Claude API token usage and spend</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Updated: {lastUpdate.toLocaleTimeString()}</span>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              label="Today's Cost"
              value={fmtCost(data?.today.cost ?? 0)}
              icon={<Zap className="w-5 h-5" />}
              subtext={`${fmtTokens(data?.today.tokens ?? 0)} tokens`}
            />
            <AdminStatCard
              label="Weekly Cost"
              value={fmtCost(data?.weekly.totalCost ?? 0)}
              icon={<TrendingUp className="w-5 h-5" />}
              subtext="last 7 days"
            />
            <AdminStatCard
              label="Avg Daily Cost"
              value={fmtCost(data?.weekly.avgDailyCost ?? 0)}
              subtext="7-day average"
            />
            <AdminStatCard
              label="Monthly Projection"
              value={`$${(data?.projectedMonthlyCost ?? 0).toFixed(2)}`}
              icon={<Calendar className="w-5 h-5" />}
              subtext="at current rate"
            />
          </div>

          {/* Chart */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-medium text-white mb-1">7-Day Cost History</h2>
            <p className="text-xs text-gray-500 mb-4">Daily Claude API spend (USD)</p>
            <AdminSimpleChart
              data={data?.chartData ?? []}
              height={140}
              color="#22d3ee"
              formatValue={(v) => `$${v.toFixed(4)}`}
            />
          </div>

          {/* Token breakdown */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-sm font-medium text-white mb-3">Weekly Token Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400 text-xs mb-1">Total Tokens (7d)</div>
                <div className="text-white font-mono">{fmtTokens(data?.weekly.totalTokens ?? 0)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Today's Sessions</div>
                <div className="text-white font-mono">{data?.today.sessions ?? 0}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Today's Tokens</div>
                <div className="text-white font-mono">{fmtTokens(data?.today.tokens ?? 0)}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
