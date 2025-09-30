// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/common/Sidebar.jsx";

/* --- Pages --- */
import JobsPage from "./pages/JobsPage.jsx";
import JobDetailsRoute from "./pages/JobDetailsRoute.jsx";
import CandidatesPage from "./pages/CandidatesPage.jsx";
import CandidatePage from "./pages/CandidatePage.jsx";
import AssessmentsPage from "./pages/AssessmentsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RecentJobsPage from "./pages/RecentJobsPage.jsx";
import NewJobPage from "./pages/NewJobPage.jsx";
import ApplyPage from "./pages/ApplyPage.jsx";
import RunAssessmentPage from "./pages/RunAssessmentPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";
import JobSeekerDashboard from "./pages/JobSeekerDashboard.jsx";
import JobseekerApplications from "./pages/JobseekerApplications.jsx";
import SavedJobs from "./pages/SavedJobs.jsx";
import Interviews from "./pages/Interviews.jsx";
import JobseekerMessages from "./pages/JobseekerMessages.jsx";

/* --- Header Copy Helpers --- */
function useRecruiterHeaderCopy(pathname) {
  if (pathname.startsWith("/hr/jobs/new"))
    return { title: "Create Job", subtitle: "Create new opportunities to attract top talent." };
  if (pathname.startsWith("/hr/jobs"))
    return { title: "Jobs", subtitle: "Organize open positions and streamline hiring." };
  if (pathname.startsWith("/hr/candidates"))
    return { title: "Candidates", subtitle: "Track and shortlist applicants." };
  if (pathname.startsWith("/hr/assessments"))
    return { title: "Assessments", subtitle: "Review assessments for the best fit." };
  if (pathname.startsWith("/hr/dashboard/recent-jobs"))
    return { title: "Latest Job Postings", subtitle: "Monitor recent openings in real time." };
  return { title: "Dashboard", subtitle: "Overview of your hiring pipeline." };
}

function useJobseekerHeaderCopy(pathname) {
  if (pathname.startsWith("/jobseeker/find-jobs"))
    return { title: "Find Jobs", subtitle: "Browse openings that match your skills." };
  if (pathname.startsWith("/jobseeker/apply/"))
    return { title: "Apply to Job", subtitle: "Submit your best application." };
  if (pathname.startsWith("/jobseeker/assessments"))
    return { title: "Assessments", subtitle: "Complete assessments to stand out." };
  if (pathname.startsWith("/jobseeker/applications"))
    return { title: "My Applications", subtitle: "Track your application progress." };
  if (pathname.startsWith("/jobseeker/saved"))
    return { title: "Saved Jobs", subtitle: "View jobs you bookmarked." };
  if (pathname.startsWith("/jobseeker/interviews"))
    return { title: "Interviews", subtitle: "Track upcoming and past interviews." };
  if (pathname.startsWith("/jobseeker/messages"))
    return { title: "Messages", subtitle: "Messages from recruiters." };
  return { title: "Welcome back!", subtitle: "Your job search overview." };
}

/* --- Root App Component --- */
export default function App() {
  const location = useLocation();
  const pathname = location.pathname;

  /* --- Theme --- */
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("darkMode");
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    document.body.classList.toggle("dark-mode", isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  /* --- Notifications --- */
  const [showNotifications, setShowNotifications] = useState(false);

  const recruiterNotifications = [
    { id: "hr-1", title: "New Job Application", unread: true },
    { id: "hr-2", title: "Assessment Completed", unread: true },
    { id: "hr-3", title: "Interview Scheduled", unread: true },
    { id: "hr-4", title: "Job Published", unread: false },
    { id: "hr-5", title: "New Message", unread: false },
    { id: "hr-6", title: "Reminder", unread: false },
    { id: "hr-7", title: "System Update", unread: false },
  ];

  const jobseekerNotifications = [
    { id: "js-1", title: "Recruiter Message", unread: true },
    { id: "js-2", title: "Interview Confirmed", unread: true },
    { id: "js-3", title: "Application Viewed", unread: true },
    { id: "js-4", title: "Assessment Invitation", unread: false },
    { id: "js-5", title: "Reminder", unread: false },
    { id: "js-6", title: "Profile Tip", unread: false },
  ];

  const isRecruiterRoute = pathname.startsWith("/hr");
  const isJobseekerRoute = pathname.startsWith("/jobseeker");

  // Notifications state
  const [notifications, setNotifications] = useState(
    isJobseekerRoute ? jobseekerNotifications : recruiterNotifications
  );

  // Update notifications when route changes
  useEffect(() => {
    setNotifications(isJobseekerRoute ? jobseekerNotifications : recruiterNotifications);
  }, [isJobseekerRoute, isRecruiterRoute]);

  // Compute unread count
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Mark all notifications as read when opening panel
  const handleToggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    if (!showNotifications) {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    }
  };

  /* --- Fullscreen Pages --- */
  const fullscreenPages = ["/intro", "/welcome"];
  const isFullscreen = fullscreenPages.includes(pathname) || pathname.includes("/assessments/run/");

  useEffect(() => {
    document.body.classList.toggle("dark-mode", !isFullscreen && isDarkMode);
    document.documentElement.classList.toggle("dark", !isFullscreen && isDarkMode);
  }, [isFullscreen, isDarkMode]);

  if (isFullscreen) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<LandingPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/assessments/run/:id" element={<RunAssessmentPage />} />
        <Route path="/hr/assessments/run/:id" element={<RunAssessmentPage />} />
        <Route path="/jobseeker/assessments/run/:id" element={<RunAssessmentPage />} />
        <Route path="*" element={<Navigate to="/intro" replace />} />
      </Routes>
    );
  }

  /* --- Header Buttons --- */
  const DarkModeButton = (
    <button
      onClick={() => setIsDarkMode((prev) => !prev)}
      className={`p-2 rounded-lg ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? "🌙" : "☀️"}
    </button>
  );

  const NotificationsButton = (
    <button
      onClick={handleToggleNotifications}
      className="relative p-2 rounded-lg text-slate-500"
      aria-label="Notifications"
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
          {unreadCount}
        </span>
      )}
    </button>
  );

  const recruiterHeader = useRecruiterHeaderCopy(pathname);
  const jobseekerHeader = useJobseekerHeaderCopy(pathname);

  /* --- Layout --- */
  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-slate-50"}`}>
      <Sidebar darkMode={isDarkMode} />

      <div className="lg:pl-64 min-h-screen">
        {/* Header */}
        <header className={`sticky top-0 z-30 backdrop-blur border-b shadow-sm ${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
          <div className="max-w-6xl mx-auto flex items-center gap-3 pl-16 pr-4 py-5 lg:px-6">
            <div className="flex-1">
              <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                {isJobseekerRoute ? jobseekerHeader.title : recruiterHeader.title}
              </div>
              {((isJobseekerRoute ? jobseekerHeader.subtitle : recruiterHeader.subtitle)) && (
                <div className={`text-sm mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {isJobseekerRoute ? jobseekerHeader.subtitle : recruiterHeader.subtitle}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {DarkModeButton}
              {NotificationsButton}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold ${isJobseekerRoute ? "bg-emerald-600" : "bg-indigo-600"}`}>
                {isJobseekerRoute ? "JS" : "HR"}
              </div>
            </div>
          </div>
        </header>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className={`absolute right-6 top-20 w-80 max-h-96 overflow-y-auto bg-white border rounded shadow-lg z-50 p-3 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : ""}`}>
            <h4 className="font-semibold mb-2">Notifications</h4>
            {notifications.length === 0 ? (
              <div className="text-sm text-slate-500">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-2 rounded mb-1 ${n.unread ? "bg-indigo-100/50 dark:bg-indigo-600/50" : ""}`}>
                  {n.title}
                </div>
              ))
            )}
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-6">
          <Routes>
            {/* Landing */}
            <Route path="/" element={<Navigate to="/intro" replace />} />

            {/* Recruiter Routes */}
            <Route path="/hr/dashboard" element={<DashboardPage />} />
            <Route path="/hr/dashboard/recent-jobs" element={<RecentJobsPage />} />
            <Route path="/hr/jobs" element={<JobsPage />} />
            <Route path="/hr/jobs/new" element={<NewJobPage />} />
            <Route path="/hr/jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/hr/candidates" element={<CandidatesPage />} />
            <Route path="/hr/candidates/:id" element={<CandidatePage />} />
            <Route path="/hr/assessments" element={<AssessmentsPage />} />

            {/* Jobseeker Routes */}
            <Route path="/jobseeker" element={<JobSeekerDashboard />} />
            <Route path="/jobseeker/find-jobs" element={<JobsPage />} />
            <Route path="/jobseeker/find-jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/jobseeker/jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/jobseeker/assessments" element={<AssessmentsPage />} />
            <Route path="/jobseeker/apply/:id" element={<ApplyPage />} />
            <Route path="/jobseeker/applications" element={<JobseekerApplications darkMode={isDarkMode} />} />
            <Route path="/jobseeker/saved" element={<SavedJobs darkMode={isDarkMode} />} />
            <Route path="/jobseeker/interviews" element={<Interviews darkMode={isDarkMode} />} />
            <Route path="/jobseeker/messages" element={<JobseekerMessages darkMode={isDarkMode} />} />

            {/* Generic/Backward Routes */}
            <Route path="/jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/dashboard" element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/jobseeker/jobs" element={<Navigate to="/jobseeker/find-jobs" replace />} />
            <Route path="/jobs" element={<Navigate to="/hr/jobs" replace />} />
            <Route path="/jobs/new" element={<Navigate to="/hr/jobs/new" replace />} />
            <Route path="/candidates" element={<Navigate to="/hr/candidates" replace />} />
            <Route path="/candidates/:id" element={<Navigate to="/hr/candidates/:id" replace />} />
            <Route path="/assessments" element={<Navigate to="/hr/assessments" replace />} />
            <Route path="/apply/:id" element={<Navigate to="/jobseeker/apply/:id" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
