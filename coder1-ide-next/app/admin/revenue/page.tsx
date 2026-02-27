'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminTable from '@/components/admin/AdminTable';

interface Charge {
  id: string;
  email: string;
  amount: number;
  status: string;
  date: string;
}

interface RevenueData {
  subscriptions: {
    active: number;
    cancelled: number;
    pastDue: number;
    new7d: number;
    new30d: number;
  };
  mrr: number;
  proPriceAmount: number;
  recentCharges: Charge[];
}

export default function AdminRevenue() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/revenue');
      if (res.ok) {
        setData(await res.json());
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch revenue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

  const chargeColumns = [
    { key: 'email', label: 'Customer' },
    {
      key: 'amount', label: 'Amount',
      render: (r: Charge) => <span className="font-mono">{fmtMoney(r.amount)}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (r: Charge) => {
        const colors: Record<string, string> = {
          succeeded: 'text-green-400',
          failed: 'text-red-400',
          pending: 'text-yellow-400',
        };
        return <span className={`text-xs ${colors[r.status] || 'text-gray-400'}`}>{r.status}</span>;
      },
    },
    {
      key: 'date', label: 'Date',
      render: (r: Charge) => new Date(r.date).toLocaleDateString(),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue</h1>
          <p className="text-sm text-gray-400 mt-1">Stripe subscriptions and transactions</p>
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
          {/* MRR + Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              label="MRR"
              value={fmtMoney(data?.mrr ?? 0)}
              icon={<DollarSign className="w-5 h-5" />}
              subtext={`${data?.subscriptions.active ?? 0} active × ${fmtMoney(data?.proPriceAmount ?? 0)}/mo`}
            />
            <AdminStatCard
              label="Active Subscribers"
              value={data?.subscriptions.active ?? 0}
              icon={<Users className="w-5 h-5" />}
              delta={`+${data?.subscriptions.new7d ?? 0} this week`}
              deltaPositive
            />
            <AdminStatCard
              label="New (30d)"
              value={data?.subscriptions.new30d ?? 0}
              icon={<TrendingUp className="w-5 h-5" />}
              subtext="new Pro subscribers"
            />
            <AdminStatCard
              label="Churned"
              value={data?.subscriptions.cancelled ?? 0}
              icon={<TrendingDown className="w-5 h-5" />}
              subtext={`${data?.subscriptions.pastDue ?? 0} past due`}
            />
          </div>

          {/* Subscription status breakdown */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-medium text-white mb-3">Subscription Status Breakdown</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Active', count: data?.subscriptions.active ?? 0, color: 'text-green-400' },
                { label: 'Cancelled', count: data?.subscriptions.cancelled ?? 0, color: 'text-red-400' },
                { label: 'Past Due', count: data?.subscriptions.pastDue ?? 0, color: 'text-yellow-400' },
              ].map(({ label, count, color }) => {
                const total = (data?.subscriptions.active ?? 0) + (data?.subscriptions.cancelled ?? 0) + (data?.subscriptions.pastDue ?? 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${color}`}>{label}</span>
                      <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color.replace('text-', 'bg-').replace('-400', '-500')}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent transactions */}
          <div>
            <h2 className="text-sm font-medium text-white mb-3">Recent Transactions</h2>
            {data?.recentCharges && data.recentCharges.length > 0 ? (
              <AdminTable
                columns={chargeColumns}
                rows={data.recentCharges as never}
                keyField="id"
                emptyMessage="No transactions found."
              />
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-gray-500 text-sm">
                {process.env.STRIPE_SECRET_KEY ? 'No transactions found.' : 'Stripe not configured — set STRIPE_SECRET_KEY to view transactions.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
