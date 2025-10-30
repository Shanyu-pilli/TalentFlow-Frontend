import { useState, useEffect } from "react";
import { Job } from '@/lib/db';

const TECHS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Python', 'Django', 'Flask',
  'Java', 'Spring', 'Go', 'Rust', 'C++', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Postgres', 'MySQL',
  'GraphQL', 'REST', 'Redis', 'HTML', 'CSS', 'Sass', 'Tailwind', 'Figma', 'Sketch'
];

const LOCATIONS = ['Remote', 'New York', 'San Francisco', 'London', 'Berlin', 'Austin', 'Boston', 'Seattle'];

function sampleTechs(n: number) {
  const out: string[] = [];
  const pool = [...TECHS];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

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
  return sampleTechs(4);
}
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Phone, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

const CandidateDetail = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [noteContent, setNoteContent] = useState("");
  
  const candidate = useLiveQuery(() => db.candidates.get(candidateId || ''));
  const timeline = useLiveQuery(() => 
    db.timeline.where('candidateId').equals(candidateId || '').reverse().toArray()
  );
  const notes = useLiveQuery(() => 
    db.notes.where('candidateId').equals(candidateId || '').reverse().toArray()
  );
  const job = useLiveQuery(async () => {
    if (!candidate) return null;
    return await db.jobs.get(candidate.jobId);
  }, [candidate]);

  // helpers for skills/location generation (same logic as Candidates list)
  const TECHS = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Python', 'Django', 'Flask',
    'Java', 'Spring', 'Go', 'Rust', 'C++', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Postgres', 'MySQL',
    'GraphQL', 'REST', 'Redis', 'HTML', 'CSS', 'Sass', 'Tailwind', 'Figma', 'Sketch'
  ];

  const LOCATIONS = ['Remote', 'New York', 'San Francisco', 'London', 'Berlin', 'Austin', 'Boston', 'Seattle'];

  function sampleTechs(n: number) {
    const out: string[] = [];
    const pool = [...TECHS];
    while (out.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

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
    return sampleTechs(4);
  }

  const [skills, setSkills] = useState<string[] | null>(null);
  const [appliedJobTitle, setAppliedJobTitle] = useState<string>('');
  const [appliedLocation, setAppliedLocation] = useState<string>('');

  // Ensure candidate has skills/appliedJobTitle/appliedLocation persisted when viewing detail
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let mounted = true;
    const ensure = async () => {
      if (!candidate) return;
      try {
        // load up-to-date job
        let j = await db.jobs.get(candidate.jobId);
        if (!j) {
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
          try { await db.jobs.add(newJob); j = newJob; } catch (e) { /* ignore */ }
        }

        const title = j?.title || candidate['appliedJobTitle'] || '';
        const location = j?.location || candidate['appliedLocation'] || LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

        type CandidateWithExtras = typeof candidate & { skills?: string[]; appliedJobTitle?: string; appliedLocation?: string };
        const candEx = candidate as CandidateWithExtras;
        let s: string[] | undefined = Array.isArray(candEx.skills) && candEx.skills.length ? candEx.skills : undefined;
        if (!s) {
          s = getSkillsForJobTitle(title || undefined);
          try {
            const candidatesTable = db.candidates as unknown as { update(key: string, changes: Record<string, unknown>): Promise<number> };
            await candidatesTable.update(candidate.id, { skills: s, appliedJobTitle: title, appliedLocation: location });
          } catch (e) { /* ignore */ }
        }

        if (!mounted) return;
        setSkills(s || null);
        setAppliedJobTitle(title || '');
        setAppliedLocation(location || '');
      } catch (e) {
        // ignore
      }
    };
    ensure();
    return () => { mounted = false; };
  }, [candidate]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleAddNote = async () => {
    if (!noteContent.trim() || !candidate) return;

    const mentions = noteContent.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
    
    await db.notes.add({
      id: `note-${Date.now()}`,
      candidateId: candidate.id,
      content: noteContent,
      mentions,
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    setNoteContent("");
    toast.success("Note added");
  };

  const renderNoteWithMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (!candidate) {
    return (
      <div className="p-8">
        <p>Candidate not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" onClick={() => navigate('/candidates')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Candidates
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">{candidate.name}</h1>
            <p className="text-muted-foreground">{appliedJobTitle || job?.title}</p>
            {appliedLocation && <p className="text-sm text-muted-foreground">{appliedLocation}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={async () => {
              if (!candidate) return;
              const url = (candidate as unknown as { resumeUrl?: string }).resumeUrl as string | undefined;
              if (url) {
                // mark as viewed in the DB
                try {
                  await db.candidates.update(candidate.id, { resumeViewed: true });
                } catch (e) { /* ignore */ }
                // open in a new tab/window
                window.open(url, '_blank', 'noopener,noreferrer');
                toast.success('Opening resume');
              } else {
                toast.error('No resume available');
              }
            }} disabled={!((candidate as unknown as { resumeUrl?: string }).resumeUrl)}>
              {((candidate as unknown as { resumeUrl?: string }).resumeUrl) ? 'View Resume' : 'No resume'}
            </Button>
            <Badge className="text-sm px-4 py-2 capitalize">
              {candidate.stage}
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${candidate.email}`} className="text-sm hover:underline">
                {candidate.email}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{candidate.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Applied {new Date(candidate.appliedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {((candidate as unknown as { resumeUrl?: string }).resumeUrl) ? (
                <a
                  href={(candidate as unknown as { resumeUrl?: string }).resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={async (e) => {
                    // ensure we mark as viewed when user opens the resume
                    try {
                      await db.candidates.update(candidate.id, { resumeViewed: true });
                    } catch (err) { /* ignore */ }
                  }}
                  className="text-sm hover:underline"
                >
                  Open resume
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No resume</span>
              )}
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Score</p>
              <p className="text-2xl font-bold">{candidate.score}/100</p>
            </div>
            {skills && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Skills</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map(sk => (
                    <Badge key={sk} className="bg-muted/10 text-muted-foreground">{sk}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline?.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4 pb-4 border-b last:border-0"
                >
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary"></div>
                  <div className="flex-1">
                    <p className="font-medium capitalize">{entry.stage}</p>
                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              placeholder="Add a note... Use @ to mention someone"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddNote} className="mt-2" disabled={!noteContent.trim()}>
              Add Note
            </Button>
          </div>

          <div className="space-y-3 mt-6">
            {notes?.map((note) => (
              <div key={note.id} className="p-4 rounded-lg bg-muted">
                <p className="text-sm">{renderNoteWithMentions(note.content)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDetail;
