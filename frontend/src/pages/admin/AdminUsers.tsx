import { useState, useEffect } from 'react';
import { Search, Filter, Download, Users, Crown, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: string;
  joinedAt: string;
  applications: number;
  lastActive: string;
}

interface UserStatsData {
  stats: {
    totalUsers: number;
    premiumUsers: number;
    freeUsers: number;
    applicationsToday: number;
    conversionRate: number;
  };
  recentUsers: UserData[];
  growthData: Array<{
    date: string;
    free: number;
    premium: number;
  }>;
}

const tierColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800',
  premium: 'bg-purple-100 text-purple-800',
};

const tierIcons: Record<string, React.ReactNode> = {
  free: <Users className="h-3 w-3" />,
  premium: <Crown className="h-3 w-3" />,
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/admin/users/stats', {
          headers,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user stats: ${response.statusText}`);
        }
        
        const data: UserStatsData = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchUserStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayStats = stats?.stats || {
    totalUsers: 0,
    premiumUsers: 0,
    freeUsers: 0,
    applicationsToday: 0,
    conversionRate: 0,
  };

  const displayUsers = stats?.recentUsers || [];
  const displayGrowthData = stats?.growthData || [];

  const filteredUsers = displayUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pieData = [
    { name: 'Free', value: Math.max(0, displayStats.freeUsers), color: 'hsl(var(--muted-foreground))' },
    { name: 'Premium', value: displayStats.premiumUsers, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Analytics</h1>
          <p className="text-muted-foreground">Monitor user growth and engagement</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Users
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p><strong>Error:</strong> {error}</p>
          <p className="text-sm mt-1">Please ensure you are logged in as an admin.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {displayStats.totalUsers.toLocaleString()}
            </div>
            <p className="text-sm text-green-600">+18% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-muted-foreground">Premium Users</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {displayStats.premiumUsers.toLocaleString()}
            </div>
            <p className="text-sm text-green-600">+24% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Applications Today</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {displayStats.applicationsToday.toLocaleString()}
            </div>
            <p className="text-sm text-green-600">Realtime count</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">{displayStats.conversionRate.toFixed(1)}%</div>
            <p className="text-sm text-green-600">+2.4% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="free" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="premium" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table (desktop) and Cards (mobile) */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Users</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                  </div>
                  <Badge className={tierColors[u.tier]}>{u.tier.charAt(0).toUpperCase() + u.tier.slice(1)}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>Joined: {u.joinedAt}</div>
                  <div>Apps: {u.applications}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/table view */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge className={tierColors[user.tier]}>
                        <span className="mr-1">{tierIcons[user.tier]}</span>
                        {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.joinedAt}</TableCell>
                    <TableCell>{user.applications}</TableCell>
                    <TableCell className="text-muted-foreground">{user.lastActive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
