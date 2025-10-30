import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, UserPlus, FileCheck, UserCheck, Trash2 } from "lucide-react";
import { stripTrailingNumber } from '@/lib/utils';
import { toast } from "sonner";

export function RecentActivity() {
  const candidates = useLiveQuery(() => db.candidates.toArray());
  const jobs = useLiveQuery(() => db.jobs.orderBy('createdAt').reverse().limit(5).toArray());
  const timeline = useLiveQuery(() => db.timeline.orderBy('timestamp').reverse().limit(30).toArray());
  const hidden = useLiveQuery(() => db.hiddenActivities.toArray());

  // Map jobs to activity items
  const jobActivities = (jobs || []).map(job => {
    // Different actions based on job status
    const actionMap = {
      'active': 'opened a new job posting for',
      'draft': 'saved draft job for',
      'archived': 'archived job posting for',
      'closed': 'closed job posting for'
    };
    const action = actionMap[job.status] || 'updated job posting for';
    
    return {
      id: `job-${job.id}`,
      type: 'job' as const,
      title: `${action} ${stripTrailingNumber(job.title)}`,
      subtitle: `in ${job.department} • ${job.location} • ${job.type}`,
      time: job.createdAt,
      icon: Briefcase,
      color: 'text-primary',
    };
  });

  // Map candidate application activities
  const candidateAppliedActivities = (candidates || [])
    .map(candidate => {
      const job = jobs?.find(j => j.id === candidate.jobId);
      return {
        id: `candidate-applied-${candidate.id}`,
        type: 'candidate-applied' as const,
        title: `${candidate.name} applied for ${job ? stripTrailingNumber(job.title) : 'a position'}`,
        subtitle: `Current stage: ${candidate.stage}`,
        time: candidate.appliedAt,
        icon: UserPlus,
        color: 'text-accent',
      };
    });

  // Map timeline entries (stage changes and notes) to activities
      const timelineActivities = (timeline || [])
    .map(entry => {
      const cand = (candidates || []).find(c => c.id === entry.candidateId);
      const name = cand ? cand.name : entry.candidateId;
      
      // Define stage colors and names matching the pipeline
      const stageConfig: Record<string, { name: string, color: string }> = {
        'applied': { name: 'Applied', color: 'hsl(var(--chart-1))' },
        'screen': { name: 'Screening', color: 'hsl(var(--chart-2))' },
        'tech': { name: 'Technical', color: 'hsl(var(--chart-3))' },
        'offer': { name: 'Offer', color: 'hsl(var(--chart-4))' },
        'hired': { name: 'Hired', color: 'hsl(var(--chart-5))' },
        'rejected': { name: 'Rejected', color: 'hsl(var(--destructive))' }
      };

      const formatStage = (stage: string) => stageConfig[stage.toLowerCase()]?.name || stage;
      const getStageColor = (stage: string) => stageConfig[stage.toLowerCase()]?.color;

      // Determine if this is a stage change or note
      const isStageChange = entry.previousStage || entry.stage !== (cand?.stage || 'applied');
      const isNote = entry.note?.trim().length > 0;

      // Create title based on type
      let title = '';
      if (isStageChange && isNote) {
        title = `Updated ${name}'s stage and added a note`;
      } else if (isStageChange) {
        title = `Updated ${name}'s stage`;
      } else if (isNote) {
        title = `Added note for ${name}`;
      } else {
        title = `Updated ${name}'s profile`;
      }

      const fromStage = entry.previousStage ? formatStage(entry.previousStage) : null;
      const toStage = formatStage(entry.stage);

      return {
        id: `timeline-${entry.id}`,
        type: 'timeline' as const,
        title,
        fromStage,
        toStage,
        fromColor: entry.previousStage ? getStageColor(entry.previousStage) : undefined,
        toColor: getStageColor(entry.stage),
        subtitle: entry.note,
        time: entry.timestamp,
        icon: isNote ? FileCheck : UserCheck,
        color: isNote ? 'text-primary' : 'text-chart-2',
      };
    });

  // Combine and dedupe by id, sort by time desc and limit
  const combined = [...jobActivities, ...timelineActivities, ...candidateAppliedActivities];
  const dedupedMap = new Map<string, typeof combined[number]>();
  combined.forEach(item => dedupedMap.set(item.id, item));
  let activities = Array.from(dedupedMap.values())
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // filter out hidden activities
  const hiddenIds = new Set((hidden || []).map(h => h.id));
  activities = activities.filter(a => !hiddenIds.has(a.id)).slice(0, 15);

  const dismissActivity = async (id: string) => {
    try {
      await db.hiddenActivities.add({ id, hiddenAt: new Date() });
      toast.success('Activity dismissed', { action: {
        label: 'Undo',
        onClick: async () => {
          await db.hiddenActivities.where('id').equals(id).delete();
          toast.success('Undo successful');
        }
      }});
    } catch (e) {
      toast.error('Could not dismiss activity');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                <div className={`mt-1 ${activity.color}`}>
                  <activity.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <button
                      aria-label="Dismiss activity"
                      className="text-muted-foreground hover:text-foreground ml-3 p-1 rounded"
                      onClick={() => dismissActivity(activity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {'fromStage' in activity && (
                    <div className="flex items-center gap-2 mt-1">
                      {activity.fromStage && (
                        <Badge 
                          className="text-xs" 
                          style={{ 
                            backgroundColor: activity.fromColor,
                            color: 'white',
                          }}
                        >
                          {activity.fromStage}
                        </Badge>
                      )}
                      {activity.fromStage && (
                        <span className="text-muted-foreground">→</span>
                      )}
                      <Badge 
                        className="text-xs" 
                        style={{ 
                          backgroundColor: activity.toColor,
                          color: 'white',
                        }}
                      >
                        {activity.toStage}
                      </Badge>
                    </div>
                  )}
                  {activity.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
