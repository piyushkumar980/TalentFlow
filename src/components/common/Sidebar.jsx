// src/components/common/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  ClipboardList,
  Search,
  FileText,
  Bookmark,
  CalendarDays,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";
import logo from "../../assets/TALENTFLOW.png";

/* -------------------------------
   SIDEBAR COMPONENT
   - Responsive navigation sidebar for both Job Seekers and HR (Recruiter)
   - Supports badges (notifications) and mobile drawer
   - Dark mode aware
------------------------------- */
export default function Sidebar({ darkMode }) {
  // TRACK CURRENT URL PATH
  const { pathname } = useLocation();

  // STORE WHICH BADGES HAVE BEEN DISMISSED BY THE USER
  const [dismissedBadgeMap, setDismissedBadgeMap] = useState({});

  // MOBILE DRAWER VISIBILITY
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // DETERMINE CURRENT USER CONTEXT BASED ON ROUTE
  const isJobSeekerRoute = pathname.startsWith("/jobseeker");
  const isRecruiterRoute = pathname.startsWith("/hr");

  /* -------------------------------
     LOAD DISMISSED BADGES FROM LOCALSTORAGE
  ------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem("dismissedBadges");
    if (stored) {
      try {
        setDismissedBadgeMap(JSON.parse(stored));
      } catch {
        // INVALID DATA? RESET
        setDismissedBadgeMap({});
      }
    }
  }, []);

  /* -------------------------------
     SAVE DISMISSED BADGES TO LOCALSTORAGE
  ------------------------------- */
  useEffect(() => {
    localStorage.setItem("dismissedBadges", JSON.stringify(dismissedBadgeMap));
  }, [dismissedBadgeMap]);

  /* -------------------------------
     CLOSE MOBILE DRAWER ON PATH CHANGE
  ------------------------------- */
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  /* -------------------------------
     CLOSE MOBILE DRAWER ON ESC KEY
  ------------------------------- */
  useEffect(() => {
    const handleKeydownToClose = (event) => {
      if (event.key === "Escape") setIsMobileDrawerOpen(false);
    };
    if (isMobileDrawerOpen)
      window.addEventListener("keydown", handleKeydownToClose);
    return () => window.removeEventListener("keydown", handleKeydownToClose);
  }, [isMobileDrawerOpen]);

  /* -------------------------------
     MARK A BADGE AS DISMISSED
  ------------------------------- */
  const recordBadgeDismissalForKey = (badgeKey) => {
    if (!badgeKey) return;
    setDismissedBadgeMap((prev) => ({ ...prev, [badgeKey]: true }));
  };

  /* -------------------------------
     NAVIGATION ITEMS FOR HR / RECRUITER
  ------------------------------- */
  const recruiterNavigationItems = [
    {
      to: "/hr/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      end: true,
    },
    { to: "/hr/jobs", label: "Jobs", icon: Briefcase },
    { to: "/hr/candidates", label: "Candidates", icon: Users },
    { to: "/hr/assessments", label: "Assessments", icon: ClipboardList },
  ];

  /* -------------------------------
     NAVIGATION ITEMS FOR JOB SEEKER
     Some items have badges (like unread messages or pending applications)
  ------------------------------- */
  const jobSeekerNavigationItems = [
    { to: "/jobseeker", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/jobseeker/assessments", label: "Assessments", icon: ClipboardList },
    { to: "/jobseeker/find-jobs", label: "Find Jobs", icon: Search },
    {
      to: "/jobseeker/applications",
      label: "My Applications",
      icon: FileText,
      badge: 3,
      badgeKey: "applications",
    },
    { to: "/jobseeker/saved", label: "Saved Jobs", icon: Bookmark },
    { to: "/jobseeker/interviews", label: "Interviews", icon: CalendarDays },
    {
      to: "/jobseeker/messages",
      label: "Messages",
      icon: MessageSquare,
      badge: 2,
      badgeKey: "messages",
    },
  ];

  // CHOOSE NAV ITEMS BASED ON CURRENT ROUTE
  const activeNavigationItems = isJobSeekerRoute
    ? jobSeekerNavigationItems
    : recruiterNavigationItems;

  /* -------------------------------
     REUSABLE NAVIGATION LIST
     Used in both desktop sidebar and mobile drawer
  ------------------------------- */
  const NavigationList = ({ onNavItemChosen }) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {activeNavigationItems.map(
        ({ to, label, icon: Icon, end, badge, badgeKey }) => {
          const shouldRenderBadge =
            badge != null && !dismissedBadgeMap[badgeKey];

          return (
            <NavLink
              key={to}
              to={to}
              end={!!end}
              onClick={() => {
                if (badgeKey) recordBadgeDismissalForKey(badgeKey); // mark badge dismissed
                if (onNavItemChosen) onNavItemChosen(); // close mobile drawer if needed
              }}
              className={({ isActive }) =>
                [
                  "group flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                  isActive
                    ? darkMode
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 text-indigo-700"
                    : darkMode
                    ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800",
                ].join(" ")
              }
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={[
                    "grid place-items-center h-8 w-8 rounded-lg",
                    darkMode
                      ? "bg-slate-700 text-slate-300"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  <Icon size={18} />
                </span>
                <span className="truncate">{label}</span>
              </span>

              {/* SHOW BADGE IF EXISTS */}
              {shouldRenderBadge && (
                <span className="ml-2 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-red-500 text-white text-xs px-1.5">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        }
      )}
    </nav>
  );

  /* -------------------------------
     SIDEBAR FOOTER
     Shows user info depending on the context (Job Seeker or HR)
  ------------------------------- */
  const SidebarFooter = () =>
    isJobSeekerRoute ? (
      <div className="px-3 pb-4 mt-auto">
        <div
          className={[
            "rounded-xl border px-3 py-2 shadow-sm flex items-center gap-3",
            darkMode
              ? "border-slate-700 bg-slate-800"
              : "border-slate-200 bg-white",
          ].join(" ")}
        >
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-items-center font-semibold">
            J
          </div>
          <div className="min-w-0">
            <div
              className={[
                "text-[12px] truncate",
                darkMode ? "text-slate-400" : "text-slate-500",
              ].join(" ")}
            >
              Job Seeker
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="px-3 pb-4 mt-auto">
        <div
          className={[
            "rounded-xl border px-3 py-2 shadow-sm",
            darkMode
              ? "border-slate-700 bg-slate-800"
              : "border-slate-200 bg-white",
          ].join(" ")}
        >
          <div
            className={[
              "text-sm font-semibold",
              darkMode ? "text-white" : "text-slate-800",
            ].join(" ")}
          >
            HR Manager
          </div>
          <div
            className={[
              "text-xs",
              darkMode ? "text-slate-400" : "text-slate-500",
            ].join(" ")}
          >
            hr@TalentFlow.in
          </div>
        </div>
      </div>
    );

  return (
    <>
      {/* MOBILE HAMBURGER BUTTON */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setIsMobileDrawerOpen(true)}
        className={[
          "lg:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center h-10 w-10 rounded-xl border backdrop-blur shadow",
          darkMode
            ? "bg-slate-900/70 border-slate-700 text-white"
            : "bg-white/90 border-slate-200 text-slate-800",
        ].join(" ")}
      >
        <Menu size={20} />
      </button>

      {/* DESKTOP SIDEBAR */}
      <aside
        className={[
          "hidden lg:flex fixed inset-y-0 left-0 w-60 border-r shadow-sm flex-col transition-colors duration-200",
          darkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200",
        ].join(" ")}
      >
        <div
          className={[
            "h-22 flex items-center justify-center px-3 border-b",
            darkMode ? "border-slate-700" : "border-slate-200",
          ].join(" ")}
        >
          <img
            src={logo}
            alt="TalentFlow"
            className="max-h-18 w-auto object-contain"
          />
        </div>

        {/* NAV LINKS */}
        <NavigationList />

        {/* FOOTER */}
        <SidebarFooter />
      </aside>

      {/* MOBILE OVERLAY */}
      {isMobileDrawerOpen && (
        <div
          className={[
            "lg:hidden fixed inset-0 z-40 backdrop-blur-sm",
            darkMode ? "bg-black/50" : "bg-slate-900/30",
          ].join(" ")}
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={[
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 border-r shadow-xl flex flex-col",
          isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full",
          darkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* HEADER */}
        <div
          className={[
            "h-16 flex items-center justify-between px-3 border-b",
            darkMode ? "border-slate-700" : "border-slate-200",
          ].join(" ")}
        >
          <img
            src={logo}
            alt="TalentFlow"
            className="max-h-10 w-auto object-contain"
          />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMobileDrawerOpen(false)}
            className={[
              "inline-flex items-center justify-center h-9 w-9 rounded-lg border",
              darkMode
                ? "border-slate-700 text-slate-300"
                : "border-slate-200 text-slate-700",
            ].join(" ")}
          >
            <X size={18} />
          </button>
        </div>

        {/* NAV LINKS */}
        <NavigationList onNavItemChosen={() => setIsMobileDrawerOpen(false)} />

        {/* FOOTER */}
        <SidebarFooter />
      </aside>
    </>
  );
}
