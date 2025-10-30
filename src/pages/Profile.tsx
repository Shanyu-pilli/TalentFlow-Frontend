import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Download, Bell, Lock, Activity, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Notification } from '@/lib/db';
import { useCallback } from 'react';

function NotificationHistory() {
  const readNotifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray(), []);
  const onlyRead = readNotifications ? readNotifications.filter(n => n.read) : [];

  const removeOne = useCallback(async (id: string) => {
    await db.notifications.delete(id);
  }, []);

  const clearAll = useCallback(async () => {
    const all = await db.notifications.toArray();
    const read = all.filter(n => n.read);
    await Promise.all(read.map(r => db.notifications.delete(r.id)));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Showing read notifications</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearAll}>Clear history</Button>
        </div>
      </div>

      {onlyRead.length === 0 ? (
        <div className="text-sm text-muted-foreground">No read notifications</div>
      ) : (
        <div className="space-y-2">
          {onlyRead.map(n => (
            <div key={n.id} className="flex items-start justify-between gap-4 p-3 border rounded-md">
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={() => removeOne(n.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Profile = () => {
  const [profile, setProfile] = useState({
    name: "Alex Johnson",
    email: "alex.johnson@company.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    role: "HR Manager",
    department: "Human Resources",
    joinedDate: "January 2023",
    avatar: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    candidateUpdates: true,
    jobApplications: true,
    assessmentSubmissions: false,
  });

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully!");
  };

  const handleExportData = () => {
    toast.success("Exporting your data...");
  };

  const navigate = useNavigate();

  const handleLogout = async () => {
    // Basic confirmation
    const ok = window.confirm("Are you sure you want to log out? This will clear your local profile and view state.");
    if (!ok) return;

    try {
      // Clear the stored user profile
      await db.profile.clear();

      // Optionally clear notifications and other ephemeral data used for the demo
      try { await Promise.all([db.notifications.clear(), db.hiddenActivities.clear()]); } catch (e) { /* ignore if tables missing */ }

      // Clear session/local view state so user sees the initial seed state next time
      try { sessionStorage.clear(); } catch (e) { /* noop */ }
      try { localStorage.removeItem('dashboardTopN'); } catch (e) { /* noop */ }

      toast.success("Logged out — redirecting to the home page...");

      // Redirect to home and refresh so the app re-seeds / shows initial state
      navigate('/');
      // small delay then reload to ensure DB re-seed on fresh session
      setTimeout(() => window.location.reload(), 150);
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Logout failed — please try again');
    }
  };

  const activities = [
    { action: "Created new job posting", job: "Senior React Developer", time: "2 hours ago" },
    { action: "Reviewed candidate", candidate: "Sarah Chen", time: "5 hours ago" },
    { action: "Updated assessment", job: "Product Manager", time: "1 day ago" },
    { action: "Moved candidate to offer stage", candidate: "Mike Ross", time: "2 days ago" },
    { action: "Archived job posting", job: "Junior Designer", time: "3 days ago" },
  ];

  // Live stats from Dexie (useLiveQuery will re-run when the DB changes)
  const totalCandidates = useLiveQuery(() => db.candidates.count(), []);
  const activeJobsCount = useLiveQuery(() => db.jobs.where('status').equals('active').count(), []);
  const totalAssessments = useLiveQuery(() => db.assessments.count(), []);
  const thisMonthCount = useLiveQuery(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    // candidates.appliedAt is stored as Date objects in the demo seed data
    return db.candidates.where('appliedAt').above(since).count();
  }, []);

  const stats = [
    { label: "Active Jobs", value: activeJobsCount ?? '—', icon: Briefcase },
    { label: "Total Candidates", value: typeof totalCandidates === 'number' ? totalCandidates.toLocaleString() : '—', icon: User },
    { label: "This Month", value: thisMonthCount ?? '—', icon: Calendar },
    { label: "Assessments", value: totalAssessments ?? '—', icon: Activity },
  ];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-2xl">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">Change Avatar</Button>
                  <p className="text-sm text-muted-foreground">JPG, PNG or GIF (MAX. 800x800px)</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  Member since {profile.joinedDate}
                </div>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <Label>Email Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Receive email updates about your activity</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Candidate Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified when candidates progress through stages</p>
                </div>
                <Switch
                  checked={notifications.candidateUpdates}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, candidateUpdates: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Job Applications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts for new job applications</p>
                </div>
                <Switch
                  checked={notifications.jobApplications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, jobApplications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Assessment Submissions</Label>
                  <p className="text-sm text-muted-foreground">Get notified when candidates complete assessments</p>
                </div>
                <Switch
                  checked={notifications.assessmentSubmissions}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, assessmentSubmissions: checked })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => toast.success("Notification preferences saved!")}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>Read notifications are stored here.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationHistory />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="current-password" type="password" className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="new-password" type="password" className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-password" type="password" className="pl-10" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => toast.success("Password updated successfully!")}>
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent actions in the system</CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.job && <Badge variant="outline" className="mr-2">{activity.job}</Badge>}
                        {activity.candidate && <Badge variant="outline" className="mr-2">{activity.candidate}</Badge>}
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
