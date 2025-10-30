import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
Select,
SelectTrigger,
SelectValue,
SelectContent,
SelectItem,
} from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Users, FileText, CheckCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Job, Candidate, Assessment } from '@/lib/db';
import { stripTrailingNumber } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedNumber from '@/components/AnimatedNumber';

// no-op edit: refresh editor diagnostics

const DashboardV2 = () => {
const navigate = useNavigate();
const jobs = useLiveQuery(() => db.jobs.toArray());
const candidates = useLiveQuery(() => db.candidates.toArray());
const assessments = useLiveQuery(() => db.assessments.toArray());

const totalJobs = jobs?.length || 0;
const totalCandidates = candidates?.length || 0;
const totalAssessments = assessments?.length || 0;
const activeAssessmentsCount = (assessments || []).filter(a => {
    const job = (jobs || []).find(j => j.id === a.jobId);
    return job ? job.status === 'active' : false;
}).length;
const hiredCount = candidates?.filter(c => c.stage === 'hired').length || 0;

const [topN, setTopN] = useState<number>(() => {
    try {
    const raw = localStorage.getItem('dashboardTopN');
    return raw ? Number(raw) : 5;
    } catch (e) {
    return 5;
    }
});

useEffect(() => {
    try {
    localStorage.setItem('dashboardTopN', String(topN));
    } catch (e) {
      // ignore
    }
}, [topN]);

  // Top lists (jobs by openings desc, candidates by score desc, assessments by createdAt desc)
const recentJobs = useMemo(() => {
    return (jobs || [])
    .slice()
    .sort((a, b) => (b.openings || 0) - (a.openings || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, topN);
}, [jobs, topN]);

const recentCandidates = useMemo(() => {
    return (candidates || [])
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0) || new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, topN);
}, [candidates, topN]);

const recentAssessments = useMemo(() => {
    return (assessments || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, topN);
}, [assessments, topN]);

const formatDate = (d?: string | Date) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString();
};

const jobStatusDot = (status?: string) => {
    switch (status) {
    case 'active':
        return 'bg-emerald-500';
    case 'archived':
        return 'bg-slate-300';
    case 'closed':
        return 'bg-gray-400';
    default:
        return 'bg-sky-500';
    }
};

const candidateStagePillClass = (stage?: string) => {
    switch (stage) {
    case 'hired':
        return 'bg-emerald-100 text-emerald-800';
    case 'offer':
        return 'bg-blue-100 text-blue-800';
    case 'screen':
        return 'bg-amber-100 text-amber-800';
    case 'interview':
        return 'bg-violet-100 text-violet-800';
    default:
        return 'bg-slate-100 text-slate-800';
    }
};

return (
    <div className="p-8 space-y-8">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard (Cards)</h1>

        <div className="flex items-center space-x-3">
            <div className="text-sm text-muted-foreground">Show top</div>
            <div className="w-32">
            <Select defaultValue={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
                <SelectTrigger>
                <SelectValue>{topN}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                </SelectContent>
            </Select>
            </div>
        </div>
        </div>
    </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.995 }}>
        <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Jobs</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold"><AnimatedNumber value={totalJobs} /></div>
            <div className="text-sm text-muted-foreground">Total job postings in the system — {(jobs || []).filter(j => j.status === 'active').length} active</div>
        </CardContent>
        </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.04 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.995 }}>
        <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Candidates</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold"><AnimatedNumber value={totalCandidates} /></div>
            <div className="text-sm text-muted-foreground">Total candidates in the system — new this week: +{Math.max(0, (totalCandidates || 0) - 0)}</div>
        </CardContent>
        </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.995 }}>
        <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Assessment Templates</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {/* show active assessments as primary metric, total as subtext */}
        <div className="text-2xl font-bold"><AnimatedNumber value={activeAssessmentsCount} /></div>
        <div className="text-sm text-muted-foreground">Active templates shown — {totalAssessments} total templates</div>
        </CardContent>
        </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.995 }}>
        <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Hired Candidates</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold"><AnimatedNumber value={hiredCount} /></div>
            <div className="text-sm text-muted-foreground">Total hires in system — {Math.round((hiredCount / Math.max(1, totalCandidates)) * 100)}% success rate</div>
        </CardContent>
        </Card>
        </motion.div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
        <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Your latest job postings and their status</CardDescription>
        </CardHeader>
        <CardContent>
            {recentJobs.map((job, idx) => (
            <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="py-3 border-b last:border-b-0 flex justify-between items-start cursor-pointer hover:bg-muted/5 rounded-sm px-1"
            >
                <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${jobStatusDot(job.status)}`}></span>
                    <div className="font-medium">
                        {stripTrailingNumber(job.title)}
                        {idx === 0 && <Badge className="ml-2 bg-amber-500 text-white">Top</Badge>}
                    </div>
                    </div>
                    <div className="text-right">
                    <Badge className={job.status === 'active' ? 'bg-success text-white' : 'bg-muted'}>{job.status}</Badge>
                    </div>
                </div>

                <div className="mt-1 flex items-center justify-between">
                    <div>
                    <div className="text-sm text-muted-foreground">{job.location} • {job.type}</div>
                    <div className="text-sm text-muted-foreground">{job.openings} candidates</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</div>
                </div>
                </div>
            </motion.div>
            ))}
        </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <CardTitle>Recent Candidates</CardTitle>
            <CardDescription>Latest candidate applications and their status</CardDescription>
        </CardHeader>
        <CardContent>
            {recentCandidates.map((c, idx) => (
            <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.035 }}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/candidates/${c.id}`)}
                className="py-3 border-b last:border-b-0 flex justify-between items-start cursor-pointer hover:bg-muted/5 rounded-sm px-1"
            >
                <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${candidateStagePillClass(c.stage).includes('emerald') ? 'bg-emerald-500' : c.stage === 'offer' ? 'bg-blue-500' : c.stage === 'screen' ? 'bg-amber-500' : 'bg-sky-500'}`}></span>
                    <div className="font-medium">
                        {c.name}
                        {idx === 0 && <Badge className="ml-2 bg-amber-500 text-white">Top</Badge>}
                    </div>
                    </div>
                    <div className="text-right">
                    <Badge className={`${candidateStagePillClass(c.stage)} rounded-full px-3 py-1`}>{c.stage}</Badge>
                    </div>
                </div>

                <div className="mt-1 flex items-center justify-between">
                    <div>
                    <div className="text-sm text-muted-foreground">{c.email}</div>
                    <div className="text-sm text-muted-foreground">{stripTrailingNumber(((jobs || []).find(j => j.id === c.jobId)?.title) || 'Unknown Position')}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(c.appliedAt)}</div>
                </div>
                </div>
            </motion.div>
            ))}
        </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <CardTitle>Assessments</CardTitle>
            <CardDescription>Available assessment templates</CardDescription>
        </CardHeader>
        <CardContent>
            {recentAssessments.map((a, idx) => {
            const job = (jobs || []).find(j => j.id === a.jobId);
            // Assessment type may not have a 'title' property in the DB schema; safely fallback
            const aWithTitle = a as unknown as { title?: string };
            const label = job ? stripTrailingNumber(job.title) : (aWithTitle.title || `Assessment ${a.id}`);
            const sectionCount = a.sections?.length || 0;
            const questionCount = a.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0;

            return (
            <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/assessments/${a.id}`)}
                className="py-3 border-b last:border-b-0 flex justify-between items-start cursor-pointer hover:bg-muted/5 rounded-sm px-1"
            >
                <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full bg-sky-500`}></span>
                    <div className="font-medium">
                        {label}
                        {idx === 0 && <Badge className="ml-2 bg-amber-500 text-white">Top</Badge>}
                    </div>
                    </div>
                    <div className="text-right">
                    <Badge className="bg-accent text-white">Template</Badge>
                    </div>
                </div>

                <div className="mt-1 flex items-center justify-between">
                    <div>
                    <div className="text-sm text-muted-foreground">{sectionCount} sections • {questionCount} questions</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</div>
                </div>
                </div>
            </motion.div>
            );
            })}
        </CardContent>
        </Card>
    </div>
    </div>
);
};

// helper to resolve job title by id (keeps component pure)
export default DashboardV2;
