import { createServer, Model, Response } from 'miragejs';
import { db } from './db';

const LATENCY_MIN = 200;
const LATENCY_MAX = 1200;
const ERROR_RATE = 0.08; // 8% error rate on writes

const randomDelay = () => Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN)) + LATENCY_MIN;
const shouldError = () => Math.random() < ERROR_RATE;

export function makeServer() {
  return createServer({
    models: {
      job: Model,
      candidate: Model,
      assessment: Model,
    },

    routes() {
      this.namespace = 'api';
      this.timing = randomDelay();

      // Jobs endpoints
      this.get('/jobs', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        
        const searchParam = request.queryParams.search;
        const statusParam = request.queryParams.status;
        const pageParam = request.queryParams.page;
        const pageSizeParam = request.queryParams.pageSize;
        const sortParam = request.queryParams.sort;
        
        const search = Array.isArray(searchParam) ? searchParam[0] : searchParam || '';
        const status = Array.isArray(statusParam) ? statusParam[0] : statusParam || '';
        const page = Array.isArray(pageParam) ? pageParam[0] : pageParam || '1';
        const pageSize = Array.isArray(pageSizeParam) ? pageSizeParam[0] : pageSizeParam || '10';
        const sort = Array.isArray(sortParam) ? sortParam[0] : sortParam || 'createdAt';
        
        let jobs = await db.jobs.toArray();
        
        if (search) {
          jobs = jobs.filter(j => 
            j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
          );
        }
        
        if (status && status !== 'all') {
          jobs = jobs.filter(j => j.status === status);
        }
        
        // Sort
        jobs.sort((a, b) => {
          if (sort === 'order') return a.order - b.order;
          if (sort === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return 0;
        });
        
        const pageNum = parseInt(page);
        const size = parseInt(pageSize);
        const start = (pageNum - 1) * size;
        const paginatedJobs = jobs.slice(start, start + size);
        
        return {
          data: paginatedJobs,
          meta: {
            total: jobs.length,
            page: pageNum,
            pageSize: size,
            totalPages: Math.ceil(jobs.length / size),
          },
        };
      });

      this.get('/jobs/:id', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        const job = await db.jobs.get(request.params.id);
        return job || new Response(404, {}, { error: 'Job not found' });
      });

      this.post('/jobs', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        const attrs = JSON.parse(request.requestBody);
        const job = {
          ...attrs,
          id: `job-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.jobs.add(job);
        return job;
      });

      this.patch('/jobs/:id', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        const attrs = JSON.parse(request.requestBody);
        await db.jobs.update(request.params.id, { ...attrs, updatedAt: new Date() });
        return await db.jobs.get(request.params.id);
      });

      this.delete('/jobs/:id', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        await db.jobs.delete(request.params.id);
        return { success: true };
      });

      this.patch('/jobs/:id/reorder', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Reorder failed - simulated error' });
        }
        
        const { fromOrder, toOrder } = JSON.parse(request.requestBody);
        const jobs = await db.jobs.toArray();
        
        // Reorder logic
        const jobToMove = jobs.find(j => j.order === fromOrder);
        if (!jobToMove) return new Response(404, {}, { error: 'Job not found' });
        
        if (fromOrder < toOrder) {
          await Promise.all(
            jobs.filter(j => j.order > fromOrder && j.order <= toOrder)
              .map(j => db.jobs.update(j.id, { order: j.order - 1 }))
          );
        } else {
          await Promise.all(
            jobs.filter(j => j.order >= toOrder && j.order < fromOrder)
              .map(j => db.jobs.update(j.id, { order: j.order + 1 }))
          );
        }
        
        await db.jobs.update(jobToMove.id, { order: toOrder });
        return { success: true };
      });

      // Candidates endpoints
      this.get('/candidates', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        
        const searchParam = request.queryParams.search;
        const stageParam = request.queryParams.stage;
        const pageParam = request.queryParams.page;
        const pageSizeParam = request.queryParams.pageSize;
        
        const search = Array.isArray(searchParam) ? searchParam[0] : searchParam || '';
        const stage = Array.isArray(stageParam) ? stageParam[0] : stageParam || '';
  const page = Array.isArray(pageParam) ? pageParam[0] : pageParam || '1';
  const pageSize = Array.isArray(pageSizeParam) ? pageSizeParam[0] : pageSizeParam || '50';
  const jobParam = request.queryParams.job;

  const job = Array.isArray(jobParam) ? jobParam[0] : jobParam || '';
        
        let candidates = await db.candidates.toArray();
        
        if (search) {
          candidates = candidates.filter(c => 
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        if (stage && stage !== 'all') {
          candidates = candidates.filter(c => c.stage === stage);
        }

        // Filter by job id when provided (matches client ?job=<jobId>)
        if (job && job !== 'all') {
          candidates = candidates.filter(c => c.jobId === job);
        }
        
        const pageNum = parseInt(page);
        const size = parseInt(pageSize);
        const start = (pageNum - 1) * size;
        const paginatedCandidates = candidates.slice(start, start + size);
        
        return {
          data: paginatedCandidates,
          meta: {
            total: candidates.length,
            page: pageNum,
            pageSize: size,
            totalPages: Math.ceil(candidates.length / size),
          },
        };
      });

      this.get('/candidates/:id', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        const candidate = await db.candidates.get(request.params.id);
        return candidate || new Response(404, {}, { error: 'Candidate not found' });
      });

      this.get('/candidates/:id/timeline', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        const timeline = await db.timeline.where('candidateId').equals(request.params.id).toArray();
        return timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });

      this.post('/candidates', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        const attrs = JSON.parse(request.requestBody);
        const candidate = {
          ...attrs,
          id: `candidate-${Date.now()}`,
          appliedAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.candidates.add(candidate);
        
        // Add timeline entry
        await db.timeline.add({
          id: `timeline-${Date.now()}`,
          candidateId: candidate.id,
          stage: candidate.stage,
          timestamp: new Date(),
          note: 'Application submitted',
        });
        
        return candidate;
      });

      this.patch('/candidates/:id', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        const attrs = JSON.parse(request.requestBody);
        const candidate = await db.candidates.get(request.params.id);
        
        if (attrs.stage && attrs.stage !== candidate?.stage) {
          await db.timeline.add({
            id: `timeline-${Date.now()}`,
            candidateId: request.params.id,
            stage: attrs.stage,
            previousStage: candidate?.stage, // store the stage they're moving from
            timestamp: new Date(),
            note: `Stage change: ${candidate?.stage} → ${attrs.stage}`,
          });
        }
        
        await db.candidates.update(request.params.id, { ...attrs, updatedAt: new Date() });
        return await db.candidates.get(request.params.id);
      });

      // Assessments endpoints
      this.get('/assessments/:jobId', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        const assessment = await db.assessments.where('jobId').equals(request.params.jobId).first();
        return assessment || { jobId: request.params.jobId, sections: [] };
      });

      this.put('/assessments/:jobId', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        const attrs = JSON.parse(request.requestBody);
        const existing = await db.assessments.where('jobId').equals(request.params.jobId).first();
        
        if (existing) {
          await db.assessments.update(existing.id, { ...attrs, updatedAt: new Date() });
          return await db.assessments.get(existing.id);
        } else {
          const assessment = {
            ...attrs,
            id: `assessment-${Date.now()}`,
            jobId: request.params.jobId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await db.assessments.add(assessment);
          return assessment;
        }
      });

      this.post('/assessments/:jobId/submit', async (schema, request) => {
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
        if (shouldError()) {
          return new Response(500, {}, { error: 'Internal server error' });
        }
        
        const response = JSON.parse(request.requestBody);
        const submission = {
          id: `submission-${Date.now()}`,
          jobId: request.params.jobId,
          candidateId: response.candidateId,
          responses: response.responses,
          submittedAt: new Date(),
        };
        
        await db.assessmentResponses.add(submission);
        return submission;
      });
    },
  });
}
