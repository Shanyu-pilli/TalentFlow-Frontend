import Dexie, { Table } from 'dexie';

export interface Job {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  type: string;
  status: 'active' | 'draft' | 'archived' | 'closed';
  tags: string[];
  openings: number;
  order: number;
  openDate: Date;
  closeDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  stage: 'applied' | 'screen' | 'tech' | 'offer' | 'hired' | 'rejected';
  score: number;
  // Whether the resume has been viewed in the UI
  resumeViewed: boolean;
  // Optional URL to the uploaded resume (demo apps store files under /public or remote URLs)
  resumeUrl?: string;
  appliedAt: Date;
  updatedAt: Date;
}

export interface TimelineEntry {
  id: string;
  candidateId: string;
  stage: string;
  timestamp: Date;
  note: string;
  previousStage?: string; // track where they moved from
}

export interface Note {
  id: string;
  candidateId: string;
  content: string;
  mentions: string[];
  createdBy: string;
  createdAt: Date;
}

export interface Assessment {
  id: string;
  jobId: string;
  sections: AssessmentSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentSection {
  id: string;
  title: string;
  questions: Question[];
}

export interface Question {
  id: string;
  type: 'single' | 'multi' | 'short-text' | 'long-text' | 'numeric' | 'file';
  question: string;
  options?: string[];
  required?: boolean;
  minValue?: number;
  maxValue?: number;
  maxLength?: number;
  conditionalOn?: {
    questionId: string;
    value: string;
  };
}

export interface AssessmentResponse {
  id: string;
  jobId: string;
  candidateId: string;
  responses: Record<string, unknown>;
  submittedAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  theme: 'light' | 'dark';
  createdAt: Date;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  createdAt: Date;
  read?: boolean;
  relatedId?: string; // optional related job/candidate id
}

export interface HiddenActivity {
  id: string;
  hiddenAt: Date;
}

export class TalentFlowDB extends Dexie {
  jobs!: Table<Job>;
  candidates!: Table<Candidate>;
  timeline!: Table<TimelineEntry>;
  notes!: Table<Note>;
  assessments!: Table<Assessment>;
  assessmentResponses!: Table<AssessmentResponse>;
  notifications!: Table<Notification>;
  hiddenActivities!: Table<HiddenActivity>;
  profile!: Table<UserProfile>;

  constructor() {
    super('TalentFlowDB');
    this.version(5).stores({
      jobs: 'id, title, status, order, createdAt, openDate, closeDate',
      candidates: 'id, jobId, stage, name, email, resumeViewed, appliedAt',
      timeline: 'id, candidateId, timestamp',
      notes: 'id, candidateId, createdAt',
      assessments: 'id, jobId',
      assessmentResponses: 'id, jobId, candidateId',
      notifications: 'id, createdAt, read',
      hiddenActivities: 'id, hiddenAt',
      profile: 'id',
    });
  }
}

export const db = new TalentFlowDB();
