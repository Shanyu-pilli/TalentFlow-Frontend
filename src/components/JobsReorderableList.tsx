import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, GripVertical, Eye, Edit, Trash2, Calendar, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Job } from "@/lib/db";
import { stripTrailingNumber } from '@/lib/utils';
import { toast } from "sonner";
import { format } from "date-fns";

interface SortableJobItemProps {
  job: Job;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onStatusChange: (jobId: string, status: Job['status']) => void;
  getStatusBadge: (status: string, closeDate?: Date) => React.ReactNode;
}

function SortableJobItem({ job, onView, onEdit, onDelete, onStatusChange, getStatusBadge }: SortableJobItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">{stripTrailingNumber(job.title)}</CardTitle>
            </div>
            {getStatusBadge(job.status, job.closeDate)}
          </div>
          <CardDescription className="flex items-center gap-2">
            <Briefcase className="h-3 w-3" />
            {job.department}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              {job.location} • {job.type}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{job.openings}</span>
              {job.openings === 1 ? 'opening' : 'openings'}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" />
              {job.openDate && (
                <>
                  Opens: {format(new Date(job.openDate), 'MMM d, yyyy')}
                  {job.closeDate && ` • Closes: ${format(new Date(job.closeDate), 'MMM d, yyyy')}`}
                </>
              )}
            </div>
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(job);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(job);
                }}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(job.id);
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(job.id, 'active'); }}>Open</DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(job.id, 'closed'); }}>Close</DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(job.id, 'archived'); }}>Archive</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(job.id, 'draft'); }}>Draft</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface JobsReorderableListProps {
  jobs: Job[];
  onReorderComplete: () => void;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onStatusChange: (jobId: string, status: Job['status']) => void;
  getStatusBadge: (status: string, closeDate?: Date) => React.ReactNode;
}

export function JobsReorderableList({ jobs, onReorderComplete, onView, onEdit, onDelete, onStatusChange, getStatusBadge }: JobsReorderableListProps) {
  const [items, setItems] = useState(jobs);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex);
    const fromOrder = items[oldIndex].order;
    const toOrder = items[newIndex].order;

    // Optimistic update
    setItems(newItems);
    setIsReordering(true);

    try {
      const response = await fetch(`/api/jobs/${active.id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromOrder, toOrder }),
      });

      if (!response.ok) {
        throw new Error('Reorder failed');
      }

      onReorderComplete();
      toast.success('Jobs reordered successfully');
    } catch (error) {
      // Rollback on error
      setItems(jobs);
      toast.error('Reorder failed - rolled back to previous order');
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(job => job.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((job) => (
            <SortableJobItem 
              key={job.id} 
              job={job}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </SortableContext>
      {isReordering && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          Reordering...
        </div>
      )}
    </DndContext>
  );
}
