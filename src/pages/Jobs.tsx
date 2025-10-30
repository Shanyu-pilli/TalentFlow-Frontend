import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { JobsReorderableList } from "@/components/JobsReorderableList";
import { Job } from "@/lib/db";

const Jobs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusCounts, setStatusCounts] = useState({ allJobs: 0, allPositions: 0, activeJobs: 0, activePositions: 0, closedJobs: 0, closedPositions: 0, draftJobs: 0, draftPositions: 0, archivedJobs: 0, archivedPositions: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 12;

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      // When using the "closed" filter we need to apply the closeDate check
      // client-side. To ensure all closed items appear on the same page we
      // request a large pageSize (effectively "fetch all") and then let
      // client-side filtering produce the final list. For other filters we
      // keep normal server-side paging.
      const isClientSideFilter = statusFilter === 'closed';
      const fetchPage = isClientSideFilter ? 1 : currentPage;
      const fetchPageSize = isClientSideFilter ? 10000 : pageSize;

      const params = new URLSearchParams({
        search: searchQuery,
        status: isClientSideFilter ? '' : statusFilter,
        page: String(fetchPage),
        pageSize: String(fetchPageSize),
        sort: 'order',
      });

      if (!params.get('status')) params.delete('status');

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      
      setJobs(data.data || []);

      // If we fetched all jobs for client-side filtering, reflect a single
      // page in the UI and reset current page to 1 so pagination behaves as
      // the filtered result set.
      if (isClientSideFilter) {
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        setTotalPages(data.meta?.totalPages || 1);
      }
    } catch (error) {
      toast.error('Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  // Fetch counts for each status (uses a large pageSize to approximate "fetch all").
  const fetchStatusCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        page: '1',
        pageSize: '10000',
        sort: 'order',
      });

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      const all = data.data || [];
      const now = Date.now();

      // Compute both job counts (number of postings) and position counts (sum of openings)
      const counts = all.reduce(
        (acc: { allJobs: number; allPositions: number; activeJobs: number; activePositions: number; closedJobs: number; closedPositions: number; draftJobs: number; draftPositions: number; archivedJobs: number; archivedPositions: number }, job: Job) => {
          const openings = job.openings || 0;
          acc.allJobs += 1;
          acc.allPositions += openings;
          const closeDate = job.closeDate ? new Date(job.closeDate).getTime() : undefined;
          const isClosedByDate = !!closeDate && closeDate <= now;
          if (job.status === 'active' && !isClosedByDate) {
            acc.activeJobs += 1;
            acc.activePositions += openings;
          }
          if (job.status === 'closed' || isClosedByDate) {
            acc.closedJobs += 1;
            acc.closedPositions += openings;
          }
          if (job.status === 'draft') {
            acc.draftJobs += 1;
            acc.draftPositions += openings;
          }
          if (job.status === 'archived') {
            acc.archivedJobs += 1;
            acc.archivedPositions += openings;
          }
          return acc;
        },
        { allJobs: 0, allPositions: 0, activeJobs: 0, activePositions: 0, closedJobs: 0, closedPositions: 0, draftJobs: 0, draftPositions: 0, archivedJobs: 0, archivedPositions: 0 },
      );

      setStatusCounts(counts);
    } catch (err) {
      // ignore counts errors
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, searchQuery, statusFilter, currentPage]);

  // Restore jobs page state (page, filters, scroll) if present in history state
  useEffect(() => {
    const state = (typeof window !== 'undefined' && (window.history.state as unknown as { jobsView?: { page?: number; statusFilter?: string; searchQuery?: string; scrollY?: number } })) || {};
    const v = state?.jobsView;
    if (v) {
      if (typeof v.page === 'number') setCurrentPage(v.page);
      if (typeof v.statusFilter === 'string') setStatusFilter(v.statusFilter);
      if (typeof v.searchQuery === 'string') setSearchQuery(v.searchQuery);
      if (typeof v.scrollY === 'number') {
        setTimeout(() => { window.scrollTo(0, v.scrollY); }, 50);
      }
    }
  }, []);

  useEffect(() => {
    // update counts when the search query changes or on mount
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  // Reset to first page when the user changes the status filter or search
  // so we don't request a page that no longer applies to the new filter.
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // derive which jobs to show based on the status filter and closeDate
  const displayedJobs = useMemo(() => {
    const now = Date.now();
    return jobs.filter(job => {
      if (statusFilter === 'all') return true;

      const closeDate = job.closeDate ? new Date(job.closeDate).getTime() : undefined;
      const isClosedByDate = !!closeDate && closeDate <= now;

      if (statusFilter === 'closed') {
        return isClosedByDate || job.status === 'closed';
      }

      if (statusFilter === 'active') {
        // active and not closed by date
        return job.status === 'active' && !isClosedByDate;
      }

      if (statusFilter === 'draft') return job.status === 'draft';
      if (statusFilter === 'archived') return job.status === 'archived';

      return true;
    });
  }, [jobs, statusFilter]);

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          slug: (formData.get('title') as string).toLowerCase().replace(/\s+/g, '-'),
          department: formData.get('department'),
          location: formData.get('location'),
          type: formData.get('type'),
          openings: parseInt(formData.get('openings') as string),
          tags,
          status: 'active',
          order: jobs.length,
          openDate: new Date(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create job');

      setIsCreateDialogOpen(false);
      fetchJobs();
      toast.success("Job created successfully!");
    } catch (error) {
      toast.error("Failed to create job");
    }
  };

  const getStatusBadge = (status: string, closeDate?: Date | string) => {
    // If a closeDate exists and is in the past, show Closed regardless of status
    if (closeDate) {
      const close = new Date(typeof closeDate === 'string' ? closeDate : String(closeDate));
      if (!isNaN(close.getTime()) && close.getTime() <= Date.now()) {
        return <Badge variant="destructive">Closed</Badge>;
      }
    }

    if (status === 'active') return <Badge className="bg-chart-3 text-white">Open</Badge>;
    if (status === 'closed') return <Badge variant="destructive">Closed</Badge>;
    if (status === 'draft') return <Badge variant="secondary">Draft</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const handleEditJob = (job: Job) => {
    navigate(`/jobs/${job.id}/edit`);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      fetchJobs();
      toast.success('Job deleted successfully');
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const handleStatusChange = async (jobId: string, status: Job['status']) => {
    try {
      const payload: Record<string, unknown> = { status };
      if (status === 'closed') payload.closeDate = new Date();
      if (status === 'active') payload.closeDate = null;

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed');
      fetchJobs();
      toast.success('Job status updated');
    } catch (err) {
      toast.error('Failed to update job status');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Jobs</h1>
          <p className="text-muted-foreground">Manage open positions and job listings</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>Add a new position to your hiring pipeline</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input id="title" name="title" placeholder="e.g. Senior Software Engineer" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select name="department" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
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
                  <Select name="location" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
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
                  <Label htmlFor="type">Job Type</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
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
                  <Input id="openings" name="openings" type="number" min="1" defaultValue="1" required />
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" name="tags" placeholder="e.g. urgent, senior, remote-first" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Job</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
              <SelectItem value="all">All Statuses <span className="ml-2 text-xs text-muted-foreground">({statusCounts.allJobs} jobs / {statusCounts.allPositions} pos)</span></SelectItem>
              <SelectItem value="active">Active <span className="ml-2 text-xs text-muted-foreground">({statusCounts.activeJobs} jobs / {statusCounts.activePositions} pos)</span></SelectItem>
              <SelectItem value="closed">Closed <span className="ml-2 text-xs text-muted-foreground">({statusCounts.closedJobs} jobs / {statusCounts.closedPositions} pos)</span></SelectItem>
              <SelectItem value="draft">Draft <span className="ml-2 text-xs text-muted-foreground">({statusCounts.draftJobs} jobs / {statusCounts.draftPositions} pos)</span></SelectItem>
              <SelectItem value="archived">Archived <span className="ml-2 text-xs text-muted-foreground">({statusCounts.archivedJobs} jobs / {statusCounts.archivedPositions} pos)</span></SelectItem>
            </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <JobsReorderableList 
          jobs={displayedJobs} 
          onReorderComplete={fetchJobs}
          onView={(job) => {
            // persist current jobs page state to history so Back restores it
            try {
              const existing = (window.history && (window.history.state as unknown)) || {};
              const existingObj = (typeof existing === 'object' && existing !== null) ? existing as Record<string, unknown> : {};
              const jobsView = { page: currentPage, statusFilter, searchQuery, scrollY: window.scrollY };
              window.history.replaceState({ ...existingObj, jobsView }, '');
            } catch (e) {
              // ignore
            }
            try { sessionStorage.setItem('jobs:viewState', JSON.stringify({ page: currentPage, statusFilter, searchQuery, scrollY: window.scrollY })); } catch (e) { console.warn('sessionStorage set failed', e); }
            navigate(`/jobs/${job.id}`);
          }}
          onEdit={handleEditJob}
          onDelete={handleDeleteJob}
          onStatusChange={handleStatusChange}
          getStatusBadge={getStatusBadge}
        />
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Jobs;
