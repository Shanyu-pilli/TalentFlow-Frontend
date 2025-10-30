import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { makeServer } from "./lib/mirage-server";
import { db } from '@/lib/db';
import { stripTrailingNumber } from '@/lib/utils';

if (import.meta.env.DEV) {
  makeServer();
}

// Normalize job titles in IndexedDB (strip trailing numeric suffixes) so
// older seeded data doesn't display numbers like "Marketing Manager 10".
(async function normalizeJobTitles() {
  try {
    const jobs = await db.jobs.toArray();
    await Promise.all(jobs.map(async (job) => {
      const stripped = stripTrailingNumber(job.title);
      if (stripped !== job.title) {
        await db.jobs.update(job.id, { title: stripped });
      }
    }));
  } catch (e) {
    // ignore errors in normalization
    // console.warn('job title normalization failed', e);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
