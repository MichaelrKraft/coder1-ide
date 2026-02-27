'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';

interface WaitlistRow {
  id: string;
  email: string;
  name?: string;
  signup_date: string;
  source?: string;
  invite_sent: boolean;
  invite_code?: string;
}

interface UserRow {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  subscription_tier: string;
  subscription_status: string;
  coder1_pro_active: boolean;
  last_login?: string;
}

interface ApiResponse {
  rows: (WaitlistRow | UserRow)[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsers() {
  const [view, setView] = useState<'waitlist' | 'users'>('waitlist');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, table: 'waitlist' | 'users') => {
    const label = table === 'waitlist' ? 'waitlist signup' : 'user account';
    if (!confirm(`Permanently delete this ${label}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, table }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to delete: ${err.error}`);
      }
    } catch {
      alert('Network error deleting record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelSubscription = async (userId: string, email: string) => {
    if (!confirm(`Cancel Pro subscription for ${email}? This will cancel their Stripe subscription immediately.`)) return;
    setCancellingId(userId);
    try {
      const res = await fetch('/api/admin/users/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to cancel: ${err.error}`);
      }
    } catch {
      alert('Network error cancelling subscription.');
    } finally {
      setCancellingId(null);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, page: String(page), limit: '25' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [view, page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString() : '—';

  const waitlistColumns = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name', render: (r: WaitlistRow) => r.name || '—' },
    { key: 'signup_date', label: 'Signed Up', render: (r: WaitlistRow) => fmtDate(r.signup_date) },
    { key: 'source', label: 'Source', render: (r: WaitlistRow) => r.source || '—' },
    {
      key: 'invite_sent', label: 'Invite',
      render: (r: WaitlistRow) => (
        <span className={`px-2 py-0.5 rounded text-xs ${r.invite_sent ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
          {r.invite_sent ? 'Sent' : 'Pending'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (r: WaitlistRow) => (
        <button
          onClick={() => handleDelete(r.id, 'waitlist')}
          disabled={deletingId === r.id}
          className="p-1 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
          title="Remove from waitlist"
        >
          ✕
        </button>
      ),
    },
  ];

  const userColumns = [
    { key: 'email', label: 'Email' },
    { key: 'username', label: 'Username', render: (r: UserRow) => r.username || '—' },
    { key: 'created_at', label: 'Joined', render: (r: UserRow) => fmtDate(r.created_at) },
    { key: 'last_login', label: 'Last Login', render: (r: UserRow) => fmtDate(r.last_login) },
    {
      key: 'subscription_tier', label: 'Plan',
      render: (r: UserRow) => (
        <span className={`px-2 py-0.5 rounded text-xs ${r.coder1_pro_active ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-700 text-gray-400'}`}>
          {r.coder1_pro_active ? 'Pro' : r.subscription_tier}
        </span>
      ),
    },
    {
      key: 'subscription_status', label: 'Status',
      render: (r: UserRow) => {
        const colors: Record<string, string> = { active: 'text-green-400', cancelled: 'text-red-400', past_due: 'text-yellow-400' };
        return <span className={`text-xs ${colors[r.subscription_status] || 'text-gray-400'}`}>{r.subscription_status}</span>;
      },
    },
    {
      key: 'actions', label: 'Actions',
      render: (r: UserRow) => (
        <div className="flex items-center gap-2">
          {r.coder1_pro_active && (
            <button
              onClick={() => handleCancelSubscription(r.id, r.email)}
              disabled={cancellingId === r.id}
              className="px-2 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingId === r.id ? 'Cancelling…' : 'Cancel Sub'}
            </button>
          )}
          <button
            onClick={() => handleDelete(r.id, 'users')}
            disabled={deletingId === r.id}
            className="p-1 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete user account"
          >
            ✕
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-400 mt-1">{data?.total ?? 0} total {view === 'waitlist' ? 'waitlist signups' : 'registered users'}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1 w-fit mb-4">
        {(['waitlist', 'users'] as const).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setPage(1); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              view === v ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {v === 'waitlist' ? 'Waitlist' : 'Registered'}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by email..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button type="submit" className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="px-3 py-2 text-sm text-gray-400 hover:text-white">
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <AdminTable
          columns={view === 'waitlist' ? waitlistColumns as never : userColumns as never}
          rows={(data?.rows ?? []) as never}
          keyField="id"
          emptyMessage={`No ${view === 'waitlist' ? 'waitlist signups' : 'users'} found.`}
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
