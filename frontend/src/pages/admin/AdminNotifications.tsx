import { useState } from 'react';
import {
  Plus,
  Send,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Users,
  Crown,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Edit className="h-4 w-4" />,
  scheduled: <Clock className="h-4 w-4" />,
  sent: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const audienceIcons: Record<string, React.ReactNode> = {
  all: <Users className="h-4 w-4" />,
  free: <Users className="h-4 w-4" />,
  premium: <Crown className="h-4 w-4" />,
  ultra: <Zap className="h-4 w-4" />,
};

export default function AdminNotifications() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    channels: {
      email: true,
      whatsapp: false,
      telegram: false,
    },
    targetAudience: 'all',
  });

  const [stats, setStats] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const [sres, nres] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/notifications', { headers }),
        ]);

        if (sres.ok) setStats(await sres.json());
        if (nres.ok) setNotifications(await nres.json());
      } catch (err) {
        console.error('Failed to load notifications data', err);
        toast({ title: 'Failed to load notifications', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [toast]);

  const handleSubmit = async () => {
    // enqueue notifications for selected channels
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const channels = Object.entries(formData.channels).filter(([_, v]) => v).map(([k]) => k);

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({ title: 'Title and message required', variant: 'destructive' });
      return;
    }

    try {
      for (const ch of channels) {
        const resp = await fetch('/api/notifications/send', {
          method: 'POST',
          headers,
          body: JSON.stringify({ channel: ch, title: formData.title, message: formData.message, targetAudience: formData.targetAudience }),
        });
        if (!resp.ok) throw new Error(await resp.text());
      }

      toast({ title: 'Notification enqueued' });
      // refresh stats and notifications
      const [sres, nres] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/notifications', { headers }),
      ]);
      if (sres.ok) setStats(await sres.json());
      if (nres.ok) setNotifications(await nres.json());

      setIsCreateOpen(false);
      setFormData({ title: '', message: '', channels: { email: true, whatsapp: false, telegram: false }, targetAudience: 'all' });
    } catch (err: any) {
      console.error('Send failed', err);
      toast({ title: 'Send failed', description: String(err), variant: 'destructive' });
    }
  };

  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    whatsapp: <MessageCircle className="h-4 w-4 text-green-600" />,
    telegram: <Send className="h-4 w-4 text-blue-500" />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Broadcast</h1>
          <p className="text-muted-foreground">Send notifications to users via Email, WhatsApp & Telegram</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Notification</DialogTitle>
              <DialogDescription>
                Compose and send a notification to your users across multiple channels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Notification title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Your notification message..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Channels</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.channels.email}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          channels: { ...formData.channels, email: !!checked },
                        })
                      }
                    />
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.channels.whatsapp}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          channels: { ...formData.channels, whatsapp: !!checked },
                        })
                      }
                    />
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.channels.telegram}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          channels: { ...formData.channels, telegram: !!checked },
                        })
                      }
                    />
                    <Send className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Telegram</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        All Users
                      </span>
                    </SelectItem>
                    <SelectItem value="free">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Free Users Only
                      </span>
                    </SelectItem>
                    <SelectItem value="premium">
                      <span className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Premium Users
                      </span>
                    </SelectItem>
                    <SelectItem value="ultra">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Ultra Users
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Save as Draft
              </Button>
              <Button variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button onClick={handleSubmit}>
                <Send className="mr-2 h-4 w-4" />
                Send Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Sent</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">{stats?.notificationsSent?.toLocaleString() ?? '—'}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Email Delivery</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">{stats?.emailDelivery != null ? `${stats.emailDelivery}%` : '—'}</div>
            <p className="text-sm text-green-600">{stats?.emailDelivery != null ? `${stats.emailDelivery}% delivered` : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">WhatsApp Delivery</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">{stats?.whatsappDelivery != null ? `${stats.whatsappDelivery}%` : '—'}</div>
            <p className="text-sm text-green-600">{stats?.whatsappDelivery != null ? `${stats.whatsappDelivery}% delivered` : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Scheduled</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">{stats?.scheduledCount ?? 0}</div>
            <p className="text-sm text-muted-foreground">Upcoming notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent notifications</div>
            ) : (
              notifications.map((notification) => {
                // notification payload shape may vary; normalize
                const title = notification.payload?.title || notification.title || 'Notification';
                const message = notification.payload?.message || notification.payload?.body || notification.message || '';
                const ch = notification.channel ? [notification.channel] : (notification.channels || []);
                const status = notification.status || 'sent';

                return (
                  <div
                    key={notification._id || notification.id}
                    className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <Badge
                          variant="outline"
                          className={cn('capitalize', statusColors[status])}
                        >
                          <span className="mr-1">{statusIcons[status]}</span>
                          {status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{message}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="capitalize text-muted-foreground">{notification.targetAudience || 'all'} users</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {ch.map((channel: string) => (
                            <span key={channel} className="text-muted-foreground">
                              {channelIcons[channel] || channel}
                            </span>
                          ))}
                        </div>
                        {notification.recipientCount && (
                          <span className="text-muted-foreground">
                            {notification.recipientCount.toLocaleString()} recipients
                          </span>
                        )}
                        {notification.sentAt && (
                          <span className="text-muted-foreground">Sent: {new Date(notification.sentAt).toLocaleDateString()}</span>
                        )}
                        {notification.createdAt && (
                          <span className="text-muted-foreground">Created: {new Date(notification.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {status === 'draft' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button size="sm">
                            <Send className="mr-2 h-4 w-4" />
                            Send
                          </Button>
                        </>
                      )}
                      {status === 'scheduled' && (
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
