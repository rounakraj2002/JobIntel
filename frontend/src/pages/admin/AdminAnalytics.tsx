import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  date: string;
  posted?: number;
  jobs?: number;
  revenue?: number;
}

interface VisitorAnalytics {
  summary: {
    totalVisitors: number;
    activeVisitors: number;
    totalPageViews: number;
    totalClicks: number;
    avgPageViewsPerVisitor: number;
    avgClicksPerVisitor: number;
  };
  topPages: Array<{
    page: string;
    views: number;
    clicks: number;
  }>;
  hourlyData: Array<{
    hour: string;
    visitors: number;
    pageViews: number;
    clicks: number;
  }>;
  recentVisitors: Array<{
    sessionId: string;
    ipAddress: string;
    pageCount: number;
    clickCount: number;
    lastVisit: string;
  }>;
}

interface RealtimeStats {
  now: number;
  last5Minutes: number;
  today: number;
  allTime: number;
}

export default function AdminAnalytics() {
  const [jobData, setJobData] = useState<AnalyticsData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [visitorAnalytics, setVisitorAnalytics] = useState<VisitorAnalytics | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const [jobRes, statsRes, visitorRes, realtimeRes] = await Promise.all([
          fetch('/api/admin/analytics/jobs', { headers }),
          fetch('/api/admin/stats', { headers }),
          fetch(`/api/analytics/visitors?timeRange=${timeRange}`, { headers }),
          fetch('/api/analytics/realtime', { headers }),
        ]);

        if (jobRes.ok) {
          const data = await jobRes.json();
          setJobData(data);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (visitorRes.ok) {
          const visitorData = await visitorRes.json();
          setVisitorAnalytics(visitorData);
        }
        if (realtimeRes.ok) {
          const realtimeData = await realtimeRes.json();
          setRealtimeStats(realtimeData);
        }
      } catch (err) {
        setError('Failed to fetch analytics data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up real-time polling every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Monitor job trends and application metrics</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Monitor website visitors and job metrics</p>
        </div>
        <div className="flex gap-2">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {range === '1h' ? '1h' : range === '24h' ? '24h' : range === '7d' ? '7d' : '30d'}
            </button>
          ))}
        </div>
      </div>

      {/* Visitor Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Visitor Tracking</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visitorAnalytics?.summary.totalVisitors || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Active Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{realtimeStats?.now || 0}</div>
              <p className="text-xs text-muted-foreground">{realtimeStats?.last5Minutes || 0} in last 5 min</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visitorAnalytics?.summary.totalPageViews || 0}</div>
              <p className="text-xs text-muted-foreground">{(typeof visitorAnalytics?.summary.avgPageViewsPerVisitor === 'number' && visitorAnalytics.summary.avgPageViewsPerVisitor >= 0) ? visitorAnalytics.summary.avgPageViewsPerVisitor.toFixed(2) : '0'} avg per visitor</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MousePointerClick className="w-4 h-4" />
                Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visitorAnalytics?.summary.totalClicks || 0}</div>
              <p className="text-xs text-muted-foreground">{(typeof visitorAnalytics?.summary.avgClicksPerVisitor === 'number' && visitorAnalytics.summary.avgClicksPerVisitor >= 0) ? visitorAnalytics.summary.avgClicksPerVisitor.toFixed(2) : '0'} avg per visitor</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hourly Activity Chart */}
      {visitorAnalytics?.hourlyData && visitorAnalytics.hourlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hourly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visitorAnalytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="#3b82f6"
                    name="Visitors"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pageViews"
                    stroke="#10b981"
                    name="Page Views"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#f59e0b"
                    name="Clicks"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Pages Table */}
      {visitorAnalytics?.topPages && visitorAnalytics.topPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Page</th>
                    <th className="text-right py-3 px-4 font-semibold">Views</th>
                    <th className="text-right py-3 px-4 font-semibold">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {visitorAnalytics.topPages.slice(0, 10).map((page, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{page.page}</td>
                      <td className="py-3 px-4 text-right font-medium">{page.views}</td>
                      <td className="py-3 px-4 text-right font-medium">{page.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Visitors */}
      {visitorAnalytics?.recentVisitors && visitorAnalytics.recentVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                    <th className="text-right py-3 px-4 font-semibold">Pages</th>
                    <th className="text-right py-3 px-4 font-semibold">Clicks</th>
                    <th className="text-left py-3 px-4 font-semibold">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {visitorAnalytics.recentVisitors.slice(0, 15).map((visitor, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-xs">{visitor.ipAddress}</td>
                      <td className="py-3 px-4 text-right">{visitor.pageCount}</td>
                      <td className="py-3 px-4 text-right">{visitor.clickCount}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(visitor.lastVisit).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Job Metrics</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.activeJobs || 0} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.applicationsToday || 0} today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono">{stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString() : 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Real-time data</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6">
        {/* Job Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Job Activity - Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={jobData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="posted"
                    stroke="#3b82f6"
                    name="Jobs Posted"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs Posted Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="posted" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card>
        <CardHeader>
          <CardTitle>Data Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All analytics data is fetched in real-time from the backend database. Visitor data updates every 10 seconds.
            Time range: <span className="font-mono uppercase">{timeRange}</span> | 
            Last updated: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
