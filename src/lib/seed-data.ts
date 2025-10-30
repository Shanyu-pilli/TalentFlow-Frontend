import { db, Job, Candidate, UserProfile, Assessment, AssessmentSection } from './db';

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations', 'Data Science', 'Customer Success'];
const LOCATIONS = ['Remote', 'New York', 'San Francisco', 'London', 'Berlin', 'Singapore', 'Austin', 'Boston', 'Seattle'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const STAGES: Candidate['stage'][] = ['applied', 'screen', 'tech', 'offer', 'hired', 'rejected'];
const TAGS = ['urgent', 'senior', 'junior', 'remote-first', 'hybrid', 'leadership', 'technical', 'creative'];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Jamie', 'Avery', 'Quinn', 'Skyler',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
  'Michael', 'Daniel', 'Matthew', 'Jackson', 'Sebastian', 'Jack', 'Aiden', 'Owen', 'Samuel', 'David',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

const JOB_TITLES = [
  'Senior Frontend Engineer', 'Backend Developer', 'Full Stack Engineer', 'DevOps Engineer', 'Data Scientist',
  'Product Manager', 'Senior Product Manager', 'Product Designer', 'UX Designer', 'UX Researcher',
  'Marketing Manager', 'Content Marketing Specialist', 'SEO Specialist', 'Growth Marketing Manager',
  'Sales Development Representative', 'Account Executive', 'Customer Success Manager', 'Sales Engineer',
  'Engineering Manager', 'Technical Lead', 'Staff Engineer', 'Principal Engineer', 'Solutions Architect',
  'Data Analyst', 'Business Analyst', 'QA Engineer', 'Security Engineer', 'Mobile Developer',
];

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function seedDatabase() {
  const jobCount = await db.jobs.count();
  const candidateCount = await db.candidates.count();
  const profileCount = await db.profile.count();
  const assessmentCount = await db.assessments.count();

  // Seed 25+ jobs
  if (jobCount === 0) {
    const jobs: Job[] = [];
    const statuses: ('active' | 'draft' | 'archived')[] = ['active', 'active', 'active', 'draft', 'archived'];
    
    for (let i = 0; i < 28; i++) {
  const title = JOB_TITLES[i % JOB_TITLES.length];
      const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      const jobTags = [];
      
      // Add 1-3 random tags
      const numTags = Math.floor(Math.random() * 3) + 1;
      for (let t = 0; t < numTags; t++) {
        const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
        if (!jobTags.includes(tag)) jobTags.push(tag);
      }

      const daysAgo = Math.random() * 90;
      const openDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const hasCloseDate = Math.random() > 0.7;
      const closeDate = hasCloseDate ? new Date(openDate.getTime() + (30 + Math.random() * 60) * 24 * 60 * 60 * 1000) : undefined;
      
      // Use the base job title for display (no numeric suffix). Keep slug unique by including the index.
      jobs.push({
        id: `job-${i + 1}`,
        title: title,
        slug: generateSlug(`${title}-${i + 1}`),
        department,
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        type: JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)],
        status: statuses[i % statuses.length],
        tags: jobTags,
        openings: Math.floor(Math.random() * 5) + 1,
        order: i,
        openDate,
        closeDate,
        createdAt: openDate,
        updatedAt: new Date(),
      });
    }

    await db.jobs.bulkAdd(jobs);
  }

  // Seed 1000+ candidates
  if (candidateCount === 0) {
    const candidates: Candidate[] = [];
    const jobs = await db.jobs.toArray();

    for (let i = 0; i < 1200; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const job = jobs[Math.floor(Math.random() * jobs.length)];

      // Simulate whether the candidate uploaded a resume. If they did, point to a demo file under /public.
      const hasResume = Math.random() > 0.5;
      candidates.push({
        id: `candidate-${i + 1}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 400 ? i : ''}@example.com`,
        phone: `+1 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        jobId: job.id,
        stage: STAGES[Math.floor(Math.random() * STAGES.length)],
        score: Math.floor(Math.random() * 100),
        // If the candidate has a resume, set a demo URL (placeholder.svg in /public is used for demo)
        resumeUrl: hasResume ? '/placeholder.svg' : undefined,
        // resumeViewed is only true if a resume exists and we randomly mark it viewed
        resumeViewed: hasResume ? Math.random() > 0.5 : false,
        appliedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }

    await db.candidates.bulkAdd(candidates);

    // Add timeline entries for first 100 candidates
    const timelineEntries = [];
    for (let i = 0; i < 100; i++) {
      const candidateId = `candidate-${i + 1}`;
      const numEntries = Math.floor(Math.random() * 4) + 1;
      
      for (let j = 0; j < numEntries; j++) {
        timelineEntries.push({
          id: `timeline-${i}-${j}`,
          candidateId,
          stage: STAGES[Math.min(j, STAGES.length - 1)],
          timestamp: new Date(Date.now() - (numEntries - j) * 7 * 24 * 60 * 60 * 1000),
          note: j === 0 ? 'Application submitted' : `Moved to ${STAGES[Math.min(j, STAGES.length - 1)]}`,
        });
      }
    }

    await db.timeline.bulkAdd(timelineEntries);
  }

  // Seed profile
  if (profileCount === 0) {
    const profile: UserProfile = {
      id: 'user-1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@talentflow.app',
      role: 'Hiring Manager',
      theme: 'light',
      createdAt: new Date(),
    };

    await db.profile.add(profile);
  }

  // Seed sample notifications
  const notifCount = await db.notifications.count();
  if (notifCount === 0) {
    const now = new Date();
    await db.notifications.bulkAdd([
      { id: 'notif-1', title: 'New candidate applied', body: 'A candidate applied to Senior Frontend Engineer', createdAt: new Date(now.getTime() - 1000 * 60 * 60), read: false, relatedId: 'job-1' },
      { id: 'notif-2', title: 'Assessment submitted', body: 'Assessment submitted for Product Designer', createdAt: new Date(now.getTime() - 1000 * 60 * 30), read: false, relatedId: 'job-2' },
      { id: 'notif-3', title: 'Job expiring soon', body: 'Job posting for Marketing Manager is expiring in 2 days', createdAt: new Date(now.getTime() - 1000 * 60 * 5), read: false, relatedId: 'job-3' },
    ]);
  }

  // Seed 3 sample assessments
  if (assessmentCount === 0) {
    const jobs = await db.jobs.toArray();
    const sampleJobs = jobs.slice(0, 3);

    for (const job of sampleJobs) {
      const sections: AssessmentSection[] = [
        {
          id: 'section-1',
          title: 'Background & Experience',
          questions: [
            {
              id: 'q1',
              type: 'short-text',
              question: 'What is your current job title?',
              required: true,
              maxLength: 100,
            },
            {
              id: 'q2',
              type: 'numeric',
              question: 'How many years of experience do you have in this field?',
              required: true,
              minValue: 0,
              maxValue: 50,
            },
            {
              id: 'q3',
              type: 'single',
              question: 'Are you currently employed?',
              options: ['Yes', 'No'],
              required: true,
            },
            {
              id: 'q4',
              type: 'long-text',
              question: 'If yes, why are you looking for a new role?',
              maxLength: 500,
              conditionalOn: {
                questionId: 'q3',
                value: 'Yes',
              },
            },
          ],
        },
        {
          id: 'section-2',
          title: 'Technical Skills',
          questions: [
            {
              id: 'q5',
              type: 'multi',
              question: 'Which programming languages are you proficient in? (Select all that apply)',
              options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'Other'],
              required: true,
            },
            {
              id: 'q6',
              type: 'single',
              question: 'What is your preferred development environment?',
              options: ['VS Code', 'IntelliJ IDEA', 'Vim/Neovim', 'Sublime Text', 'Other'],
              required: false,
            },
            {
              id: 'q7',
              type: 'file',
              question: 'Upload your resume (PDF format)',
              required: true,
            },
          ],
        },
        {
          id: 'section-3',
          title: 'Behavioral Questions',
          questions: [
            {
              id: 'q8',
              type: 'long-text',
              question: 'Describe a challenging project you worked on and how you overcame obstacles.',
              required: true,
              maxLength: 1000,
            },
            {
              id: 'q9',
              type: 'long-text',
              question: 'How do you handle disagreements with team members?',
              required: true,
              maxLength: 500,
            },
            {
              id: 'q10',
              type: 'single',
              question: 'Do you prefer working independently or in a team?',
              options: ['Independently', 'In a team', 'Both equally', 'It depends on the project'],
              required: true,
            },
          ],
        },
      ];

      await db.assessments.add({
        id: `assessment-${job.id}`,
        jobId: job.id,
        sections,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}
