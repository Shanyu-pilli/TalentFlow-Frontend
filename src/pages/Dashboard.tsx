import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts";
import { Briefcase, Users, TrendingUp, Clock } from "lucide-react";
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import AnimatedNumber from '@/components/AnimatedNumber';
import { RecentActivity } from "@/components/RecentActivity";

const COLORS = {
  'applied': '#4287f5',  // Light blue
  'offer': '#ff47b6',    // Pink/magenta
  'screen': '#ffa340',   // Orange/amber
  'tech': '#47ff9e',     // Bright green
  'hired': '#2563eb',    // Blue
  'rejected': '#a855f7'  // Purple
};

const Dashboard = () => {
  const jobs = useLiveQuery(() => db.jobs.toArray());
  const candidates = useLiveQuery(() => db.candidates.toArray());

  // activeOpenings = total number of open positions across active job postings
  const activeOpenings = jobs?.reduce((total, job) => {
    const closeDate = job.closeDate ? new Date(job.closeDate).getTime() : undefined;
    const isClosedByDate = !!closeDate && closeDate <= Date.now();
    if (job.status === 'active' && !isClosedByDate) return total + (job.openings || 0);
    return total;
  }, 0) || 0;

  // activeJobsCount = number of active job postings (regardless of openings)
  const activeJobsCount = jobs?.filter(job => {
    const closeDate = job.closeDate ? new Date(job.closeDate).getTime() : undefined;
    const isClosedByDate = !!closeDate && closeDate <= Date.now();
    return job.status === 'active' && !isClosedByDate;
  }).length || 0;
  const totalCandidates = candidates?.length || 0;

  const stageData = candidates?.reduce((acc, candidate) => {
    const existing = acc.find(item => item.name === candidate.stage);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: candidate.stage, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  const departmentData = jobs?.reduce((acc, job) => {
    const closeDate = job.closeDate ? new Date(job.closeDate).getTime() : undefined;
    const isClosedByDate = !!closeDate && closeDate <= Date.now();
    // Exclude positions that are closed by date from department openings
    if (isClosedByDate) return acc;

    const existing = acc.find(item => item.name === job.department);
    if (existing) {
      existing.openings += job.openings;
    } else {
      acc.push({ name: job.department, openings: job.openings });
    }
    return acc;
  }, [] as { name: string; openings: number }[]) || [];

  // Compute max openings to scale Y axis for vertical bar chart
  const maxOpenings = departmentData.length > 0 ? departmentData.reduce((m, d) => Math.max(m, d.openings), 0) : 0;
  const yDomainMax = Math.ceil(Math.max(10, maxOpenings) / 5) * 5;

  const weeklyData = [
    { day: 'Mon', applications: 12, interviews: 8, offers: 2 },
    { day: 'Tue', applications: 19, interviews: 12, offers: 3 },
    { day: 'Wed', applications: 15, interviews: 10, offers: 4 },
    { day: 'Thu', applications: 25, interviews: 15, offers: 5 },
    { day: 'Fri', applications: 22, interviews: 14, offers: 3 },
    { day: 'Sat', applications: 8, interviews: 5, offers: 1 },
    { day: 'Sun', applications: 5, interviews: 3, offers: 1 },
  ];

  const assessmentResponses = useLiveQuery(() => db.assessmentResponses.toArray());
  const assessments = useLiveQuery(() => db.assessments.toArray());

  // Calculate average scores by skill category
  const calculateSkillScores = () => {
    if (!assessmentResponses || !assessments) return [];

    const skillCategories = {
      'Technical': { total: 0, count: 0 },
      'Communication': { total: 0, count: 0 },
      'Leadership': { total: 0, count: 0 },
      'Problem Solving': { total: 0, count: 0 },
      'Teamwork': { total: 0, count: 0 }
    };

    // Process each response
    assessmentResponses.forEach(response => {
      const assessment = assessments.find(a => a.id === response.jobId);
      if (!assessment) return;

      // Map sections to skill categories
      assessment.sections.forEach(section => {
        if (section.title in skillCategories) {
          const responses = response.responses as Record<string, number>;
          let sectionTotal = 0;
          let questionCount = 0;

          section.questions.forEach(question => {
            if (question.type === 'numeric' && responses[question.id]) {
              sectionTotal += responses[question.id];
              questionCount++;
            }
          });

          if (questionCount > 0) {
            skillCategories[section.title as keyof typeof skillCategories].total += (sectionTotal / questionCount);
            skillCategories[section.title as keyof typeof skillCategories].count++;
          }
        }
      });
    });

    // Calculate averages
    return Object.entries(skillCategories).map(([subject, data]) => ({
      subject,
      score: data.count > 0 ? Math.round(data.total / data.count) : 0
    }));
  };

  const performanceData = calculateSkillScores();

  // Calculate overall average score for stats
  const averageScore = performanceData.length > 0
    ? Math.round(performanceData.reduce((sum, item) => sum + item.score, 0) / performanceData.length)
    : 0;

  const stats = [
    { title: "Openings (active)", value: activeOpenings, subtitle: `${activeJobsCount} active job postings — total open positions across active listings`, icon: Briefcase, color: "text-sky-500" },
    { title: "Total Jobs", value: jobs?.length || 0, subtitle: `Total job postings in the system (includes active, closed, archived)`, icon: Briefcase, color: "text-slate-600" },
    { title: "Total Candidates", value: totalCandidates, subtitle: `All candidates in the system — new this week: +${Math.max(0, (totalCandidates || 0) - 0)}`, icon: Users, color: "text-slate-600" },
    { title: "Avg. Score", value: `${averageScore}%`, subtitle: `Average candidate assessment score across measured skill areas`, icon: TrendingUp, color: "text-emerald-600" },
    { title: "Time to Hire", value: "12d", subtitle: `Estimated average time from application to hire`, icon: Clock, color: "text-violet-600" },
  ];

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const pressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const LONG_PRESS_MS = 600; // threshold for long press
  const totalStageCount = stageData.reduce((s, item) => s + item.value, 0);

  // custom active shape to expand slice and display percentage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value,
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;

    const percentage = totalStageCount > 0 ? ((value / totalStageCount) * 100).toFixed(1) : '0.0';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pieLabel = (entry: any) => `${entry.name}`;

  // Custom tooltip for pie to show percentage near cursor (works better on mobile when tapped)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomPieTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length > 0) {
      const entry = payload[0].payload as { name: string; value: number };
      const pct = totalStageCount > 0 ? ((entry.value / totalStageCount) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-popover border shadow-md rounded-md p-2 text-sm">
          <div className="font-medium">{entry.name}</div>
          <div className="text-muted-foreground">{pct}% ({entry.value})</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your hiring.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.995 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold">
                    <AnimatedNumber value={typeof stat.value === 'number' ? stat.value : String(stat.value)} />
                  </div>
                  {stat.subtitle && <div className="text-sm text-muted-foreground">{stat.subtitle}</div>}
                </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Hiring Funnel Overview</CardTitle>
              <CardDescription>Applications, interviews, and offers over time</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Match height with Candidate Pipeline */}
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4287f5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4287f5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#47ff9e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#47ff9e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="applications" stroke="#4287f5" fillOpacity={1} fill="url(#colorApplications)" />
                  <Area type="monotone" dataKey="interviews" stroke="#a855f7" fillOpacity={1} fill="url(#colorInterviews)" />
                  <Area type="monotone" dataKey="offers" stroke="#47ff9e" fillOpacity={1} fill="url(#colorOffers)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Candidate Pipeline</CardTitle>
              <CardDescription>Distribution by stage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                      label={pieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    activeIndex={activeIndex ?? undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(data, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(data, index) => {
                      // navigate to candidates page filtered by stage
                      if (data && data.name) {
                        navigate(`/candidates?stage=${encodeURIComponent(data.name)}`);
                      }
                    }}
                  >
                    {stageData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip content={CustomPieTooltip} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend with labels + percentages always visible */}
              <div className="mt-3 flex flex-wrap gap-3">
                {stageData.map((entry, idx) => {
                  const pct = totalStageCount > 0 ? ((entry.value / totalStageCount) * 100).toFixed(1) : '0.0';
                  return (
                    <button
                      key={entry.name}
                      onClick={() => navigate(`/candidates?stage=${encodeURIComponent(entry.name)}`)}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <span className="inline-block w-3 h-3 rounded" style={{ background: COLORS[entry.name.toLowerCase() as keyof typeof COLORS] }} />
                      <span className="font-medium">{entry.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')}>Reset filter</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Skill Assessment Radar</CardTitle>
              <CardDescription>Average candidate performance across key areas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {/* Match RecentActivity height (h-[400px]) so both columns align visually.
                    Use chart-2 for a contrasting accent and increase stroke thickness for clarity. */}
                <RadarChart data={performanceData} outerRadius={140}>
                  <PolarGrid stroke="#4287f5" strokeWidth={1} strokeDasharray="3 3" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    className="text-xs" 
                    tick={{ fill: '#94a3b8' }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tickCount={5}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Radar
                    name="Performance"
                    dataKey="score"
                    stroke="#4287f5"
                    strokeWidth={2}
                    fill="#4287f5"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <RecentActivity />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Openings by Department</CardTitle>
            <CardDescription>Total positions available across teams</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={departmentData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <defs>
                  <linearGradient id="departmentGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} /> {/* Green */}
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.9} /> {/* Yellow */}
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis 
                  dataKey="name"
                  type="category"
                  className="text-sm font-medium"
                  interval={0}
                  tick={{ fontSize: 12 }}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  type="number" 
                  className="text-sm font-medium"
                  domain={[0, yDomainMax]}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border rounded-lg shadow-lg p-3">
                          <p className="font-medium text-base mb-1">{payload[0].payload.name}</p>
                          <p className="text-lg font-semibold text-success">
                            {payload[0].value} Open Positions
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  formatter={() => "Number of Open Positions"}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Bar 
                  name="Open Positions"
                  dataKey="openings" 
                  fill="url(#departmentGradient)"
                  radius={[0, 4, 4, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
