'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Mail, 
  TrendingUp, 
  Activity, 
  Download, 
  RefreshCw, 
  Search,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  email: string;
  username: string;
  subscription_tier: string;
  created_at: string;
  last_login: string;
  ghlData?: {
    id: string;
    tags: string[];
    customFields: any;
  };
}

interface Statistics {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  teamUsers: number;
  newThisWeek: number;
  activeToday: number;
  totalProjects: number;
  usersWithProjects: number;
}

interface GHLStats {
  enabled: boolean;
  connectionStatus?: string;
  statistics?: any;
  recentContacts?: any[];
  configuration?: any;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [ghlStats, setGhlStats] = useState<GHLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTier, setSelectedTier] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchGHLStats();
  }, [currentPage, searchTerm, selectedTier]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        search: searchTerm,
        tier: selectedTier,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGHLStats = async () => {
    try {
      const response = await fetch('/api/admin/ghl-stats');
      if (response.ok) {
        const data = await response.json();
        setGhlStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch GHL stats:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coderone-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast({
        title: 'Success',
        description: 'User data exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export user data',
        variant: 'destructive',
      });
    }
  };

  const handleSyncGHL = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-ghl' }),
      });

      if (!response.ok) throw new Error('Sync failed');

      const data = await response.json();
      toast({
        title: 'Sync Complete',
        description: `Synced ${data.results.synced} of ${data.results.total} users`,
      });

      // Refresh stats
      fetchGHLStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync with GHL',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coder1-cyan"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">CoderOne Customer Management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          {ghlStats?.enabled && (
            <Button onClick={handleSyncGHL} disabled={syncing} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync with GHL
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statistics?.newThisWeek || 0} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.activeToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.proUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statistics?.teamUsers || 0} team accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              By {statistics?.usersWithProjects || 0} users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GHL Integration Status */}
      {ghlStats && (
        <Card>
          <CardHeader>
            <CardTitle>Go High Level Integration</CardTitle>
            <CardDescription>CRM sync status and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {ghlStats.enabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {ghlStats.connectionStatus === 'connected' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-500 font-medium">Disconnected</span>
                    </>
                  )}
                </div>
                
                {ghlStats.statistics && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Contacts</p>
                      <p className="text-xl font-semibold">{ghlStats.statistics.totalContacts}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recent Signups</p>
                      <p className="text-xl font-semibold">{ghlStats.statistics.recentSignups}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subscription Breakdown</p>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Free:</span> {ghlStats.statistics.subscriptionTiers?.free || 0} | 
                        <span className="text-muted-foreground"> Pro:</span> {ghlStats.statistics.subscriptionTiers?.pro || 0}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Webhook URL: <code className="bg-muted px-1">{ghlStats.configuration?.webhookUrl}</code>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                GHL integration is not enabled. Add your GHL credentials to .env.local to enable.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Search and manage your users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Username</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Signup Date</th>
                  <th className="text-left p-2">Last Login</th>
                  <th className="text-left p-2">GHL Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-md text-xs ${
                        user.subscription_tier === 'pro' ? 'bg-coder1-cyan/20 text-coder1-cyan' :
                        user.subscription_tier === 'team' ? 'bg-coder1-purple/20 text-coder1-purple' :
                        'bg-muted'
                      }`}>
                        {user.subscription_tier}
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-2">
                      {user.ghlData ? (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}