import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Filter, LayoutGrid, Table } from "lucide-react";
import { Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { db, Candidate, Job } from "@/lib/db";
import { stripTrailingNumber } from '@/lib/utils';
// small utilities for generating skills/locations when missing
const TECHS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Python', 'Django', 'Flask',
  'Java', 'Spring', 'Go', 'Rust', 'C++', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Postgres', 'MySQL',
  'GraphQL', 'REST', 'Redis', 'HTML', 'CSS', 'Sass', 'Tailwind', 'Figma', 'Sketch'
];

const LOCATIONS = ['Remote', 'New York', 'San Francisco', 'London', 'Berlin', 'Austin', 'Boston', 'Seattle'];

function getSkillsForJobTitle(title?: string) {
  if (!title) return sampleTechs(4);
  const t = title.toLowerCase();
  if (t.includes('frontend') || t.includes('ui') || t.includes('react')) return ['JavaScript', 'React', 'TypeScript', 'CSS'];
  if (t.includes('backend') || t.includes('node') || t.includes('express')) return ['Node.js', 'Express', 'Postgres', 'Docker'];
  if (t.includes('full stack') || t.includes('full-stack')) return ['JavaScript', 'Node.js', 'React', 'Postgres'];
  if (t.includes('devops') || t.includes('site reliability') || t.includes('sre')) return ['Docker', 'Kubernetes', 'Terraform', 'AWS'];
  if (t.includes('data') || t.includes('scientist') || t.includes('analyst')) return ['Python', 'Pandas', 'SQL', 'TensorFlow'];
  if (t.includes('product') || t.includes('manager')) return ['Roadmapping', 'Prioritization', 'A/B Testing', 'User Research'];
  if (t.includes('designer') || t.includes('ux') || t.includes('ui')) return ['Figma', 'Sketch', 'Prototyping', 'User Research'];
  if (t.includes('mobile')) return ['Kotlin', 'Swift', 'React Native', 'Flutter'];
  // fallback
  return sampleTechs(4);
}

function sampleTechs(n: number) {
  const out: string[] = [];
  const pool = [...TECHS];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { CandidateKanban } from "@/components/CandidateKanban";

const Candidates = () => {
  const [searchQuery, setSearchQuery] = useState("");
  // Initialize viewMode and stageFilter from sessionStorage/history/location so
  // returning via Back restores the correct view immediately (no flash).
  const readInitialCandidatesState = () => {
    try {
      // 1) try location.state
      const locState = (typeof window !== 'undefined' && (window.history.state as unknown as { viewMode?: string; stage?: string })) || null;
      if (locState && typeof locState.viewMode === 'string') {
        return { viewMode: locState.viewMode as 'list' | 'kanban' | 'grid', stage: (locState.stage as Candidate['stage']) ?? 'all' };
      }

      // 2) try sessionStorage fallback
      const raw = sessionStorage.getItem('candidates:viewState');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.viewMode === 'string') {
          return { viewMode: parsed.viewMode as 'list' | 'kanban' | 'grid', stage: parsed.stage as Candidate['stage'] | 'all' };
        }
      }
    } catch (e) {
      // ignore
    }

    // 3) fallback to URL query param stage or defaults
    const params = new URLSearchParams(window.location.search);
    const s = params.get('stage') as Candidate['stage'] | null;
    return { viewMode: 'list' as const, stage: s || 'all' };
  };

  const initialCandidatesState = readInitialCandidatesState();
  const [stageFilter, setStageFilter] = useState<Candidate['stage'] | 'all'>((initialCandidatesState.stage as Candidate['stage'] | 'all') ?? 'all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'grid'>(initialCandidatesState.viewMode ?? 'list');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFilter, setJobFilter] = useState<string | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState<Candidate['stage'] | ''>('');
  const [focusedStage, setFocusedStage] = useState<Candidate['stage'] | 'all' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  type NavState = { scrollIndex?: number; from?: string; viewMode?: string } | null;

  const fetchCandidates = useCallback(async () => {
    try {
      // When in Kanban view we want to load all candidates (so each column
      // shows its items). If we send a stage filter to the API while in
      // kanban, only that stage's candidates will be returned and the board
      // will look filtered even though the user didn't click a filter.
      const apiStage = viewMode === 'kanban' ? 'all' : stageFilter;
      const params = new URLSearchParams({
        search: searchQuery,
        stage: apiStage,
        page: '1',
        pageSize: '10000',
      });

      // Remove the stage param when we're explicitly asking for all stages so
      // the backend doesn't accidentally apply a stage filter.
  if (apiStage === 'all') params.delete('stage');

  // Apply job filter (also applied for Kanban so the board can be scoped to a single job)
  if (jobFilter && jobFilter !== 'all') params.set('job', jobFilter);
  else params.delete('job');

      const response = await fetch(`/api/candidates?${params}`);
      const data = await response.json();
      setCandidates(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch candidates');
    }
  }, [searchQuery, stageFilter, viewMode, jobFilter]);

  // Restore scroll/index if coming back from candidate detail
  useEffect(() => {
    const locState = (location && (location.state as NavState)) || null;
    const histState = (typeof window !== 'undefined' && (window.history.state as NavState)) || null;
    let state = locState || histState || null;
    // fallback to sessionStorage if history state is absent
    if (!state) {
      try {
        const raw = sessionStorage.getItem('candidates:viewState');
        if (raw) state = JSON.parse(raw) as NavState;
      } catch (e) {
        // ignore
      }
    }

    const idx = state?.scrollIndex;
    if (typeof idx === 'number' && virtuosoRef.current) {
      // small delay to allow Virtuoso to mount and render
      setTimeout(() => {
        try { virtuosoRef.current.scrollToIndex(idx); } catch (e) { /* ignore */ }
      }, 50);
    }

    // restore view mode if present
    if (state?.viewMode && (state.viewMode === 'list' || state.viewMode === 'grid' || state.viewMode === 'kanban')) {
      setViewMode(state.viewMode as 'list' | 'grid' | 'kanban');
      // clear sessionStorage fallback after applying
  try { sessionStorage.removeItem('candidates:viewState'); } catch (e) { console.warn('sessionStorage remove failed', e); }
    }

    // restore optional stage (useful when coming back from kanban)
  const maybeStage = (state && (state as NavState) && (state as NavState & { stage?: string }).stage) as string | undefined;
    if (maybeStage) {
      const s = maybeStage;
      if (s === 'all' || ['applied','screen','tech','offer','hired','rejected'].includes(s)) {
        setStageFilter(s as Candidate['stage'] | 'all');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = async () => {
    const allJobs = await db.jobs.toArray();
    setJobs(allJobs);
  };

  useEffect(() => {
    fetchJobs();
    // initialize filter from query param if present
    const params = new URLSearchParams(location.search);
    const s = params.get('stage');
    if (s) setStageFilter(s as Candidate['stage']);
    const j = params.get('job');
    if (j) setJobFilter(j);
  }, [location.search]);

  // Clear focusedStage whenever we leave Kanban view
  useEffect(() => {
    if (viewMode !== 'kanban' && focusedStage) setFocusedStage(null);
  }, [viewMode, focusedStage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, searchQuery ? 300 : 0); // Only debounce search input, not filter changes
    
    return () => clearTimeout(timer);
  }, [fetchCandidates, searchQuery, stageFilter]);

  const getJobTitle = (jobId: string) => {
    const title = jobs.find(job => job.id === jobId)?.title || 'Unknown Position';
    // strip trailing numeric suffixes added by older seed-data (e.g. "Marketing Manager 10")
    return String(title).replace(/\s+\d+$/,'');
  };

  const getStageColor = (stage?: string) => {
    // standardized palette: applied=amber, screen=orange, tech=sky, offer=violet, hired=emerald, rejected=slate
    switch (stage) {
      case 'applied':
        return 'bg-amber-500 text-white';
      case 'screen':
        return 'bg-amber-300 text-white';
      case 'tech':
        return 'bg-sky-500 text-white';
      case 'offer':
        return 'bg-violet-600 text-white';
      case 'hired':
        return 'bg-emerald-600 text-white';
      case 'rejected':
        return 'bg-slate-200 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  function CandidateRow({ candidate, index }: { candidate: Candidate; index?: number }) {
    const [skills, setSkills] = useState<string[] | null>(null);
    const [appliedTitle, setAppliedTitle] = useState<string>('');
    const [appliedLocation, setAppliedLocation] = useState<string>('');

    useEffect(() => {
      let mounted = true;

      const ensureDetails = async () => {
        try {
          // resolve job
          let job = jobs.find(j => j.id === candidate.jobId);
          if (!job) {
            // create a synthetic job entry using candidate.jobId as id if present
            const title = candidate.jobId ? `Position ${candidate.jobId}` : 'Unknown Position';
            const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
            const newJob: Job = {
              id: candidate.jobId || `job-${Date.now()}`,
              title,
              slug: title.toLowerCase().replace(/\s+/g, '-'),
              department: 'Engineering',
              location,
              type: 'Full-time',
              status: 'active',
              tags: [],
              openings: 1,
              order: Date.now(),
              openDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            try {
              await db.jobs.add(newJob);
              // refresh local jobs state
              fetchJobs();
              job = newJob;
            } catch (e) {
              // ignore if add fails
            }
          }

          const title = job?.title || getJobTitle(candidate.jobId);
          const location = job?.location || LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

          // compute skills: use existing candidate.skills if present, otherwise generate from job title
          type CandidateWithExtras = Candidate & { skills?: string[]; appliedJobTitle?: string; appliedLocation?: string };
          const candEx = candidate as CandidateWithExtras;
          let s: string[] | undefined = Array.isArray(candEx.skills) ? candEx.skills : undefined;
          if (!s) {
            s = getSkillsForJobTitle(title);
            // persist skills on candidate record (non-breaking extra field)
            try {
              const candidatesTable = db.candidates as unknown as { update(key: string, changes: Record<string, unknown>): Promise<number> };
              await candidatesTable.update(candidate.id, { skills: s, appliedJobTitle: title, appliedLocation: location });
            } catch (e) { /* ignore */ }
          }

          if (!mounted) return;
          setSkills(s || null);
          setAppliedTitle(title);
          setAppliedLocation(location);
        } catch (err) {
          // ignore
        }
      };

      ensureDetails();
      return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidate.id, candidate.jobId, jobs]);

    return (
      <Card 
        className={`hover:shadow-md transition-shadow cursor-pointer mb-3 ${candidate.stage === 'applied' ? 'border-2 border-amber-400' : ''}`}
        onClick={() => {
          // persist current list state on this history entry so Back restores position
          if (typeof index === 'number') {
            // persist to history state
            navigate(location.pathname + location.search, { replace: true, state: { scrollIndex: index, viewMode } });
            // fallback: also persist into sessionStorage so we can restore if history.state is lost
            try { sessionStorage.setItem('candidates:viewState', JSON.stringify({ scrollIndex: index, viewMode })); } catch (e) { console.warn('sessionStorage set failed', e); }
          }
          navigate(`/candidates/${candidate.id}`);
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div onClick={(e) => e.stopPropagation()} className="pt-1">
              <Checkbox
                checked={selectedIds.includes(candidate.id)}
                onCheckedChange={() => {
                  setSelectedIds((prev) => prev.includes(candidate.id) ? prev.filter(id => id !== candidate.id) : [...prev, candidate.id]);
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">{candidate.stage === 'applied' && <Zap className="h-5 w-5 text-amber-500" />}{candidate.name}</h3>
                    <Badge className={getStageColor(candidate.stage)}>
                      {candidate.stage}
                    </Badge>
                  </div>

                  {/* Tiles: Email / Phone / Job / Location / Applied / Score / Resume */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Email:</span>
                      <span className="truncate">{candidate.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Phone:</span>
                      <span className="truncate">{candidate.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Job:</span>
                      <span className="truncate">{appliedTitle || getJobTitle(candidate.jobId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Location:</span>
                      <span className="truncate">{appliedLocation || (jobs.find(j => j.id === candidate.jobId)?.location) || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Applied:</span>
                      <span className="truncate">{new Date(candidate.appliedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Score:</span>
                      <span className="font-semibold">{candidate.score}/100</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {candidate.resumeViewed ? (
                        <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3">Resume Viewed</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted">No Resume</Badge>
                      )}
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      {skills && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((sk) => (
                            <Badge key={sk} className="bg-muted/30 text-muted-foreground">{sk}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {/* compact right column replaced by tiles in main area; keep a small metadata column */}
                  <div className="text-sm text-muted-foreground">Applied <span className="font-semibold">{new Date(candidate.appliedAt).toLocaleDateString()}</span></div>
                  <div className="text-sm text-muted-foreground">Score: <span className="font-semibold text-foreground">{candidate.score}/100</span></div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}>
                      View Application
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAllSelected = candidates.length > 0 && selectedIds.length === candidates.length;

  const toggleSelectAll = (next?: boolean) => {
    if (next === undefined) next = !isAllSelected;
    if (next) setSelectedIds(candidates.map(c => c.id));
    else setSelectedIds([]);
  };

  const applyBulkStage = async () => {
    if (!bulkStage) return toast.error('Please choose a stage to apply');
    const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
    if (bulkStage === 'hired') {
      const low = selectedCandidates.find(c => (c.score ?? 0) < 50);
      if (low) {
        const ok = window.confirm('One or more selected candidates have a score below 50. Are you sure you want to mark them as Hired?');
        if (!ok) return;
      }
    }

    try {
      await Promise.all(selectedCandidates.map(c => fetch(`/api/candidates/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: bulkStage })
      })));
      toast.success('Updated selected candidates');
      setSelectedIds([]);
      setBulkStage('');
      fetchCandidates();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update some candidates');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
  <h1 className="text-4xl font-bold mb-2 text-foreground">Candidates</h1>
        <p className="text-muted-foreground">View and manage candidate applications</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
  <Select value={viewMode === 'kanban' ? (focusedStage ?? 'all') : stageFilter} onValueChange={(v: string) => {
          const next = v as Candidate['stage'] | 'all';
          if (viewMode === 'kanban') {
            // In Kanban we don't want to apply a backend filter; instead,
            // let the user 'focus' a column visually. Avoid changing the URL
            // so the board remains intact.
            setFocusedStage(next === 'all' ? null : next as Candidate['stage']);
            return;
          }
          setStageFilter(next);
          // update URL so linkable/filterable
          if (next === 'all') navigate('/candidates');
          else navigate(`/candidates?stage=${encodeURIComponent(next)}`);
        }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="screen">Screening</SelectItem>
            <SelectItem value="tech">Technical</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {/* Job title filter */}
        <Select value={jobFilter} onValueChange={(v: string) => {
          const next = v as string | 'all';
          // update local state — fetchCandidates is called by the effect that watches it
          setJobFilter(next);
          // update URL params while preserving other params
          try {
            const params = new URLSearchParams(window.location.search);
            if (next === 'all') params.delete('job'); else params.set('job', next);
            const qs = params.toString();
            navigate('/candidates' + (qs ? `?${qs}` : ''), { replace: true });
          } catch (e) { /* ignore */ }
        }}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map(job => (
              <SelectItem key={job.id} value={job.id}>{stripTrailingNumber(job.title)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <Table className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            onClick={() => setViewMode('kanban')}
            title="Kanban View"
          >
            Kanban
          </Button>
        </div>
      </div>

      {/* Filter summary: show how many candidates match current filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Card>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Matching candidates</div>
                <div className="text-2xl font-bold">{candidates.length}</div>
                <div className="text-sm text-muted-foreground">Filters: {stageFilter === 'all' ? 'All stages' : stageFilter} • {jobFilter === 'all' ? 'All jobs' : getJobTitle(jobFilter)}</div>
              </div>
              <div>
                <Button variant="outline" onClick={() => { setJobFilter('all'); setStageFilter('all'); setSearchQuery(''); navigate('/candidates'); }}>Clear filters</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={isAllSelected} onCheckedChange={() => toggleSelectAll()} />
            <span className="text-sm">{selectedIds.length} selected</span>
          </div>
          <Select value={bulkStage} onValueChange={(v: string) => setBulkStage(v as Candidate['stage'])}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Change stage for selected" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="screen">Screening</SelectItem>
              <SelectItem value="tech">Technical</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={applyBulkStage}>Apply</Button>
            <Button variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="h-[calc(100vh-300px)]">
          <Virtuoso
            ref={virtuosoRef}
            data={candidates}
            itemContent={(index, candidate) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5) }}
              >
                <CandidateRow candidate={candidate} index={index} />
              </motion.div>
            )}
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate, idx) => (
            <Card 
              key={candidate.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${candidate.stage === 'applied' ? 'border-2 border-amber-400' : ''}`}
              onClick={() => {
                // persist grid index on current history entry, then navigate
                navigate(location.pathname + location.search, { replace: true, state: { scrollIndex: idx, viewMode } });
                try { sessionStorage.setItem('candidates:viewState', JSON.stringify({ scrollIndex: idx, viewMode })); } catch (e) { console.warn('sessionStorage set failed', e); }
                navigate(`/candidates/${candidate.id}`);
              }}
            >
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div onClick={(e) => e.stopPropagation()} className="pt-1">
                        <Checkbox
                          checked={selectedIds.includes(candidate.id)}
                          onCheckedChange={() => {
                            setSelectedIds((prev) => prev.includes(candidate.id) ? prev.filter(id => id !== candidate.id) : [...prev, candidate.id]);
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">{candidate.stage === 'applied' && <Zap className="h-5 w-5 text-amber-500" />}{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                        <p className="text-sm text-muted-foreground">{getJobTitle(candidate.jobId)}</p>
                        <p className="text-sm text-muted-foreground">{(jobs.find(j => j.id === candidate.jobId)?.location) || ''}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(() => {
                            type CandidateWithExtras = Candidate & { skills?: string[] };
                            const candEx = candidate as CandidateWithExtras;
                            const skills = Array.isArray(candEx.skills) && candEx.skills.length ? candEx.skills : getSkillsForJobTitle(getJobTitle(candidate.jobId));
                            return skills.slice(0, 4).map(sk => (
                              <Badge key={sk} className="bg-muted/30 text-muted-foreground">{sk}</Badge>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStageColor(candidate.stage)}>
                        {candidate.stage}
                      </Badge>
                      <div className="text-sm text-muted-foreground">Score: <span className="font-semibold">{candidate.score}/100</span></div>
                      {candidate.resumeViewed ? (
                        <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3">Resume Viewed</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted">No Resume</Badge>
                      )}
                      <div>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}>
                          View Application
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <CandidateKanban candidates={candidates} onUpdate={fetchCandidates} focusedStage={focusedStage} />
      )}
    </div>
  );
};

export default Candidates;
