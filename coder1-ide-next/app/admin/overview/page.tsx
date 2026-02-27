'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, DollarSign, BarChart3, MessageSquare, RefreshCw, UserCheck, Mail } from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';

interface OverviewData {
  waitlist: { total: number; new7d: number; invitesSent: number };
  users: { total: number; new7d: number; proActive: number };
  costs: { todayCost: number; weeklyTotalCost: number };
  unreadFeedback: number;
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fmt = (n: number) => n.toLocaleString();
  const fmtCost = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <>
          {/* Waitlist */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Waitlist</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AdminStatCard
                label="Total Signups"
                value={fmt(data?.waitlist.total ?? 0)}
                icon={<Users className="w-5 h-5" />}
                delta={`+${data?.waitlist.new7d ?? 0} this week`}
                deltaPositive
              />
              <AdminStatCard
                label="Invites Sent"
                value={fmt(data?.waitlist.invitesSent ?? 0)}
                icon={<Mail className="w-5 h-5" />}
                subtext={`of ${data?.waitlist.total ?? 0} total`}
              />
              <AdminStatCard
                label="New (7d)"
                value={fmt(data?.waitlist.new7d ?? 0)}
                icon={<UserCheck className="w-5 h-5" />}
                subtext="signups this week"
              />
            </div>
          </div>

          {/* Users */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Registered Users</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AdminStatCard
                label="Total Users"
                value={fmt(data?.users.total ?? 0)}
                icon={<Users className="w-5 h-5" />}
                delta={`+${data?.users.new7d ?? 0} this week`}
                deltaPositive
              />
              <AdminStatCard
                label="Pro Subscribers"
                value={fmt(data?.users.proActive ?? 0)}
                icon={<UserCheck className="w-5 h-5" />}
                subtext="active Coder1 Pro"
              />
              <AdminStatCard
                label="New (7d)"
                value={fmt(data?.users.new7d ?? 0)}
                subtext="registered this week"
              />
            </div>
          </div>

          {/* Revenue & Costs */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Revenue & Costs</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AdminStatCard
                label="Today's API Cost"
                value={fmtCost(data?.costs.todayCost ?? 0)}
                icon={<BarChart3 className="w-5 h-5" />}
                subtext="Claude API spend"
              />
              <AdminStatCard
                label="Weekly API Cost"
                value={fmtCost(data?.costs.weeklyTotalCost ?? 0)}
                icon={<DollarSign className="w-5 h-5" />}
                subtext="last 7 days"
              />
              <AdminStatCard
                label="Unread Feedback"
                value={data?.unreadFeedback ?? 0}
                icon={<MessageSquare className="w-5 h-5" />}
                delta={data?.unreadFeedback ? 'Needs review' : 'All clear'}
                deltaPositive={!data?.unreadFeedback}
              />
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/admin/users', label: 'View Users', color: 'text-blue-400' },
              { href: '/admin/revenue', label: 'View Revenue', color: 'text-green-400' },
              { href: '/admin/costs', label: 'View Costs', color: 'text-yellow-400' },
              { href: '/admin/feedback', label: 'View Feedback', color: 'text-purple-400' },
            ].map(({ href, label, color }) => (
              <a
                key={href}
                href={href}
                className={`bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-medium ${color} hover:bg-gray-700 transition-colors text-center`}
              >
                {label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
