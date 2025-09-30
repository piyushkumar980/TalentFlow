// src/pages/JobSeekerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* -------------------------
   UI HELPERS: STAT CARDS & BADGES
   ------------------------- */

/**
 * StatCard: small card to display a single KPI/metric
 * Props:
 *   - icon: JSX icon to display
 *   - title: metric title
 *   - value: numeric/string value
 *   - delta: change indicator (+, -, etc.)
 *   - deltaText: small label for the change
 *   - darkMode: boolean for dark theme
 */
function StatCard({ icon, title, value, delta, deltaText, darkMode }) {
  return (
    <div
      className={`rounded-xl border shadow-sm p-4 ${
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`h-10 w-10 grid place-items-center rounded-lg ${
            darkMode
              ? "bg-indigo-900 text-indigo-200"
              : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {icon}
        </div>

        {/* Metric text */}
        <div>
          <div
            className={`text-xs ${
              darkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {title}
          </div>
          <div
            className={`text-xl font-semibold ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            {value}
          </div>
          <div className="text-[11px] text-emerald-500">
            {delta}{" "}
            <span className={darkMode ? "text-slate-400" : "text-slate-500"}>
              {deltaText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Badge: small colored label
 * Props:
 *   - children: label text
 *   - color: color name (slate, blue, green, etc.)
 *   - darkMode: boolean for dark theme
 */
function Badge({ children, color = "slate", darkMode }) {
  const colorClassByName = {
    slate: darkMode
      ? "bg-slate-700 text-slate-200"
      : "bg-slate-100 text-slate-700",
    blue: darkMode ? "bg-blue-800 text-blue-100" : "bg-blue-100 text-blue-700",
    purple: darkMode
      ? "bg-violet-800 text-violet-100"
      : "bg-violet-100 text-violet-700",
    green: darkMode
      ? "bg-emerald-800 text-emerald-100"
      : "bg-emerald-100 text-emerald-700",
    orange: darkMode
      ? "bg-amber-800 text-amber-100"
      : "bg-amber-100 text-amber-700",
    gray: darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full ${colorClassByName[color]}`}
    >
      {children}
    </span>
  );
}

/* -------------------------
   LOCAL STORAGE KEYS
   ------------------------- */
const LOCALSTORAGE_KEY_MY_APPLICATION_CANDIDATE_IDS = "my_app_candidate_ids";
const LOCALSTORAGE_KEY_SAVED_JOB_IDS = "saved_jobs_ids";

/* -------------------------
   HELPER FUNCTIONS
   ------------------------- */

// Normalize string to lowercase safely
const normalizeToLower = (s) => String(s || "").toLowerCase();

// Map candidate stage to a badge for the Recent Applications section
const mapStageToRecentStatusBadge = (stage) => {
  const s = normalizeToLower(stage);
  if (s === "tech") return { text: "interview scheduled", color: "green" };
  if (s === "offer" || s === "hired") return { text: "offer", color: "green" };
  if (s === "rejected") return { text: "rejected", color: "gray" };
  if (s === "screen") return { text: "reviewing", color: "blue" };
  return { text: "applied", color: "blue" };
};

// Determine if a timeline entry represents an interview event
const timelineItemLooksLikeInterview = (timelineItem) => {
  const stageLower = normalizeToLower(timelineItem?.stage);
  const noteLower = normalizeToLower(timelineItem?.note || "");
  return stageLower === "tech" || noteLower.includes("interview");
};

// Format timestamp to human-readable date or time
const formatDateOnly = (ms) => new Date(ms).toLocaleDateString();
const formatTimeOnly = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Pick N unique random items from an array
function sampleUniqueItems(array, n) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

/* -------------------------
   JOB SEEKER DASHBOARD COMPONENT
   ------------------------- */
export default function JobSeekerDashboard({ darkMode }) {
  // Loading and error state
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  // Data arrays for different dashboard sections
  const [recentApplicationActivities, setRecentApplicationActivities] =
    useState([]);
  const [upcomingInterviewAppointments, setUpcomingInterviewAppointments] =
    useState([]);
  const [recommendedJobCards, setRecommendedJobCards] = useState([]);

  // Metrics / stats
  const [totalApplicationCount, setTotalApplicationCount] = useState(0);
  const [activeApplicationCount, setActiveApplicationCount] = useState(0);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [interviewEventCount, setInterviewEventCount] = useState(0);

  /* -------------------------
     INITIAL DATA LOAD EFFECT
     ------------------------- */
  useEffect(() => {
    let didAbort = false; // abort flag if component unmounts

    async function loadDashboardDatasets() {
      try {
        setIsLoadingDashboard(true);
        setLoadErrorMessage("");

        /* 1️⃣ Load local storage IDs */
        let storedMyCandidateIds = [];
        try {
          storedMyCandidateIds = JSON.parse(
            localStorage.getItem(
              LOCALSTORAGE_KEY_MY_APPLICATION_CANDIDATE_IDS
            ) || "[]"
          );
        } catch {
          storedMyCandidateIds = [];
        }

        let storedSavedJobIds = [];
        try {
          storedSavedJobIds = JSON.parse(
            localStorage.getItem(LOCALSTORAGE_KEY_SAVED_JOB_IDS) || "[]"
          );
        } catch {
          storedSavedJobIds = [];
        }

        /* 2️⃣ Fetch jobs and candidates from API */
        const [jobsRes, candidatesRes] = await Promise.all([
          fetch("/jobs?page=1&pageSize=3000"),
          fetch("/candidates?page=1&pageSize=3000"),
        ]);
        if (!jobsRes.ok || !candidatesRes.ok)
          throw new Error("Failed to load data");

        const jobsJson = await jobsRes.json();
        const candidatesJson = await candidatesRes.json();

        const jobRecords = jobsJson.items || [];
        const candidateRecords = candidatesJson.items || [];

        /* 3️⃣ Create quick lookup map: jobId → job data */
        const jobMetadataById = new Map(
          jobRecords.map((job) => [
            job.id,
            { ...job }, // store all relevant fields
          ])
        );

        /* 4️⃣ Bootstrap first-time data if empty */
        if (!storedMyCandidateIds.length) {
          const candidatesWithJob = candidateRecords.filter(
            (c) => c.jobId && jobMetadataById.has(c.jobId)
          );
          const sampled = sampleUniqueItems(candidatesWithJob, 6);
          storedMyCandidateIds = sampled.map((c) => c.id);
          localStorage.setItem(
            LOCALSTORAGE_KEY_MY_APPLICATION_CANDIDATE_IDS,
            JSON.stringify(storedMyCandidateIds)
          );
        }

        if (!storedSavedJobIds.length) {
          const activeJobs = jobRecords.filter((j) => j.status === "active");
          storedSavedJobIds = sampleUniqueItems(activeJobs, 3).map((j) => j.id);
          localStorage.setItem(
            LOCALSTORAGE_KEY_SAVED_JOB_IDS,
            JSON.stringify(storedSavedJobIds)
          );
        }
        setSavedJobsCount(storedSavedJobIds.length);

        /* 5️⃣ Filter only "my applications" candidates */
        const myApplicationCandidates = candidateRecords.filter((c) =>
          storedMyCandidateIds.includes(c.id)
        );

        /* 6️⃣ Fetch timelines for each candidate */
        const timelineItemsByCandidateId = new Map();
        await Promise.all(
          myApplicationCandidates.map(async (c) => {
            try {
              const r = await fetch(`/candidates/${c.id}/timeline`);
              const t = await r.json();
              timelineItemsByCandidateId.set(
                c.id,
                (t?.items || []).sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
              );
            } catch {
              timelineItemsByCandidateId.set(c.id, []);
            }
          })
        );

        /* 7️⃣ Compute metrics */
        const totalApps = myApplicationCandidates.length;
        const activeApps = myApplicationCandidates.filter(
          (c) => !["rejected", "hired"].includes(normalizeToLower(c.stage))
        ).length;

        /* 8️⃣ Prepare Recent Applications section */
        const recentItems = myApplicationCandidates
          .map((c) => {
            const job = jobMetadataById.get(c.jobId) || {};
            const timeline = timelineItemsByCandidateId.get(c.id) || [];
            const last = timeline[timeline.length - 1];
            const lastTs = last?.ts ?? Date.now();
            return {
              sortTs: lastTs,
              title: job.role || c.position || "—",
              company: job.company || "—",
              date: formatDateOnly(lastTs),
              status: mapStageToRecentStatusBadge(c.stage),
              dept: job.team || "—",
              location: job.location || c.location || "—",
            };
          })
          .sort((a, b) => b.sortTs - a.sortTs)
          .slice(0, 6);

        /* 9️⃣ Prepare Upcoming Interviews section */
        const allInterviewEvents = [];
        myApplicationCandidates.forEach((c) => {
          const job = jobMetadataById.get(c.jobId) || {};
          const timeline = timelineItemsByCandidateId.get(c.id) || [];
          timeline.forEach((t) => {
            if (timelineItemLooksLikeInterview(t)) {
              allInterviewEvents.push({
                ts: t.ts,
                title: job.role || c.position || "—",
                company: job.company || "—",
                date: formatDateOnly(t.ts),
                time: formatTimeOnly(t.ts),
                type: { text: "video", color: "blue" }, // default type
              });
            }
          });
        });
        allInterviewEvents.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
        const limitedUpcomingInterviews = allInterviewEvents.slice(0, 3);

        /* 🔟 Prepare Recommended Jobs section */
        const recommendationItems = jobRecords
          .filter((j) => j.status === "active")
          .slice(0, 3)
          .map((j) => ({
            id: j.id,
            title: j.role || j.title || "—",
            company: j.company || "—",
            location: j.location || "—",
            salary:
              j.minSalary && j.maxSalary
                ? `$${j.minSalary} – $${j.maxSalary}`
                : "",
            tags: j.tags || [],
            raw: j,
          }));

        /* ✅ Commit all prepared data to state (abort-safe) */
        if (!didAbort) {
          setTotalApplicationCount(totalApps);
          setActiveApplicationCount(activeApps);
          setRecentApplicationActivities(recentItems);
          setUpcomingInterviewAppointments(limitedUpcomingInterviews);
          setInterviewEventCount(allInterviewEvents.length);
          setRecommendedJobCards(recommendationItems);
        }
      } catch (e) {
        if (!didAbort)
          setLoadErrorMessage(e?.message || "Failed to load dashboard");
      } finally {
        if (!didAbort) setIsLoadingDashboard(false);
      }
    }

    loadDashboardDatasets();
    return () => {
      didAbort = true;
    };
  }, []);

  /* -------------------------
     TOP SUMMARY CARDS (memoized)
     ------------------------- */
  const topSummaryCards = useMemo(
    () => [
      {
        icon: <span>📥</span>,
        title: "Total Applications",
        value: String(totalApplicationCount),
        delta: "+",
        deltaText: "this week",
      },
      {
        icon: <span>✅</span>,
        title: "Active Applications",
        value: String(activeApplicationCount),
        delta: "+",
        deltaText: "this week",
      },
      {
        icon: <span>🔖</span>,
        title: "Saved Jobs",
        value: String(savedJobsCount),
        delta: "",
        deltaText: "saved",
      },
      {
        icon: <span>📅</span>,
        title: "Interviews Scheduled",
        value: String(interviewEventCount),
        delta: "+",
        deltaText: "this week",
      },
    ],
    [
      totalApplicationCount,
      activeApplicationCount,
      savedJobsCount,
      interviewEventCount,
    ]
  );

  /* -------------------------
     LOADING & ERROR UI
     ------------------------- */
  if (isLoadingDashboard) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
        Loading dashboard…
      </div>
    );
  }
  if (loadErrorMessage) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-rose-600">
        {loadErrorMessage}
      </div>
    );
  }

  /* -------------------------
     MAIN DASHBOARD RENDER
     ------------------------- */
  return (
    <div className="space-y-6">
      {/* Top KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topSummaryCards.map((card) => (
          <StatCard key={card.title} {...card} darkMode={darkMode} />
        ))}
      </div>

      {/* Middle grid: Recent Applications + Interviews + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Applications (left, 2/3 width) */}
        <div
          className={`lg:col-span-2 rounded-xl border shadow-sm ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`flex items-center justify-between px-5 py-4 border-b ${
              darkMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <div
              className={`font-semibold ${
                darkMode ? "text-white" : "text-slate-800"
              }`}
            >
              Recent Applications
            </div>
          </div>

          <ul className="divide-y">
            {recentApplicationActivities.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-500">
                No recent updates yet.
              </li>
            ) : (
              recentApplicationActivities.map((entry, idx) => (
                <li key={idx} className="px-5 py-4 flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg grid place-items-center ${
                      darkMode ? "bg-slate-700" : "bg-slate-100"
                    }`}
                  >
                    🧑‍💻
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`font-medium ${
                          darkMode ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {entry.title}
                      </div>
                      <div
                        className={`text-xs ${
                          darkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        •
                      </div>
                      <div
                        className={`text-sm ${
                          darkMode ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {entry.company}
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <div
                          className={`text-xs ${
                            darkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {entry.date}
                        </div>
                        <Badge color={entry.status.color} darkMode={darkMode}>
                          {entry.status.text}
                        </Badge>
                      </div>
                    </div>
                    <div
                      className={`text-[12px] mt-1 ${
                        darkMode ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {entry.dept} · {entry.location}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Right column: Interviews + Quick Actions */}
        <div className="space-y-4">
          {/* Upcoming Interviews */}
          <div
            className={`rounded-xl border shadow-sm ${
              darkMode
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                darkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <div
                className={`font-semibold ${
                  darkMode ? "text-white" : "text-slate-800"
                }`}
              >
                Upcoming Interviews
              </div>
            </div>
            <ul className="divide-y">
              {upcomingInterviewAppointments.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">
                  No interviews found.
                </li>
              ) : (
                upcomingInterviewAppointments.map((iv, idx) => (
                  <li key={idx} className="px-5 py-4 flex gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg grid place-items-center ${
                        darkMode ? "bg-slate-700" : "bg-slate-100"
                      }`}
                    >
                      📞
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          darkMode ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {iv.title}
                      </div>
                      <div
                        className={`text-[12px] ${
                          darkMode ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        {iv.company}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm">
                        <span
                          className={
                            darkMode ? "text-slate-300" : "text-slate-700"
                          }
                        >
                          📅 {iv.date}
                        </span>
                        <span
                          className={
                            darkMode ? "text-slate-300" : "text-slate-700"
                          }
                        >
                          🕑 {iv.time}
                        </span>
                        <Badge color={iv.type.color} darkMode={darkMode}>
                          {iv.type.text}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Quick Actions */}
          <div
            className={`rounded-xl border shadow-sm p-4 ${
              darkMode
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`font-semibold px-1 ${
                darkMode ? "text-white" : "text-slate-800"
              }`}
            >
              Quick Actions
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                {
                  icon: "🔎",
                  label: "Find Jobs",
                  sub: "Discover new opportunities",
                },
                {
                  icon: "📝",
                  label: "Update Resume",
                  sub: "Keep your profile fresh",
                },
                {
                  icon: "👤",
                  label: "View Profile",
                  sub: "Check your visibility",
                },
                {
                  icon: "💬",
                  label: "Messages",
                  sub: "Connect with recruiters",
                },
              ].map((a) => (
                <button
                  key={a.label}
                  className={`rounded-lg border px-3 py-4 text-left hover:shadow-sm transition ${
                    darkMode
                      ? "bg-slate-700 border-slate-600 hover:bg-slate-600"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 grid place-items-center rounded-md ${
                        darkMode
                          ? "bg-indigo-900 text-indigo-200"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {a.icon}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          darkMode ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {a.label}
                      </div>
                      <div
                        className={`text-xs ${
                          darkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {a.sub}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Jobs Section */}
      <div
        className={`rounded-xl border shadow-sm ${
          darkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200"
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            darkMode ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <div
            className={`font-semibold ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Recommended For You
          </div>
        </div>
        <ul className="divide-y">
          {recommendedJobCards.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">
              No recommendations right now.
            </li>
          ) : (
            recommendedJobCards.map((job) => (
              <li key={job.id} className="px-5 py-5 flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-lg grid place-items-center ${
                    darkMode ? "bg-slate-700" : "bg-slate-100"
                  }`}
                >
                  🏢
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`font-medium ${
                        darkMode ? "text-white" : "text-slate-800"
                      }`}
                    >
                      {job.title}
                    </div>
                    <div
                      className={`text-xs ${
                        darkMode ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      •
                    </div>
                    <div
                      className={`text-sm ${
                        darkMode ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {job.company}
                    </div>
                  </div>
                  <div
                    className={`mt-1 text-[12px] flex items-center gap-4 ${
                      darkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {job.location ? <span>📍 {job.location}</span> : null}
                    {job.salary ? <span>💰 {job.salary}</span> : null}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(job.tags || []).map((t) => (
                      <Badge
                        key={t}
                        color={t === "Featured" ? "green" : "blue"}
                        darkMode={darkMode}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/jobseeker/apply/${job.id}`}
                  state={{ job: job.raw || job }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm shadow hover:bg-indigo-700"
                >
                  Apply Now
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
