// src/App.jsx
// NOTE: EXPORT/COMPONENT NAME REMAINS `App`
// ALL COMMENTS DESCRIBE RUNTIME BEHAVIOR ONLY — NO IMPLEMENTATION SECRETS OR PROPRIETARY DETAILS

import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { startMSW } from "./api/msw/browser.js";

import Sidebar from "./components/common/Sidebar.jsx";

/*PAGE ROUTE COMPONENTS (LAZY SPLITTING CAN BE ADDED LATER) */
import JobsPage from "./pages/JobsPage.jsx";
import JobDetailsRoute from "./pages/JobDetailsRoute.jsx";
import CandidatesPage from "./pages/CandidatesPage.jsx";
import CandidateProfileRoute from "./pages/CandidateProfileRoute";
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
import JobseekerMessages from "./pages/JobseekerMessages";

/*  TITLE HELPERS CHOOSE A PAGE HEADER TITLE/SUBTITLE BASED ON THE CURRENT ROUTE.
 * THEY RUN ON EACH LOCATION CHANGE VIA `useLocation()`.*/
function useRecruiterHeaderCopy() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/hr/jobs/new"))
    return {
      title: "Create Job",
      subtitle:
        "This is my platform where I'm creating new job opportunities to attract top talent.",
    };

  if (pathname.startsWith("/hr/jobs"))
    return {
      title: "Jobs",
      subtitle: "Organize your open positions and streamline hiring.",
    };

  if (pathname.startsWith("/hr/candidates"))
    return {
      title: "Candidates",
      subtitle: "View, track, and shortlist applicants across all jobs.",
    };

  if (pathname.startsWith("/hr/assessments"))
    return {
      title: "Assessments",
      subtitle: "Create and review assessments to identify the best fit.",
    };

  if (pathname.startsWith("/hr/dashboard/recent-jobs"))
    return {
      title: "Latest Job Postings",
      subtitle:
        "Track the most recent openings and monitor their performance in real time.",
    };

  return {
    title: "Dashboard",
    subtitle:
      "Welcome back! Here's what's happening with your hiring pipeline.",
  };
}

function useJobseekerHeaderCopy() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/jobseeker/find-jobs"))
    return {
      title: "Find Jobs",
      subtitle: "Browse openings that match your skills and interests.",
    };

  if (pathname.startsWith("/jobseeker/apply/"))
    return {
      title: "Apply to Job",
      subtitle: "Review the job details and submit your best application.",
    };

  if (pathname.startsWith("/jobseeker/assessments"))
    return {
      title: "Assessments",
      subtitle: "Take and review assessments to stand out.",
    };

  if (pathname.startsWith("/jobseeker/applications"))
    return {
      title: "My Applications",
      subtitle: "Track statuses, timelines, and next steps.",
    };

  if (pathname.startsWith("/jobseeker/saved"))
    return {
      title: "Saved Jobs",
      subtitle: "Revisit roles you’ve bookmarked to apply later.",
    };

  if (pathname.startsWith("/jobseeker/interviews"))
    return {
      title: "Interviews",
      subtitle: "Track upcoming calls and past rounds.",
    };

  if (pathname.startsWith("/jobseeker/messages"))
    return {
      title: "Messages",
      subtitle: "Conversations and updates from recruiters.",
    };

  return {
    title: "Welcome back!",
    subtitle: "Here’s what’s happening with your job search today.",
  };
}

/* ROOT APPLICATION SHELL
 * - PERSISTS DARK MODE PREFERENCE
 * - SHOWS ROLE-SPECIFIC HEADERS
 * - DISPLAYS A GLOBAL SIDEBAR
 * - RENDERS ROUTES FOR BOTH HR AND JOBSEEKER AREAS*/
export default function App() {
  // REMEMBER USER THEME PREFERENCE IN LOCALSTORAGE; DEFAULT TO LIGHT
  const [isDarkThemeEnabled, setIsDarkThemeEnabled] = useState(() => {
    const storedPreference = localStorage.getItem("darkMode");
    return storedPreference ? JSON.parse(storedPreference) : false;
  });

  // CONTROL VISIBILITY OF NOTIFICATION PANEL AND UNREAD COUNT BADGE
  const [areNotificationsVisible, setAreNotificationsVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // BOOTSTRAP MOCK SERVICE WORKER DURING DEVELOPMENT ONLY
  useEffect(() => {
    startMSW();
  }, []);

  // APPLY OR REMOVE DARK CLASSES AT THE ROOT LEVEL WHEN THE TOGGLE CHANGES
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkThemeEnabled));
    const rootHtml = document.documentElement;

    // ALWAYS RESET TO LIGHT BASELINE FIRST
    document.body.classList.remove("dark-mode");
    rootHtml.classList.remove("dark");

    // ONLY ADD DARK CLASSES WHEN DARK MODE IS ENABLED
    if (isDarkThemeEnabled) {
      document.body.classList.add("dark-mode");
      rootHtml.classList.add("dark");
    }
  }, [isDarkThemeEnabled]);

  // DETERMINE CURRENT ROLE FROM URL TO ADJUST LAYOUT AND COPY
  const location = useLocation();
  const isRecruiterRoute = location.pathname.startsWith("/hr");
  const isJobseekerRoute = location.pathname.startsWith("/jobseeker");

  // PRODUCE ROLE-SPECIFIC TITLES
  const recruiterHeaderCopy = useRecruiterHeaderCopy();
  const jobseekerHeaderCopy = useJobseekerHeaderCopy();

  // SIMPLE BUTTON ACTIONS FOR HEADER CONTROLS
  const handleDarkModeToggle = () =>
    setIsDarkThemeEnabled((previous) => !previous);

  const handleNotificationsToggle = () => {
    setAreNotificationsVisible((open) => !open);
    if (!areNotificationsVisible && unreadNotificationCount > 0) {
      setUnreadNotificationCount(0);
    }
  };

  // CLOSE THE NOTIFICATION PANEL WHEN CLICKING OUTSIDE OF IT
  useEffect(() => {
    const closeOnOutsideClick = (evt) => {
      const panel = document.getElementById("notifications-panel");
      const bell = document.getElementById("notifications-bell");
      if (
        areNotificationsVisible &&
        panel &&
        !panel.contains(evt.target) &&
        bell &&
        !bell.contains(evt.target)
      ) {
        setAreNotificationsVisible(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [areNotificationsVisible]);

  /* ------------------- ROLE-SCOPED NOTIFICATION EXAMPLES ------------------- */
  const recruiterNotifications = [
    {
      id: "hr-1",
      type: "application",
      title: "New Job Application",
      message: "Sarah Johnson applied for Senior UX Designer position",
      time: "10 minutes ago",
      unread: true,
      priority: "high",
    },
    {
      id: "hr-2",
      type: "assessment",
      title: "Assessment Completed",
      message:
        "Michael Thompson completed the Frontend Developer assessment",
      time: "2 hours ago",
      unread: true,
      priority: "medium",
    },
    {
      id: "hr-3",
      type: "interview",
      title: "Interview Scheduled",
      message:
        "Interview with Jessica Williams for Product Manager role at 2:30 PM tomorrow",
      time: "5 hours ago",
      unread: true,
      priority: "high",
    },
    {
      id: "hr-4",
      type: "job",
      title: "Job Published",
      message:
        "Your Senior DevOps Engineer job has been published successfully",
      time: "Yesterday",
      unread: false,
      priority: "low",
    },
    {
      id: "hr-5",
      type: "message",
      title: "New Message",
      message:
        "You have a new message from hiring team regarding the backend developer role",
      time: "Yesterday",
      unread: false,
      priority: "medium",
    },
    {
      id: "hr-6",
      type: "reminder",
      title: "Reminder: Deadline Approaching",
      message:
        "The application deadline for Data Scientist position is in 3 days",
      time: "2 days ago",
      unread: false,
      priority: "high",
    },
    {
      id: "hr-7",
      type: "system",
      title: "System Update",
      message:
        "New features added to candidate tracking system. Check out what's new!",
      time: "3 days ago",
      unread: false,
      priority: "low",
    },
  ];

  const jobseekerNotifications = [
    {
      id: "js-1",
      type: "message",
      title: "Recruiter Message",
      message:
        "Alex (TechFlow Inc) sent you a message: “Can we chat tomorrow?”",
      time: "8 minutes ago",
      unread: true,
      priority: "high",
    },
    {
      id: "js-2",
      type: "interview",
      title: "Interview Confirmed",
      message:
        "Frontend Interview with DesignLab Studios confirmed for Fri, 3:15 PM",
      time: "1 hour ago",
      unread: true,
      priority: "medium",
    },
    {
      id: "js-3",
      type: "application",
      title: "Application Viewed",
      message:
        "Your resume was viewed for ‘Data Scientist — DataCorp Analytics’",
      time: "3 hours ago",
      unread: true,
      priority: "medium",
    },
    {
      id: "js-4",
      type: "assessment",
      title: "Assessment Invitation",
      message:
        "Take the ‘JavaScript Fundamentals’ assessment for TechFlow Inc",
      time: "Yesterday",
      unread: false,
      priority: "low",
    },
    {
      id: "js-5",
      type: "reminder",
      title: "Reminder",
      message:
        "‘Apply to Product Designer — DesignLab’ deadline in 2 days",
      time: "Yesterday",
      unread: false,
      priority: "high",
    },
    {
      id: "js-6",
      type: "system",
      title: "Profile Tip",
      message: "Add a short portfolio link to increase response rate",
      time: "2 days ago",
      unread: false,
      priority: "low",
    },
  ];

  const activeRoleNotifications = isJobseekerRoute
    ? jobseekerNotifications
    : recruiterNotifications;

  // KEEP THE UNREAD BADGE IN SYNC WHEN NAVIGATING BETWEEN ROLE AREAS
  useEffect(() => {
    const unread = activeRoleNotifications.filter((n) => n.unread).length;
    setUnreadNotificationCount(unread);
  }, [location.pathname]); // RE-COMPUTE WHEN ROUTE PREFIX CHANGES

  // FULLSCREEN VIEWS OMIT THE APP CHROME (HEADER/SIDEBAR)
  const shouldRenderFullscreen =
    location.pathname === "/intro" ||
    location.pathname === "/welcome" ||
    location.pathname.startsWith("/assessments/run/") ||
    location.pathname.startsWith("/hr/assessments/run/") ||
    location.pathname.startsWith("/jobseeker/assessments/run/");

  // FORCE FULLSCREEN ROUTES TO STAY LIGHT EVEN IF DARK MODE IS ENABLED
  useEffect(() => {
    const rootHtml = document.documentElement;
    document.body.classList.remove("dark-mode");
    rootHtml.classList.remove("dark");
    if (!shouldRenderFullscreen && isDarkThemeEnabled) {
      document.body.classList.add("dark-mode");
      rootHtml.classList.add("dark");
    }
  }, [shouldRenderFullscreen, isDarkThemeEnabled]);

  // QUICK EXIT: WHEN A FULLSCREEN ROUTE IS ACTIVE, BYPASS THE APP SHELL
  if (shouldRenderFullscreen) {
    return (
      <Routes>
        {/* LANDING AND WELCOME */}
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<LandingPage />} />
        <Route path="/welcome" element={<WelcomePage />} />

        {/* ASSESSMENT RUNNERS */}
        <Route path="/assessments/run/:id" element={<RunAssessmentPage />} />
        <Route path="/hr/assessments/run/:id" element={<RunAssessmentPage />} />
        <Route
          path="/jobseeker/assessments/run/:id"
          element={<RunAssessmentPage />}
        />

        {/* SAFETY NET */}
        <Route path="*" element={<Navigate to="/intro" replace />} />
      </Routes>
    );
  }

  /*  REUSABLE HEADER BUTTONS */
  const DarkModeToggleButton = (
    <button
      onClick={handleDarkModeToggle}
      className={`p-2 rounded-lg ${
        isDarkThemeEnabled
          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
      aria-label="Toggle dark mode"
    >
      {isDarkThemeEnabled ? (
        // SUN ICON
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // MOON ICON
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );

  const NotificationBellButton = (
    <button
      id="notifications-bell"
      onClick={handleNotificationsToggle}
      className={`relative p-2 rounded-lg ${
        isDarkThemeEnabled
          ? "text-slate-400 hover:bg-slate-700"
          : "text-slate-500 hover:bg-slate-100"
      }`}
      aria-label="Open notifications"
    >
      {/* BELL ICON */}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadNotificationCount > 0 && (
        <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-xs text-white rounded-full flex items-center justify-center">
          {unreadNotificationCount}
        </span>
      )}
    </button>
  );

  /* HEADER BANNERS PER ROLE  */
  const RecruiterHeaderBanner = (
    <header
      className={`sticky top-0 z-30 ${
        isDarkThemeEnabled
          ? "bg-slate-900/80 border-slate-800"
          : "bg-white/80 border-slate-200"
      } backdrop-blur border-b shadow-sm`}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3 pl-16 pr-4 py-5 lg:px-6">
        <div className="flex-1">
          <div className={`text-2xl font-bold tracking-tight ${isDarkThemeEnabled ? "text-white" : "text-slate-800"}`}>
            {recruiterHeaderCopy.title}
          </div>
          {recruiterHeaderCopy.subtitle && (
            <div className={`text-sm mt-1 ${isDarkThemeEnabled ? "text-slate-300" : "text-slate-600"}`}>
              {recruiterHeaderCopy.subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {DarkModeToggleButton}
          {NotificationBellButton}
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
            HR
          </div>
        </div>
      </div>
    </header>
  );

  const JobseekerHeaderBanner = (
    <header
      className={`sticky top-0 z-30 ${
        isDarkThemeEnabled
          ? "bg-slate-900/90 border-slate-800"
          : "bg-white/90 border-slate-200"
      } backdrop-blur border-b shadow-sm`}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3 pl-16 pr-4 py-5 lg:px-6">
        <div className="flex-1">
          <div className={`text-2xl font-extrabold tracking-tight ${isDarkThemeEnabled ? "text-white" : "text-slate-900"}`}>
            {jobseekerHeaderCopy.title}
          </div>
          {jobseekerHeaderCopy.subtitle && (
            <div className={`text-sm mt-1 ${isDarkThemeEnabled ? "text-slate-300" : "text-slate-700"}`}>
              {jobseekerHeaderCopy.subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {DarkModeToggleButton}
          {NotificationBellButton}
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold">
            JS
          </div>
        </div>
      </div>
    </header>
  );

  /*LAYOUT */
  return (
    <div className={`min-h-screen ${isDarkThemeEnabled ? "bg-slate-900" : "bg-slate-50"}`}>
      {/* PERMANENT SIDEBAR (COLLAPSIBLE BEHAVIOR LIVES INSIDE THE COMPONENT) */}
      <Sidebar darkMode={isDarkThemeEnabled} />

      <div className="lg:pl-64 min-h-screen">
        {/* CHOOSE HEADER BASED ON ACTIVE ROLE */}
        {isJobseekerRoute ? JobseekerHeaderBanner : RecruiterHeaderBanner}

        {/* FLOATING NOTIFICATIONS PANEL — TAPS/CLOSES OUTSIDE TO DISMISS */}
        {areNotificationsVisible && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-center items-start pt-20 px-4">
            <div
              id="notifications-panel"
              className={`w-full max-w-2xl rounded-xl shadow-xl ${
                isDarkThemeEnabled ? "bg-slate-800" : "bg-white"
              } overflow-hidden`}
            >
              <div className={`p-4 border-b ${isDarkThemeEnabled ? "border-slate-700" : "border-slate-200"} flex justify-between items-center`}>
                <div>
                  <h3 className={`font-bold text-lg ${isDarkThemeEnabled ? "text-white" : "text-slate-800"}`}>
                    Notifications
                  </h3>
                  <p className={`text-sm ${isDarkThemeEnabled ? "text-slate-400" : "text-slate-500"}`}>
                    {unreadNotificationCount > 0
                      ? `${unreadNotificationCount} unread notifications`
                      : "All caught up!"}
                  </p>
                </div>
                <button
                  onClick={() => setAreNotificationsVisible(false)}
                  className={`p-2 rounded-full ${
                    isDarkThemeEnabled ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-500"
                  }`}
                  aria-label="Close notifications"
                >
                  {/* CLOSE ICON */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {activeRoleNotifications.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 border-b ${
                      isDarkThemeEnabled ? "border-slate-700 hover:bg-slate-700/50" : "border-slate-100 hover:bg-slate-50"
                    } transition-colors duration-150 cursor-pointer ${
                      note.unread ? (isDarkThemeEnabled ? "bg-slate-700/30" : "bg-blue-50") : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          note.type === "application"
                            ? isDarkThemeEnabled
                              ? "bg-blue-900/30 text-blue-300"
                              : "bg-blue-100 text-blue-600"
                            : note.type === "assessment"
                            ? isDarkThemeEnabled
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-600"
                            : note.type === "interview"
                            ? isDarkThemeEnabled
                              ? "bg-purple-900/30 text-purple-300"
                              : "bg-purple-100 text-purple-600"
                            : note.type === "message"
                            ? isDarkThemeEnabled
                              ? "bg-amber-900/30 text-amber-300"
                              : "bg-amber-100 text-amber-600"
                            : note.type === "reminder"
                            ? isDarkThemeEnabled
                              ? "bg-rose-900/30 text-rose-300"
                              : "bg-rose-100 text-rose-600"
                            : isDarkThemeEnabled
                            ? "bg-gray-900/30 text-gray-300"
                            : "bg-gray-100 text-gray-600"
                        }`}
                        aria-hidden
                      >
                        {/* SIMPLE DOT/INFO ICON */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold truncate ${isDarkThemeEnabled ? "text-white" : "text-slate-800"}`}>
                            {note.title}
                          </h4>
                          {note.priority === "high" && (
                            <span
                              className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                isDarkThemeEnabled
                                  ? "bg-red-900/30 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Important
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${isDarkThemeEnabled ? "text-slate-300" : "text-slate-600"}`}>
                          {note.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${isDarkThemeEnabled ? "text-slate-400" : "text-slate-500"}`}>
                            {note.time}
                          </span>
                          {note.unread && (
                            <span className={`w-2 h-2 rounded-full ${isDarkThemeEnabled ? "bg-blue-400" : "bg-blue-500"}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-3 border-t ${isDarkThemeEnabled ? "border-slate-700" : "border-slate-200"} text-center`} />
            </div>
          </div>
        )}

        {/* ---------------------------- ROUTER OUTLET ---------------------------- */}
        <main className="max-w-6xl mx-auto p-6">
          <Routes>
            {/* LANDING */}
            <Route path="/" element={<Navigate to="/intro" replace />} />

            {/* RECRUITER AREA */}
            <Route path="/hr/dashboard" element={<DashboardPage />} />
            <Route path="/hr/dashboard/recent-jobs" element={<RecentJobsPage />} />
            <Route path="/hr/jobs" element={<JobsPage />} />
            <Route path="/hr/jobs/new" element={<NewJobPage />} />
            <Route path="/hr/jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/hr/candidates" element={<CandidatesPage />} />
            <Route path="/hr/candidates/:id" element={<CandidatePage />} />
            <Route path="/hr/assessments" element={<AssessmentsPage />} />

            {/* JOBSEEKER AREA */}
            <Route path="/jobseeker" element={<JobSeekerDashboard />} />
            <Route path="/jobseeker/find-jobs" element={<JobsPage />} />
            <Route path="/jobseeker/jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/jobseeker/find-jobs/:id" element={<JobDetailsRoute />} />
            <Route path="/jobseeker/assessments" element={<AssessmentsPage />} />
            <Route path="/jobseeker/apply/:id" element={<ApplyPage />} />
            <Route path="/jobseeker/applications" element={<JobseekerApplications darkMode={isDarkThemeEnabled} />} />
            <Route path="/jobseeker/saved" element={<SavedJobs darkMode={isDarkThemeEnabled} />} />
            <Route path="/jobseeker/interviews" element={<Interviews darkMode={isDarkThemeEnabled} />} />
            <Route path="/jobseeker/messages" element={<JobseekerMessages darkMode={isDarkThemeEnabled} />} />

            {/* GENERIC DETAILS (OPTIONAL BACKWARD COMPAT) */}
            <Route path="/jobs/:id" element={<JobDetailsRoute />} />

            {/* BACKWARD COMPAT REDIRECTS */}
            <Route path="/dashboard" element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/jobseeker/jobs" element={<Navigate to="/jobseeker/find-jobs" replace />} />
            <Route path="/jobs" element={<Navigate to="/hr/jobs" replace />} />
            <Route path="/jobs/new" element={<Navigate to="/hr/jobs/new" replace />} />
            <Route path="/candidates" element={<Navigate to="/hr/candidates" replace />} />
            {/* ONLY KEEP THIS ONE REDIRECT FOR THE BASE /CANDIDATES PATH. REMOVE THE OTHER DUPLICATE ROUTE TO AVOID CONFLICTS. */}
            <Route path="/candidates/:id" element={<Navigate to="/hr/candidates/:id" replace />} />
            <Route path="/assessments" element={<Navigate to="/hr/assessments" replace />} />
            <Route path="/apply/:id" element={<Navigate to="/jobseeker/apply/:id" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
