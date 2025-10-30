import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import { stripTrailingNumber } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Briefcase, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = useLiveQuery(() => db.jobs.get(jobId || ''));
  const candidates = useLiveQuery(() => 
    db.candidates.where('jobId').equals(jobId || '').toArray()
  );

  const handleArchiveToggle = async () => {
    if (!job) return;
    
    const newStatus = job.status === 'archived' ? 'active' : 'archived';
    await db.jobs.update(job.id, { status: newStatus, updatedAt: new Date() });
    toast.success(newStatus === 'archived' ? 'Job archived' : 'Job activated');
  };

  const handleDraftToggle = async () => {
    if (!job) return;
    const newStatus = job.status === 'draft' ? 'active' : 'draft';
    try {
      await db.jobs.update(job.id, { status: newStatus, updatedAt: new Date() });
      toast.success(newStatus === 'draft' ? 'Job marked as draft' : 'Job published');
    } catch (err) {
      toast.error('Failed to update job status');
    }
  };

  if (!job) {
    return (
      <div className="p-8">
        <p>Job not found</p>
      </div>
    );
  }

  const stageCounts = candidates?.reduce((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" onClick={() => navigate('/jobs')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">{stripTrailingNumber(job.title)}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {job.department}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
              {job.status}
            </Badge>
            <Button variant="outline" onClick={handleArchiveToggle}>
              {job.status === 'archived' ? 'Unarchive' : 'Archive'}
            </Button>
            <Button variant="outline" onClick={handleDraftToggle}>
              {job.status === 'draft' ? 'Undraft' : 'Draft'}
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{job.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Openings</p>
              <p className="font-medium">{job.openings}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {job.tags?.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Candidate Pipeline</CardTitle>
            <CardDescription>{candidates?.length || 0} total applicants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(stageCounts || {}).map(([stage, count]) => (
                <div key={stage} className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{stage}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetail;
