import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { db, Job, Assessment, AssessmentSection } from "@/lib/db";
import { stripTrailingNumber } from '@/lib/utils';
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

const Assessments = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  const [avgDurationMin, setAvgDurationMin] = useState<number>(0);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const allJobs = await db.jobs.where('status').equals('active').toArray();
      const allAssessments = await db.assessments.toArray();
      setJobs(allJobs);
      setAssessments(allAssessments);
    };
    loadData();
  }, []);

  // compute metrics (use active assessments only)
  useEffect(() => {
    let mounted = true;
    const compute = async () => {
      // Determine active assessments (those whose job is active)
      const activeAssessments = assessments.filter(a => {
        const job = jobs.find(j => j.id === a.jobId);
        return job ? job.status === 'active' : false;
      });

      // Count responses related to active assessments (by jobId)
      const allResponses = await db.assessmentResponses.toArray();
      const activeJobIds = new Set(activeAssessments.map(a => a.jobId));
      const respForActive = allResponses.filter(r => activeJobIds.has(r.jobId));
      const respCount = respForActive.length;

      // avg duration estimate: average questions per active assessment * 2 minutes
      const questionsPerAssessment = activeAssessments.length
        ? activeAssessments.reduce((acc, a) => acc + (a.sections?.reduce((sAcc, s) => sAcc + (s.questions?.length || 0), 0) || 0), 0) / activeAssessments.length
        : 0;
      const avgMin = Math.max(1, Math.round((questionsPerAssessment * 2)));

      // completion rate: percent of active responses that have at least one answer
      const completed = respForActive.filter(r => r.responses && Object.keys(r.responses).length > 0).length;
      const rate = respCount > 0 ? Math.round((completed / respCount) * 100) : 0;

      if (!mounted) return;
      setTotalResponses(respCount);
      setAvgDurationMin(avgMin);
      setCompletionRate(rate);
    };

    compute();
    return () => { mounted = false; };
  }, [assessments, jobs]);

  // restore scroll position if present in history state
  useEffect(() => {
    let state = (typeof window !== 'undefined' && (window.history.state as unknown as { assessmentsScrollY?: number })) || {};
    // fallback to sessionStorage
    if (!state || Object.keys(state).length === 0) {
      try {
        const raw = sessionStorage.getItem('assessments:viewState');
        if (raw) state = JSON.parse(raw) as { assessmentsScrollY?: number };
      } catch (e) {
        // ignore
      }
    }
    const y = state?.assessmentsScrollY as number | undefined;
    if (typeof y === 'number') window.scrollTo(0, y);
  }, []);

  const hasAssessment = (jobId: string) => {
    return assessments.some(a => a.jobId === jobId);
  };

  const getQuestionCount = (jobId: string) => {
    const assessment = assessments.find(a => a.jobId === jobId);
    if (!assessment) return 0;
    return (
      assessment.sections?.reduce((total: number, section: AssessmentSection) => {
        return total + (section.questions?.length || 0);
      }, 0) || 0
    );
  };

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Assessment Center</h1>
            <p className="text-muted-foreground">Create and manage custom assessments for your hiring process</p>
          </div>
          <div>
            <Button onClick={() => { navigate('/jobs'); toast.success('Go to Jobs to create a new assessment for a job'); }}>
              <Plus className="h-4 w-4 mr-2" /> New Assessment
            </Button>
          </div>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card className="p-4">
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Assessments</div>
                {/* Show active assessments as the primary number */}
                <div className="text-2xl font-bold">{assessments.filter(a => {
                  const job = jobs.find(j => j.id === a.jobId);
                  return job ? job.status === 'active' : false;
                }).length}</div>
                <div className="text-xs text-green-400 mt-1">{assessments.length} total</div>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <ClipboardList className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Responses</div>
                <div className="text-2xl font-bold">{totalResponses}</div>
                <div className="text-xs text-green-400 mt-1">Across all assessments</div>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg. Duration</div>
                <div className="text-2xl font-bold">{avgDurationMin} min</div>
                <div className="text-xs text-muted-foreground mt-1">Estimated completion time</div>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <div className="text-xs text-green-400 mt-1">Average completion rate</div>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <BarChart2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job, index) => {
          const hasSetup = hasAssessment(job.id);
          const questionCount = getQuestionCount(job.id);

          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{stripTrailingNumber(job.title)}</CardTitle>
                    {hasSetup && (
                      <Badge variant="outline" className="bg-chart-3 text-white">
                        {questionCount} questions
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{job.department}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant={hasSetup ? "outline" : "default"}
                    onClick={() => {
                      const existing = (window.history && (window.history.state as unknown)) || {};
                      const existingObj = (typeof existing === 'object' && existing !== null) ? existing as Record<string, unknown> : {};
                      try { window.history.replaceState({ ...existingObj, assessmentsScrollY: window.scrollY }, ''); } catch (e) { /* ignore */ }
                      try { sessionStorage.setItem('assessments:viewState', JSON.stringify({ assessmentsScrollY: window.scrollY })); } catch (e) { console.warn('sessionStorage set failed', e); }
                      navigate(`/assessments/${job.id}/builder`);
                    }}
                  >
                    {hasSetup ? (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Assessment
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Assessment
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center pb-8 pt-12">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Active Jobs</CardTitle>
            <CardDescription>
              Create some active jobs first to build assessments for them
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-12">
            <Button onClick={() => navigate('/jobs')}>
              Go to Jobs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Assessments;
