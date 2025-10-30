import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { makeServer } from "./lib/mirage-server";
import { db } from '@/lib/db';
import { stripTrailingNumber } from '@/lib/utils';

// Start the Mirage in-browser mock server for demo deployments as well
// so the app continues to function when there's no real backend (e.g. Vercel preview).
// For real production applications you may want to conditionally enable this.
try {
  makeServer();
} catch (e) {
  // If Mirage fails to initialize, ignore and allow errors to surface when APIs are called.
  // This is intentionally non-fatal for hosting environments where IndexedDB may be restricted.
  // console.warn('Mirage server failed to initialize', e);
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
