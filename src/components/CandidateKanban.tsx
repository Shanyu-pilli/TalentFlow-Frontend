import { useState } from "react";
import { useLiveQuery } from 'dexie-react-hooks';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar } from 'lucide-react';
import { Candidate } from "@/lib/db";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

interface Stage { id: string; label: string; color: string }

const STAGES: Stage[] = [
  { id: 'applied', label: 'Applied', color: 'bg-amber-500' },
  { id: 'screen', label: 'Screening', color: 'bg-amber-300' },
  { id: 'tech', label: 'Technical', color: 'bg-sky-500' },
  { id: 'offer', label: 'Offer', color: 'bg-violet-600' },
  { id: 'hired', label: 'Hired', color: 'bg-emerald-600' },
  { id: 'rejected', label: 'Rejected', color: 'bg-slate-200' },
];

interface CandidateKanbanProps {
  candidates: Candidate[];
  onUpdate: () => void;
  focusedStage?: string | null;
}

export function CandidateKanban({ candidates, onUpdate, focusedStage }: CandidateKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const jobs = useLiveQuery(() => db.jobs.toArray());
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

  const candidateId = active.id as string;
  let newStage = over.id as string;

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.stage === newStage) {
      setActiveId(null);
      return;
    }

    // If moving to 'hired' and the candidate has a very low score, do NOT
    // place them in the Hired column. Instead, move them to a random other
    // stage (excluding 'hired' and their current stage).
    const HIRE_CONFIRM_THRESHOLD = 50; // configurable threshold
    if (newStage === 'hired' && typeof candidate.score === 'number' && candidate.score < HIRE_CONFIRM_THRESHOLD) {
      const altStages = STAGES.map(s => s.id).filter(id => id !== 'hired' && id !== candidate.stage);
      const fallback = altStages.length ? altStages[Math.floor(Math.random() * altStages.length)] : candidate.stage;
      newStage = fallback;
      const label = STAGES.find(s => s.id === fallback)?.label || fallback;
      toast(`Candidate had low score (${candidate.score}/100). Placed in ${label}`);
    }

    try {
      await fetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      onUpdate();
      toast.success(`Candidate moved to ${STAGES.find(s => s.id === newStage)?.label}`);
    } catch (error) {
      toast.error('Failed to update candidate stage');
    }

    setActiveId(null);
  };

  const getCandidatesByStage = (stage: string) => {
    return candidates.filter(c => c.stage === stage);
  };

  const activeCandidate = activeId ? candidates.find(c => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageCandidates = getCandidatesByStage(stage.id);
          const isFocused = focusedStage ? focusedStage === stage.id : true;
          return (
            <DroppableColumn key={stage.id} id={stage.id} stage={stage} count={stageCandidates.length} focused={focusedStage ? focusedStage : null}>
              <div className={`${isFocused ? '' : 'opacity-40 pointer-events-none'}`}>
                {stageCandidates.map((candidate) => (
                  <DraggableCandidate key={candidate.id} candidate={candidate} navigate={navigate} jobs={jobs || []} />
                ))}
              </div>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeCandidate ? (
          <div className="p-3 bg-card border rounded-lg shadow-lg w-64">
            <p className="font-medium text-sm mb-1">{activeCandidate.name}</p>
            <p className="text-xs text-muted-foreground truncate">{activeCandidate.email}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ id, stage, count, children, focused }: { id: string; stage: Stage; count: number; children: React.ReactNode; focused?: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const navigate = useNavigate();

  const columnClass = isOver ? 'ring-2 ring-offset-2 ring-primary' : '';

  const dim = focused && focused !== stage.id ? 'opacity-40 pointer-events-none' : '';

  return (
    // Attach the droppable ref to the Card so the whole column is a drop target
    <Card ref={setNodeRef} className={`flex flex-col h-[600px] ${columnClass} ${dim}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          <Button
            variant="default"
            className={`w-full flex items-center justify-between text-sm px-3 py-2 ${stage.color} text-white rounded-md`}
            onClick={() => navigate(`/candidates?stage=${encodeURIComponent(stage.id)}`)}
            aria-label={`Filter candidates by ${stage.label}`}
          >
            <span className="text-left font-medium">{stage.label}</span>
            <Badge className="ml-2 bg-white text-black">{count}</Badge>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        <div className="min-h-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function DraggableCandidate({ candidate, navigate, jobs }: { candidate: Candidate; navigate: (to: string) => void; jobs: import('@/lib/db').Job[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: candidate.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  type CandidateWithExtras = Candidate & { skills?: string[]; appliedJobTitle?: string; appliedLocation?: string; resumeViewed?: boolean };
  const candEx = candidate as CandidateWithExtras;
  const title = candEx.appliedJobTitle || jobs.find(j => j.id === candidate.jobId)?.title || '';
  const location = candEx.appliedLocation || jobs.find(j => j.id === candidate.jobId)?.location || '';
  const skills = Array.isArray(candEx.skills) ? candEx.skills : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-2 p-3 bg-card border rounded-lg cursor-move hover:shadow-md transition-shadow"
      onClick={() => {
        // Prevent navigation while dragging (avoids accidental route changes)
        if (!isDragging) {
          // persist current kanban view on this history entry so Back restores
          try {
            const existing = window.history.state || {};
            window.history.replaceState({ ...existing, viewMode: 'kanban', stage: candidate.stage }, '');
          } catch (e) {
            // ignore
          }
          // also write a sessionStorage fallback so we can restore if history.state is lost
          try { sessionStorage.setItem('candidates:viewState', JSON.stringify({ viewMode: 'kanban', stage: candidate.stage })); } catch (e) { console.warn('sessionStorage set failed', e); }
          navigate(`/candidates/${candidate.id}?fromStage=${encodeURIComponent(candidate.stage)}&viewMode=kanban`);
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm mb-1">{candidate.name}</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{candidate.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{candidate.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">Applied {new Date(candidate.appliedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
