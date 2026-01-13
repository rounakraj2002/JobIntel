import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import {
  Briefcase,
  TrendingUp,
  Bell,
  Settings,
  Bookmark,
  FileText,
  Crown,
  MessageCircle,
  Mail,
  Send,
  Building2,
  MapPin,
  Clock,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Add extra safety check for notificationPreferences
  const notifPrefs = user.notificationPreferences || {
    email: true,
    whatsapp: false,
    telegram: false,
    newJobMatch: true,
    deadlineReminder: true,
    applicationUpdate: true,
    referralUpdate: false,
  };

  // Real-time data: fetch from backend and stay in sync with app store
  const backendBase = (import.meta as any).env?.VITE_API_URL || '';
  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [profileFields, setProfileFields] = useState<any[]>([]);
  const appStore = useApplicationStore();
  const [recentApplications, setRecentApplications] = useState<any[]>(Object.values(appStore.applications || {}));
  // Edit profile modal state (profile only)
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    batch: (user as any).batch || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  // Skills modal state
  const [editSkillsOpen, setEditSkillsOpen] = useState(false);
  const [skillsForm, setSkillsForm] = useState<string[]>(user.skills || []);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'interview':
        return <Badge variant="success">Interview</Badge>;
      case 'in-review':
        return <Badge variant="info">In Review</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'offered':
        return <Badge variant="premium">Offered</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = [
    { label: 'Job Matches', value: matchedJobs.length, icon: Target, color: 'text-primary' },
    { label: 'Applications', value: recentApplications.length, icon: Briefcase, color: 'text-accent' },
    { label: 'Interviews', value: 0, icon: Calendar, color: 'text-success' },
    { label: 'Saved Jobs', value: 0, icon: Bookmark, color: 'text-warning' },
  ];

  // Fetch matched jobs from backend (top matches). Keep lightweight and update periodically.
  useEffect(() => {
    let mounted = true;
    const fetchMatches = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/jobs?status=active` : '/api/jobs?status=active';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const jobs = await res.json();
        if (!mounted) return;
        setMatchedJobs(Array.isArray(jobs) ? jobs.slice(0, 3) : []);
      } catch (e) {
        console.warn('failed to fetch matched jobs', e);
      }
    };
    fetchMatches();
    const iv = setInterval(fetchMatches, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, [backendBase, user]);

  // Fetch user's applications from backend and keep in sync with application store (SSE updates)
  useEffect(() => {
    let mounted = true;
    const fetchApps = async () => {
      if (!user || !user.id) return;
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/applications?userId=${user.id}` : `/api/applications?userId=${user.id}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const apps = await res.json();
        if (!mounted) return;
        setRecentApplications(Array.isArray(apps) ? apps : []);
      } catch (e) {
        console.warn('failed to fetch recent applications', e);
      }
    };
    fetchApps();
    const iv = setInterval(fetchApps, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, [backendBase, user]);

  // Keep in-sync with application store (SSE may update appStore.application map)
  useEffect(() => {
    setRecentApplications(Object.values(appStore.applications || {}));
  }, [appStore.applications]);

  // Load available skills when skills modal opens
  useEffect(() => {
    if (!editSkillsOpen) return;
    let mounted = true;
    const fetchSkills = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/skills` : '/api/skills';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const skills = await res.json();
        if (!mounted) return;
        setAvailableSkills(Array.isArray(skills) ? skills : []);
      } catch (e) {
        console.warn('failed to fetch skills', e);
      }
    };
    fetchSkills();
    return () => { mounted = false; };
  }, [editSkillsOpen, backendBase]);

  // Load profile fields when profile modal opens (or on mount)
  useEffect(() => {
    let mounted = true;
    const fetchFields = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/profile-fields` : '/api/profile-fields';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const fields = await res.json();
        if (!mounted) return;
        setProfileFields(Array.isArray(fields) ? fields : []);
      } catch (e) {
        console.warn('failed to fetch profile fields', e);
      }
    };
    fetchFields();
    return () => { mounted = false; };
  }, [backendBase]);

  // keep profile form and skills form in sync with current user
  useEffect(() => {
    // initialize profile form with admin-defined profile fields if available
    const baseForm: any = {
      name: user.name || '',
      email: user.email || '',
      phone: (user as any).phone || '',
      batch: (user as any).batch || '',
    };
    (profileFields || []).forEach((f: any) => {
      baseForm[f.key] = (user as any)[f.key] ?? '';
    });
    setProfileForm(baseForm);
    setSkillsForm(Array.from(new Set(user.skills || [])));
  }, [user, profileFields]);

  const toggleSkill = (skill: string) => {
    setSkillsForm((prev) => {
      const s = new Set(prev || []);
      if (s.has(skill)) s.delete(skill); else s.add(skill);
      return Array.from(s);
    });
  };

  const addCustomSkill = () => {
    const sk = String(newSkill || '').trim();
    if (!sk) return;
    setNewSkill('');
    setAvailableSkills((prev) => Array.from(new Set([sk, ...prev])));
    setSkillsForm((prev) => Array.from(new Set([sk, ...(prev || [])])));
  };

  const saveProfile = async () => {
    if (!user || !user.id) return;
    setSavingProfile(true);
    try {
      const base = backendBase ? backendBase.replace(/\/$/, '') : '';
      const url = base ? `${base}/api/users/${user.id}` : `/api/users/${user.id}`;
      // send dynamic form values (only include keys present in profileForm)
      const body: any = {};
      Object.keys(profileForm || {}).forEach((k) => { body[k] = profileForm[k]; });
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const updated = await res.json();
        useAuthStore.getState().updateUser({ ...updated });
        setEditProfileOpen(false);
      } else {
        console.warn('failed to save profile', await res.text());
      }
    } catch (e) {
      console.error('saveProfile error', e);
    } finally {
      setSavingProfile(false);
    }
  };

  // React to realtime updates for skills or profile fields
  useEffect(() => {
    const handler = (e: any) => {
      const payload = e?.detail;
      if (!payload) return;
      if (payload.type === 'skills') {
        const url = backendBase ? `${backendBase.replace(/\/$/, '')}/api/skills` : '/api/skills';
        fetch(url).then((r) => r.ok && r.json()).then((s) => setAvailableSkills(Array.isArray(s) ? s : [])).catch(() => {});
      }
      if (payload.type === 'profile_fields') {
        // refetch profile fields and reinitialize form
        const url = backendBase ? `${backendBase.replace(/\/$/, '')}/api/profile-fields` : '/api/profile-fields';
        fetch(url).then((r) => r.ok && r.json()).then((f) => { setProfileFields(Array.isArray(f) ? f : []); }).catch(() => {});
      }
    };
    window.addEventListener('realtime:update', handler as EventListener);
    return () => window.removeEventListener('realtime:update', handler as EventListener);
  }, [backendBase, editSkillsOpen, profileFields]);

  const saveSkills = async () => {
    if (!user || !user.id) return;
    setSavingSkills(true);
    try {
      const base = backendBase ? backendBase.replace(/\/$/, '') : '';
      const url = base ? `${base}/api/users/${user.id}` : `/api/users/${user.id}`;
      const body = { skills: skillsForm };
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const updated = await res.json();
        useAuthStore.getState().updateUser({ ...updated });
        setEditSkillsOpen(false);
      } else {
        console.warn('failed to save skills', await res.text());
      }
    } catch (e) {
      console.error('saveSkills error', e);
    } finally {
      setSavingSkills(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your job search today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user.tier === 'free' && (
              <Link to="/pricing">
                <Button variant="premium">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            )}
            <Badge variant={user.tier === 'premium' ? 'premium' : 'free'} className="py-1.5">
              {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-5 border border-border shadow-soft animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Completion */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Profile Completion</h2>
                <Button variant="ghost" size="sm" onClick={() => setEditProfileOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              <Progress value={user.profileCompletion || 0} className="h-2 mb-3" />
              <p className="text-sm text-muted-foreground">
                Your profile is {user.profileCompletion || 0}% complete. Add more skills to improve job matching.
              </p>
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={profileForm.name} onChange={(e: any) => setProfileForm((p: any) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={profileForm.email} onChange={(e: any) => setProfileForm((p: any) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={profileForm.phone} onChange={(e: any) => setProfileForm((p: any) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Batch</Label>
                    <Input value={profileForm.batch} onChange={(e: any) => setProfileForm((p: any) => ({ ...p, batch: e.target.value }))} />
                  </div>

                  {/* Render admin-defined profile fields */}
                  {(profileFields || []).map((f: any) => (
                    <div key={f.key}>
                      <Label>{f.label}</Label>
                      {f.type === 'select' ? (
                        <select
                          className="w-full p-2 border rounded"
                          value={profileForm[f.key] ?? ''}
                          onChange={(e: any) => setProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        >
                          <option value="">Select…</option>
                          {(f.options || []).map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={profileForm[f.key] ?? ''}
                          onChange={(e: any) => setProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditProfileOpen(false)}>Cancel</Button>
                  <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Skills Dialog */}
            <Dialog open={editSkillsOpen} onOpenChange={setEditSkillsOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Skills</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="mb-2">Select skills (tags)</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(skillsForm || []).map((sk) => (
                        <Badge key={sk} variant="secondary" onClick={() => toggleSkill(sk)}>{sk}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center mb-3">
                      <Input placeholder="Add custom skill" value={newSkill} onChange={(e:any) => setNewSkill(e.target.value)} />
                      <Button size="sm" onClick={addCustomSkill}>Add</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                      {availableSkills.map((sk) => (
                        <label key={sk} className="flex items-center gap-2">
                          <Checkbox checked={(skillsForm || []).includes(sk)} onCheckedChange={() => toggleSkill(sk)} />
                          <span className="text-sm">{sk}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditSkillsOpen(false)}>Cancel</Button>
                  <Button onClick={saveSkills} disabled={savingSkills}>{savingSkills ? 'Saving...' : 'Save Skills'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Top Job Matches */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Top Job Matches
                </h2>
                <Link to="/jobs">
                  <Button variant="ghost" size="sm">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {matchedJobs.slice(0, 3).map((job, index) => (
                  <div
                    key={job.id || job._id || `match-${index}`}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link to={`/jobs/${job.id || job._id}`}> 
                            <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
                              {job.title || job.name || 'Untitled Job'}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground">{job.company?.name || job.meta?.company || 'Company'}</p>
                        </div>
                        <Badge variant="success" className="flex-shrink-0">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {job.matchScore}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(job.postedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <a href={job.applyLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="accent" size="sm">
                        Apply
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Applications
                </h2>
                <Link to="/applications">
                  <Button variant="ghost" size="sm">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {recentApplications.map((app, index) => (
                  <div
                    key={app._id || app.id || `app-${index}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-1">{app.job?.title || 'Untitled Job'}</h3>
                      <p className="text-sm text-muted-foreground">{app.job?.company?.name || 'Company'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(app.status)}
                      {app.autoApplied && (
                        <Badge variant="secondary" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Auto
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notification Preferences */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                  </div>
                  <Switch
                    id="whatsapp"
                    checked={notifPrefs.whatsapp}
                    disabled={user.tier === 'free'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <Switch
                    id="email"
                    checked={notifPrefs.email}
                    disabled={user.tier === 'free'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Send className="h-4 w-4 text-sky-600" />
                    </div>
                    <Label htmlFor="telegram">Telegram</Label>
                  </div>
                  <Switch
                    id="telegram"
                    checked={notifPrefs.telegram}
                    disabled={user.tier === 'free'}
                  />
                </div>
                {user.tier === 'free' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Upgrade to Premium to enable notifications.
                  </p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-semibold mb-4">Your Skills</h2>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => setEditSkillsOpen(true)}>
                + Add More Skills
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link to="/jobs">
                  <Button variant="outline" className="w-full justify-start">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Browse Jobs
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Resume
                </Button>
                <Link to="/settings">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>

            {/* Upgrade CTA */}
            {user.tier !== 'ultra' && (
              <div className="gradient-hero rounded-xl p-6 text-white">
                <h3 className="font-semibold mb-2">
                  {user.tier === 'free' ? 'Unlock Premium Features' : 'Go Ultra Premium'}
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  {user.tier === 'free'
                    ? 'Get AI matching, instant notifications, and early job access.'
                    : 'Enable auto-apply, AI cover letters, and priority support.'}
                </p>
                <Link to="/pricing">
                  <Button variant="heroOutline" className="w-full">
                    Upgrade Now
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
