import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  MapPin,
  Building2,
  Clock,
  TrendingUp,
  Briefcase,
  DollarSign,
  Users,
  ExternalLink,
  Bookmark,
  Share2,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Globe,
  GraduationCap,
  Star,
  MessageCircle,
  Mail,
  Send,
} from 'lucide-react';
import { mockJobs } from '@/data/mockData';
import { useAuthStore } from '@/store/authStore';
import { useJobsStore } from '@/store/jobsStore';
import { useToast } from '@/hooks/use-toast';
import { useApplicationStore } from '@/store/applicationStore';
import AuthRequiredModal from '@/components/AuthRequiredModal';

const JobDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const { publishedJobs } = useJobsStore();
  const { trackClick } = useAnalytics();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Try to find job from published jobs first, then from mock data, otherwise fetch from backend
  const publishedJob = publishedJobs.find((j) => j.id === id);
  const mockJob = mockJobs.find((j) => j.id === id);
  const [fetchedJob, setFetchedJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const rawJob = publishedJob || mockJob || fetchedJob;

  useEffect(() => {
    // If the job is not present locally, try fetching it from the backend
    if (!publishedJob && !mockJob && id) {
      setLoading(true);
      setFetchedJob(null);
      const base = (import.meta as any).env?.VITE_API_URL || '';
      const url = base ? `${base.replace(/\/$/, '')}/api/jobs/${id}` : `/api/jobs/${id}`;
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch job: ${r.status}`);
          return r.json();
        })
        .then((data) => setFetchedJob(data))
        .catch((err) => console.warn('Job fetch failed', err))
        .finally(() => setLoading(false));
    }
  }, [id, publishedJob, mockJob]);

  // Local state for job details (may come from backend if not in store)
  const [jobData, setJobData] = useState<any | null>(null);

  useEffect(() => {
    if (rawJob) {
      setJobData({
        ...rawJob,
        type: rawJob.type || 'full-time',
        company: {
          name: rawJob.company?.name || rawJob.company || 'Unknown Company',
          website: rawJob.company?.website,
          description: rawJob.company?.description || 'No description available',
          industry: rawJob.company?.industry || 'Technology',
          logo: rawJob.company?.logo,
        },
        experienceLevel: rawJob.experienceLevel || 'intermediate',
        experienceRange: rawJob.experienceRange || { min: 0, max: 5 },
        isRemote: rawJob.isRemote || false,
        salary: rawJob.salary || { min: 0, max: 0, currency: 'INR', period: 'yearly' },
        description: rawJob.description || rawJob.rawText || 'No description available',
        location: rawJob.location || 'Not specified',
        applicantsCount: rawJob.applicantsCount || 0,
      });
      return;
    }

    // If not found locally, fetch from backend by ID
    const parseSalaryString = (s?: string) => {
      if (!s) return undefined;
      try {
        const raw = String(s);
        const cleaned = raw.replace(/,/g, '').replace(/₹|Rs\.?/gi, '').trim().toLowerCase();
        const numM = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (!numM) return undefined;
        const n = parseFloat(numM[1]);
        if (/lpa|lakh|lac|lacs|per annum|per year/i.test(raw)) {
          const val = Math.round(n * 100000);
          return { min: val, max: val, currency: 'INR', period: 'yearly' as const };
        }
        if (/per month|monthly|pm/i.test(raw)) {
          const val = Math.round(n * 1000);
          return { min: val, max: val, currency: 'INR', period: 'monthly' as const };
        }
        if (/per hour|hourly|hr/i.test(raw)) {
          return { min: n, max: n, currency: 'INR', period: 'hourly' as const };
        }
        if (n < 1000) {
          const val = Math.round(n * 100000);
          return { min: val, max: val, currency: 'INR', period: 'yearly' as const };
        }
        return { min: Math.round(n), max: Math.round(n), currency: 'INR', period: 'yearly' as const };
      } catch (e) {
        return undefined;
      }
    };

    const fetchJob = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.ok) {
          const bj = await res.json();
          setJobData({
            id: bj._id,
            title: bj.title,
            company: {
              name: bj.meta?.company || 'Company',
              logo: undefined,
              description: bj.meta?.companyDescription || '',
              website: bj.meta?.companyUrl || '',
              industry: 'Technology',
            },
            location: bj.meta?.location || bj.location || 'Remote',
            isRemote: bj.meta?.isRemote ?? false,
            type: 'full-time',
            experienceLevel: 'fresher',
            experienceRange: { min: 0, max: 3 },
            salary: bj.meta?.salary ? parseSalaryString(bj.meta.salary) : undefined,
            description: bj.description || bj.rawHtml || 'No description available',
            requirements: [],
            skills: bj.meta?.techStack || [],
            batch: bj.meta?.batch,
            applyLink: bj.meta?.applyLink || bj.applyUrl || '#',
            // keep applied state fetched from backend separately in JobsPage; JobDetail can also expose apply action later
            postedAt: bj.createdAt,
            applicantsCount: bj.applicantsCount || 0,
            deadline: bj.deadline || undefined,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch job details from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, publishedJob, mockJob]);

  const appStore = useApplicationStore();
  const applied = appStore.applications[String(id)];

  const handleAppliedToggle = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const base = (import.meta as any).env?.VITE_API_URL || '';
      const applyUrl = base ? `${base.replace(/\/$/, '')}/api/applications` : '/api/applications';
      if (!applied) {
        const res = await fetch(applyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, jobId: id, appliedAt: new Date().toISOString() }) });
        if (res.ok) {
          const a = await res.json();
          appStore.addOrUpdateApplication(a);
        }
      } else {
        const appId = applied._id || applied.id;
        const delUrl = base ? `${base.replace(/\/$/, '')}/api/applications/${appId}` : `/api/applications/${appId}`;
        const res = await fetch(delUrl, { method: 'DELETE' });
        if (res.ok) appStore.removeApplicationByJobId(id as string);
      }
    } catch (e) { console.warn(e); }
  };

  const job = jobData;

  if (!job) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Clock className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Loading job details...</h1>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <Link to="/jobs">
            <Button>Browse All Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatSalary = () => {
    if (!job || !job.salary) return 'Not disclosed';
    const { min, max, currency, period } = job.salary;
    const formatNum = (n: number) => {
      if (currency === 'INR') {
        if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
        if (n >= 100000) return `${(n / 100000).toFixed(1)} LPA`;
        return `${(n / 1000).toFixed(0)}K`;
      }
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    };
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${formatNum(min)} - ${symbol}${formatNum(max)} ${period === 'yearly' ? 'per year' : period === 'monthly' ? 'per month' : 'per hour'}`;
  };

  const handleBookmark = () => {
    toast({
      title: 'Job Saved',
      description: 'This job has been added to your bookmarks.',
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link Copied',
      description: 'Job link copied to clipboard.',
    });
  };

  const handleNotify = () => {
    toast({
      title: 'Notifications Enabled',
      description: 'You\'ll be notified of similar jobs via your preferred channels.',
    });
  };

  return (
    <>
      <Seo
        title={`${job.title} — ${job.company.name}`}
        description={job.description?.slice(0, 160)}
        url={`${window.location.origin}/jobs/${job.id}`}
        jsonLd={{
          "@context": "https://schema.org/",
          "@type": "JobPosting",
          title: job.title,
          description: job.description,
          datePosted: job.postedAt,
          hiringOrganization: { name: job.company.name, sameAs: job.company.website || undefined },
          employmentType: job.type,
          jobLocation: { address: job.location },
          validThrough: job.deadline || undefined,
        }}
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <Link to="/jobs" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Jobs
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>

            {/* Job Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-bold">{job.title}</h1>
                {job.isHot && <Badge variant="hot">🔥 Hot</Badge>}
                {job.matchScore && job.matchScore > 85 && (
                  <Badge variant="success" className="text-sm">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {job.matchScore}% Match
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <Building2 className="h-4 w-4" />
                  {job.company.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Posted {new Date(job.postedAt).toLocaleDateString()}
                </span>
                {job.applicantsCount && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {job.applicantsCount} applicants
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="fullTime" className="capitalize">{(job.type || 'full-time').replace('-', ' ')}</Badge>
                {job.isRemote && <Badge variant="remote">Remote</Badge>}
                <Badge variant="outline">{job.experienceLevel || 'intermediate'}</Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleBookmark}>
                  <Bookmark className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
              {isAuthenticated ? (
                <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="w-full lg:w-auto" onClick={() => trackClick('apply_job_detail', { jobId: job.id, jobTitle: job.title })}>
                  <Button variant="accent" size="lg" className="w-full">
                    Apply Now
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              ) : (
                <Button 
                  variant="accent" 
                  size="lg" 
                  className="w-full"
                  onClick={() => {
                    trackClick('apply_job_detail_unauthenticated', { jobId: job.id, jobTitle: job.title });
                    setAuthModalOpen(true);
                  }}
                >
                  Apply Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}
              {isAuthenticated && (
                <div className="mt-2">
                  <Button variant={applied ? 'outline' : 'secondary'} onClick={handleAppliedToggle}>
                    {applied ? 'Applied' : 'Applied'}
                  </Button>
                </div>
              )}
              {job.deadline && (
                <p className="text-sm text-muted-foreground">
                  Deadline: <span className="font-medium text-warning-foreground">{new Date(job.deadline).toLocaleDateString()}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Salary</span>
                </div>
                <p className="font-semibold">{formatSalary()}</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm">Experience</span>
                </div>
                <p className="font-semibold">{job.experienceRange.min}-{job.experienceRange.max} years</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Work Type</span>
                </div>
                <p className="font-semibold capitalize">{job.isRemote ? 'Remote' : 'On-site'}</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Job Type</span>
                </div>
                <p className="font-semibold capitalize">{(job.type || 'full-time').replace('-', ' ')}</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Job Description</h2>
              <p className="text-muted-foreground leading-relaxed">{job.description}</p>
            </div>

            {/* Requirements */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Requirements</h2>
              <ul className="space-y-3">
                {job.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm py-1.5 px-3">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Eligibility */}
            {(job.eligibility || job.batch) && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold mb-4">Eligibility</h2>
                <div className="space-y-3">
                  {job.eligibility && (
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{job.eligibility}</span>
                    </div>
                  )}
                  {job.batch && job.batch.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        Eligible Batches: {job.batch.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-semibold mb-4">About {job.company.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{job.company.name}</p>
                    <p className="text-sm text-muted-foreground">{job.company.industry}</p>
                  </div>
                </div>
                {job.company.description && (
                  <p className="text-sm text-muted-foreground">{job.company.description}</p>
                )}
                {job.company.size && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Company size:</span>{' '}
                    <span className="font-medium">{job.company.size} employees</span>
                  </p>
                )}
                {job.company.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Get Notified */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border border-primary/20">
              <h3 className="font-semibold mb-2">Get Notified</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Receive instant alerts for similar jobs via your preferred channels.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="gap-1">
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Send className="h-3 w-3" />
                  Telegram
                </Badge>
              </div>
              {isAuthenticated ? (
                <Button className="w-full" onClick={handleNotify}>
                  Enable Notifications
                </Button>
              ) : (
                <Link to="/register">
                  <Button className="w-full">Sign Up for Alerts</Button>
                </Link>
              )}
            </div>

            {/* Premium Upsell */}
            {(!user || user.tier === 'free') && (
              <div className="gradient-hero rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5" />
                  <h3 className="font-semibold">Upgrade to Premium</h3>
                </div>
                <p className="text-sm text-white/80 mb-4">
                  Get early access to jobs, personalized matching, and priority notifications.
                </p>
                <Link to="/pricing">
                  <Button variant="heroOutline" className="w-full">
                    View Plans
                  </Button>
                </Link>
              </div>
            )}

            {/* Similar Jobs */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-semibold mb-4">Similar Jobs</h3>
              <div className="space-y-4">
                {mockJobs
                  .filter((j) => j.id !== job.id)
                  .slice(0, 3)
                  .map((similarJob) => (
                    <Link
                      key={similarJob.id}
                      to={`/jobs/${similarJob.id}`}
                      className="block p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm line-clamp-1">{similarJob.title}</p>
                      <p className="text-sm text-muted-foreground">{similarJob.company.name}</p>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthRequiredModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        jobTitle={job?.title}
        redirectPath={`/jobs/${id}`}
      />
    </div>
    </>
  );
};

export default JobDetailPage;
