import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Building2,
  Clock,
  TrendingUp,
  Filter,
  X,
  Briefcase,
  DollarSign,
  Users,
  ChevronRight,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { mockJobs } from '@/data/mockData';
import { Job, JobType, ExperienceLevel } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useJobsStore } from '@/store/jobsStore';
import { useApplicationStore } from '@/store/applicationStore';

const JobsPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { publishedJobs } = useJobsStore();
  
  const [backendJobs, setBackendJobs] = useState<any[]>([]);
  // use application store for realtime updates
  const appStore = useApplicationStore();
  const userApplications = appStore.applications;
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilters, setTypeFilters] = useState<JobType[]>([]);
  const [experienceFilters, setExperienceFilters] = useState<ExperienceLevel[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'salary'>('relevance');
  const [showFilters, setShowFilters] = useState(false);

  // Backend base URL (set VITE_API_URL environment variable during build)
  const backendBase = import.meta.env.VITE_API_URL || '';

  // Fetch jobs from backend (extracted so we can call it on demand)
  const [backendError, setBackendError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    setBackendError(null);
    try {
      const base = backendBase ? backendBase.replace(/\/$/, '') : '';
      const url = base ? `${base}/api/jobs?status=active` : '/api/jobs?status=active';
      console.log('[JobsPage] Fetching jobs from:', url, '(backendBase:', backendBase, ')');
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        try {
          const jobs = await response.json();
          setBackendJobs(jobs);
          console.debug('fetchJobs: retrieved', Array.isArray(jobs) ? jobs.length : 0, 'jobs from backend');
        } catch (jsonErr) {
          console.warn('Backend returned invalid JSON, using local store only');
          setBackendJobs([]);
          setBackendError('Invalid JSON from backend');
        }
      } else {
        console.warn(`Backend returned status ${response.status}, using local store only`);
        setBackendJobs([]);
        setBackendError(`Status ${response.status}`);
      }
    } catch (err: any) {
      console.warn('Backend not available, using local store only:', err);
      setBackendJobs([]);
      setBackendError(err?.message || String(err));
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchUserApplications = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const base = backendBase ? backendBase.replace(/\/$/, '') : '';
      const url = base ? `${base}/api/applications?userId=${user.id}` : `/api/applications?userId=${user.id}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const apps = await res.json();
      const map: Record<string, any> = {};
      apps.forEach((a: any) => { if (a.jobId) map[String(a.jobId)] = a; });
      appStore.setApplications(map);
    } catch (e) {
      console.warn('failed to fetch user applications', e);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchUserApplications();
  }, [isAuthenticated, user]);

  // Poll backend periodically to get near real-time updates
  useEffect(() => {
    const iv = setInterval(() => {
      fetchJobs();
    }, 10000); // every 10s
    return () => clearInterval(iv);
  }, []);

  // Combine mock jobs with published jobs (local store and backend)
  const allJobs = useMemo(() => {
    const parseSalaryString = (s?: string) => {
      if (!s) return undefined;
      try {
        const raw = String(s);
        const cleaned = raw.replace(/,/g, '').replace(/₹|Rs\.?/gi, '').trim().toLowerCase();
        const numM = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (!numM) return undefined;
        const n = parseFloat(numM[1]);
        // if lpa/lakh present
        if (/lpa|lakh|lac|lacs|per annum|per year/i.test(raw)) {
          const val = Math.round(n * 100000);
          return { min: val, max: val, currency: 'INR', period: 'yearly' as const };
        }
        // monthly
        if (/per month|monthly|pm/i.test(raw)) {
          const val = Math.round(n * 1000);
          return { min: val, max: val, currency: 'INR', period: 'monthly' as const };
        }
        // hourly
        if (/per hour|hourly|hr/i.test(raw)) {
          return { min: n, max: n, currency: 'INR', period: 'hourly' as const };
        }
        // if number looks small (<1000) treat as LPA
        if (n < 1000) {
          const val = Math.round(n * 100000);
          return { min: val, max: val, currency: 'INR', period: 'yearly' as const };
        }
        // fallback: treat as raw rupee amount
        return { min: Math.round(n), max: Math.round(n), currency: 'INR', period: 'yearly' as const };
      } catch (e) {
        return undefined;
      }
    };
    const convertedPublished = publishedJobs
      .filter(pj => pj.status === 'active')
      .map((pj) => ({
        id: pj.id,
        title: pj.title,
        company: {
          name: pj.company,
          logo: undefined,
          description: '',
          website: '',
          industry: 'Technology',
        },
        location: pj.location,
        isRemote: pj.isRemote,
        type: 'full-time' as JobType,
        experienceLevel: 'fresher' as ExperienceLevel,
        experienceRange: { min: 0, max: 3 },
        salary: pj.salary ? { min: 0, max: 100000, currency: 'INR' } : undefined,
        description: pj.description,
        requirements: [],
        skills: pj.techStack,
        batch: pj.batch,
        applyLink: (pj as any).applyLink || (pj as any).applyUrl || '#',
        postedAt: pj.createdAt,
      })) as Job[];

    const convertedBackendJobs = backendJobs.map((bj) => ({
      id: bj._id,
      title: bj.title,
      company: {
        name: bj.meta?.company || (bj.company && bj.company.name) || 'Company',
        logo: undefined,
        description: '',
        website: '',
        industry: 'Technology',
      },
      location: bj.meta?.location || bj.location || 'Remote',
      isRemote: bj.meta?.isRemote ?? false,
      type: 'full-time' as JobType,
      experienceLevel: 'fresher' as ExperienceLevel,
      experienceRange: { min: 0, max: 3 },
      salary: bj.meta?.salary ? parseSalaryString(bj.meta.salary) : undefined,
      description: bj.description,
      requirements: [],
      skills: bj.meta?.techStack || [],
      batch: bj.meta?.batch,
      applyLink: bj.meta?.applyLink || bj.applyUrl || '#',
      postedAt: bj.createdAt,
    })) as Job[];

    const result = [...mockJobs, ...convertedPublished, ...convertedBackendJobs];
    console.debug('allJobs: mock=', mockJobs.length, 'published=', convertedPublished.length, 'backend=', convertedBackendJobs.length, 'total=', result.length);
    return result;
  }, [publishedJobs, backendJobs]);

  const jobTypes: { value: JobType; label: string }[] = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' },
  ];

  const experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'fresher', label: 'Fresher (0-1 yrs)' },
    { value: 'junior', label: 'Junior (1-3 yrs)' },
    { value: 'mid', label: 'Mid-level (3-5 yrs)' },
    { value: 'senior', label: 'Senior (5-8 yrs)' },
    { value: 'lead', label: 'Lead (8+ yrs)' },
  ];

  const filteredJobs = useMemo(() => {
    let jobs = [...allJobs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.name.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    }

    // Location filter
    if (locationFilter) {
      jobs = jobs.filter((job) =>
        job.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Type filter
    if (typeFilters.length > 0) {
      jobs = jobs.filter((job) => typeFilters.includes(job.type));
    }

    // Experience filter
    if (experienceFilters.length > 0) {
      jobs = jobs.filter((job) => experienceFilters.includes(job.experienceLevel));
    }

    // Remote filter
    if (remoteOnly) {
      jobs = jobs.filter((job) => job.isRemote);
    }

    // Sort
    if (sortBy === 'date') {
      jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } else if (sortBy === 'salary') {
      jobs.sort((a, b) => (b.salary?.max || 0) - (a.salary?.max || 0));
    } else if (sortBy === 'relevance' && user) {
      jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    console.debug('filteredJobs: all=', allJobs.length, 'result=', jobs.length);
    return jobs;
  }, [searchQuery, locationFilter, typeFilters, experienceFilters, remoteOnly, sortBy, user, allJobs]);

  const toggleTypeFilter = (type: JobType) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleExperienceFilter = (level: ExperienceLevel) => {
    setExperienceFilters((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setTypeFilters([]);
    setExperienceFilters([]);
    setRemoteOnly(false);
    // Re-fetch jobs from backend when clearing filters to ensure live data shows up
    fetchJobs();
  };

  const hasActiveFilters =
    searchQuery || locationFilter || typeFilters.length > 0 || experienceFilters.length > 0 || remoteOnly;

  const formatSalary = (job: Job) => {
    if (!job.salary) return null;
    const { min, max, currency, period } = job.salary;
    const formatNum = (n: number) => {
      if (currency === 'INR') {
        if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
        return `${(n / 1000).toFixed(0)}K`;
      }
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    };
    return `${currency === 'INR' ? '₹' : '$'}${formatNum(min)} - ${formatNum(max)}/${period === 'yearly' ? 'yr' : period === 'monthly' ? 'mo' : 'hr'}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="bg-card border-b border-border sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs">
                    {typeFilters.length + experienceFilters.length + (remoteOnly ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg animate-slide-down">
              <div className="flex flex-wrap gap-6">
                {/* Job Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Job Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {jobTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant={typeFilters.includes(type.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleTypeFilter(type.value)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Experience</Label>
                  <div className="flex flex-wrap gap-2">
                    {experienceLevels.map((level) => (
                      <Button
                        key={level.value}
                        variant={experienceFilters.includes(level.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleExperienceFilter(level.value)}
                      >
                        {level.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Remote */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remote"
                    checked={remoteOnly}
                    onCheckedChange={(checked) => setRemoteOnly(checked as boolean)}
                  />
                  <Label htmlFor="remote" className="text-sm">Remote only</Label>
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backend status */}
      {backendError && (
        <div className="container mx-auto px-4 py-2">
          <p className="text-sm text-destructive">Backend not reachable: {backendError}. Showing local jobs only. <button onClick={() => fetchJobs()} className="underline">Retry</button></p>
        </div>
      )}

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{filteredJobs.length}</span> jobs found
          </p>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Job Cards */}
        <div className="space-y-4">
          {filteredJobs.map((job, index) => (
            <div
              key={job.id}
              className="bg-card rounded-xl border border-border p-6 shadow-soft job-card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Company Logo */}
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  </div>
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <Link to={`/jobs/${job.id}`}>
                      <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                    </Link>
                    {job.isHot && <Badge variant="hot">🔥 Hot</Badge>}
                    {job.matchScore && job.matchScore > 85 && (
                      <Badge variant="success">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {job.matchScore}% Match
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {job.company.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                    {job.salary && (
                      <span className="flex items-center gap-1 text-foreground font-medium">
                        <DollarSign className="h-4 w-4" />
                        {formatSalary(job)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {job.experienceRange.min}-{job.experienceRange.max} yrs
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="fullTime" className="capitalize">{job.type.replace('-', ' ')}</Badge>
                    {job.isRemote && <Badge variant="remote">Remote</Badge>}
                    {job.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                    {job.skills.length > 4 && (
                      <Badge variant="outline">+{job.skills.length - 4} more</Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(job.postedAt).toLocaleDateString()}
                      </span>
                      {job.applicantsCount && (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.applicantsCount} applicants
                        </span>
                      )}
                      {job.deadline && (
                        <span className="flex items-center gap-1 text-warning-foreground">
                          <Clock className="h-4 w-4" />
                          Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isAuthenticated && (
                        <Button variant="ghost" size="iconSm">
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      )}
                      <Link to={`/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                      {!userApplications[job.id] ? (
                        <>
                          <a href={job.applyLink} target="_blank" rel="noopener noreferrer">
                            <Button variant="accent" size="sm">
                              Apply Now
                              <ExternalLink className="h-4 w-4 ml-1" />
                            </Button>
                          </a>
                          {isAuthenticated && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const base = backendBase ? backendBase.replace(/\/$/, '') : '';
                                  const url = base ? `${base}/api/applications` : '/api/applications';
                                  const body = { userId: user.id, jobId: job.id, appliedAt: new Date().toISOString() };
                                  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                                  if (res.ok) {
                                    const a = await res.json();
                                    appStore.addOrUpdateApplication(a);
                                  }
                                } catch (e) { console.warn(e); }
                              }}
                            >
                              Applied
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" disabled>
                            Applied
                          </Button>
                          <Button variant="link" size="sm" onClick={async () => {
                            try {
                              const app = userApplications[job.id];
                              if (!app || !app._id) return;
                              const base = backendBase ? backendBase.replace(/\/$/, '') : '';
                              const url = base ? `${base}/api/applications/${app._id}` : `/api/applications/${app._id}`;
                              const res = await fetch(url, { method: 'DELETE' });
                              if (res.ok) {
                                appStore.removeApplicationByJobId(String(job.id));
                              }
                            } catch (e) { console.warn(e); }
                          }}>Remove</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <Button onClick={clearFilters}>Clear all filters</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;
