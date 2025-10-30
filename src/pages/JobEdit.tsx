import { useEffect, useState } from 'react';
import { Job } from '@/lib/db';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const JobEdit = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const j = await db.jobs.get(jobId);
      setJob(j);
    })();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!job) return;
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      title: form.get('title'),
      department: form.get('department'),
      location: form.get('location'),
      type: form.get('type'),
      openings: parseInt(form.get('openings') as string) || job.openings,
      openDate: form.get('openDate') ? new Date(String(form.get('openDate'))).toISOString() : job.openDate,
      closeDate: form.get('closeDate') ? new Date(String(form.get('closeDate'))).toISOString() : null,
      tags: (form.get('tags') as string || '').split(',').map((t) => t.trim()).filter(Boolean),
    };

    try {
      setIsSaving(true);
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update job');

      const updated = await res.json();
      // Keep local DB in sync
      await db.jobs.update(job.id, updated);
      toast.success('Job updated');
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!job) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle>Edit Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={job.title} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Select name="department" defaultValue={job.department}>
                  <SelectTrigger>
                    <SelectValue placeholder={job.department} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Select name="location" defaultValue={job.location}>
                  <SelectTrigger>
                    <SelectValue placeholder={job.location} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="New York">New York</SelectItem>
                    <SelectItem value="San Francisco">San Francisco</SelectItem>
                    <SelectItem value="London">London</SelectItem>
                    <SelectItem value="Berlin">Berlin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={job.type}>
                  <SelectTrigger>
                    <SelectValue placeholder={job.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="openings">Openings</Label>
                <Input id="openings" name="openings" type="number" defaultValue={job.openings} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="openDate">Open Date</Label>
                <Input id="openDate" name="openDate" type="date" defaultValue={job.openDate ? new Date(job.openDate).toISOString().slice(0,10) : ''} />
              </div>
              <div>
                <Label htmlFor="closeDate">Close Date</Label>
                <Input id="closeDate" name="closeDate" type="date" defaultValue={job.closeDate ? new Date(job.closeDate).toISOString().slice(0,10) : ''} />
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" name="tags" defaultValue={(job.tags || []).join(', ')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobEdit;
