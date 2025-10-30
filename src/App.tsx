import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Navbar } from "@/components/Navbar";
import { useEffect } from "react";
import { db } from "@/lib/db";
import { seedDatabase } from "@/lib/seed-data";
import Dashboard from "./pages/Dashboard";
import DashboardV2 from "./pages/DashboardV2";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import JobEdit from "./pages/JobEdit";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import Assessments from "./pages/Assessments";
import AssessmentBuilder from "./pages/AssessmentBuilder";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    seedDatabase();
  }, []);

  // Apply stored theme preference on startup so CSS variables reflect the user's choice
  useEffect(() => {
    (async () => {
      try {
        const profile = await db.profile.get('user-1');
        const theme = profile?.theme ?? 'light';
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch (err) {
        // ignore errors - fallback to default
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                {/* Add top padding equal to navbar height (h-14) so fixed navbar doesn't overlap content */}
                <main className="flex-1 overflow-auto pt-14">
                  <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/dashboard-v2" element={<DashboardV2 />} />
                  <Route path="/jobs/:jobId" element={<JobDetail />} />
                  <Route path="/jobs/:jobId/edit" element={<JobEdit />} />
                  <Route path="/candidates" element={<Candidates />} />
                  <Route path="/candidates/:candidateId" element={<CandidateDetail />} />
                  <Route path="/assessments" element={<Assessments />} />
                  <Route path="/assessments/:jobId/builder" element={<AssessmentBuilder />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
