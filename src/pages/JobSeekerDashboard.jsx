// src/pages/JobSeekerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* 
   SMALL, PURE UI HELPERS
   PURPOSE: RENDER COMPACT STAT CARDS AND BADGES WITHOUT HOLDING STATE
   */
function StatCard({ icon, title, value, delta, deltaText, darkMode }) {
  return (
    <div
      className={`rounded-xl border shadow-sm p-4 ${
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 grid place-items-center rounded-lg ${
            darkMode ? "bg-indigo-900 text-indigo-200" : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{title}</div>
          <div className={`text-xl font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>{value}</div>
          <div className="text-[11px] text-emerald-500">
            {delta} <span className={darkMode ? "text-slate-400" : "text-slate-500"}>{deltaText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color = "slate", darkMode }) {
  const colorClassByName = {
    slate: darkMode ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700",
    blue: darkMode ? "bg-blue-800 text-blue-100" : "bg-blue-100 text-blue-700",
    purple: darkMode ? "bg-violet-800 text-violet-100" : "bg-violet-100 text-violet-700",
    green: darkMode ? "bg-emerald-800 text-emerald-100" : "bg-emerald-100 text-emerald-700",
    orange: darkMode ? "bg-amber-800 text-amber-100" : "bg-amber-100 text-amber-700",
    gray: darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${colorClassByName[color]}`}>{children}</span>;
}

/* 
   LOCAL PERSISTENCE KEYS AND SMALL PURE FUNCTIONS
   PURPOSE: PROVIDE NAMES FOR LOCALSTORAGE AND SIMPLE DATA TRANSFORMS
 */
const LOCALSTORAGE_KEY_MY_APPLICATION_CANDIDATE_IDS = "my_app_candidate_ids";
const LOCALSTORAGE_KEY_SAVED_JOB_IDS = "saved_jobs_ids";

/* NORMALIZE ANY STRING VALUE TO LOWERCASE */
const normalizeToLower = (s) => String(s || "").toLowerCase();

/* MAP A CANDIDATE STAGE TO A RECENT-STATUS BADGE */
const mapStageToRecentStatusBadge = (stage) => {
  const s = normalizeToLower(stage);
  if (s === "tech") return { text: "interview scheduled", color: "green" };
  if (s === "offer" || s === "hired") return { text: "offer", color: "green" };
  if (s === "rejected") return { text: "rejected", color: "gray" };
  if (s === "screen") return { text: "reviewing", color: "blue" };
  return { text: "applied", color: "blue" };
};

/* RETURN TRUE IF A TIMELINE ITEM IMPLIES AN INTERVIEW EVENT */
const timelineItemLooksLikeInterview = (timelineItem) => {
  const stageLower = normalizeToLower(timelineItem?.stage);
  const noteLower = normalizeToLower(timelineItem?.note || "");
  return stageLower === "tech" || noteLower.includes("interview");
};

/* HUMAN-READABLE DATE/TIME STRINGS */
const formatDateOnly = (ms) => new Date(ms).toLocaleDateString();
const formatTimeOnly = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/* PICK N UNIQUE RANDOM ITEMS FROM AN ARRAY */
function sampleUniqueItems(array, n) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

/* 
   JOB SEEKER DASHBOARD (DEFAULT EXPORT)
   RESPONSIBILITY: LOAD JOBS/CANDIDATES, BOOTSTRAP FIRST-TIME VIEW,
                   COMPUTE STATS/SECTIONS, AND RENDER DASHBOARD WIDGETS
    */
export default function JobSeekerDashboard({ darkMode }) {
  /* NETWORK/ERROR STATE FOR PAGE LOAD */
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  /* SECTION DATA ARRAYS */
  const [recentApplicationActivities, setRecentApplicationActivities] = useState([]); // LAST FEW UPDATES
  const [upcomingInterviewAppointments, setUpcomingInterviewAppointments] = useState([]); // LIMITED COUNT
  const [recommendedJobCards, setRecommendedJobCards] = useState([]); // SUGGESTED JOBS

  /* AGGREGATED METRICS */
  const [totalApplicationCount, setTotalApplicationCount] = useState(0);
  const [activeApplicationCount, setActiveApplicationCount] = useState(0);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [interviewEventCount, setInterviewEventCount] = useState(0);

  /* 
     INITIAL DATA LOAD
     BEHAVIOR: FETCH JOBS AND CANDIDATES, BOOTSTRAP FIRST-TIME STATE,
               COMPUTE RECENT/INTERVIEW/RECOMMENDATION DATA, AND STATS
    */
  useEffect(() => {
    let didAbort = false;

    async function loadDashboardDatasets() {
      try {
        setIsLoadingDashboard(true);
        setLoadErrorMessage("");

        // READ STORED CANDIDATE IDS THAT REPRESENT "MY APPLICATIONS"
        let storedMyCandidateIds = [];
        try {
          storedMyCandidateIds = JSON.parse(
            localStorage.getItem(LOCALSTORAGE_KEY_MY_APPLICATION_CANDIDATE_IDS) || "[]"
          );
        } catch {
          storedMyCandidateIds = [];
        }

        // READ SAVED JOB IDS (OPTIONAL)
        let storedSavedJobIds = [];
        try {
          storedSavedJobIds = JSON.parse(
            localStorage.getItem(LOCALSTORAGE_KEY_SAVED_JOB_IDS) || "[]"
          );
        } catch {
          storedSavedJobIds = [];
        }

        // FETCH LARGE PAGES OF JOBS AND CANDIDATES FROM MOCK API
        const [jobsRes, candidatesRes] = await Promise.all([
          fetch("/jobs?page=1&pageSize=3000"),
          fetch("/candidates?page=1&pageSize=3000"),
        ]);
        if (!jobsRes.ok || !candidatesRes.ok) throw new Error("Failed to load data");

        const jobsJson = await jobsRes.json();
        const candidatesJson = await candidatesRes.json();

        const jobRecords = jobsJson.items || [];
        const candidateRecords = candidatesJson.items || [];

        // BUILD A QUICK LOOKUP MAP FOR JOB BY ID
        const jobMetadataById = new Map(
          jobRecords.map((job) => [
            job.id,
            {
              id: job.id,
              title: job.title,
              role: job.role,
              company: job.company,
              location: job.location,
              status: job.status,
              tags: job.tags || [],
              team: job.team,
              minSalary: job.minSalary,
              maxSalary: job.maxSalary,
            },
          ])
        );

        // IF USER HAS NO SAVED APPLICATION IDS, BOOTSTRAP A SMALL SAMPLE
        if (!storedMyCandidateIds.length) {
          const candidatesWithValidJob = candidateRecords.filter(
            (c) => c.jobId && jobMetadataById.has(c.jobId)
          );
          const sampled = sampleUniqueItems(candidatesWithValidJob, 6);
          storedMyCandidateIds = sampled.map((c) => c.id);
          localStorage.setItem(
            LOCALSTORAGE_KEY_MY_APPLICATION_CANDIDATE_IDS,
            JSON.stringify(storedMyCandidateIds)
          );
        }

        // IF USER HAS NO SAVED JOBS, PICK A FEW ACTIVE JOBS
        if (!storedSavedJobIds.length) {
          const activeJobs = jobRecords.filter((j) => j.status === "active");
          storedSavedJobIds = sampleUniqueItems(activeJobs, 3).map((j) => j.id);
          localStorage.setItem(LOCALSTORAGE_KEY_SAVED_JOB_IDS, JSON.stringify(storedSavedJobIds));
        }
        setSavedJobsCount(storedSavedJobIds.length);

        // FILTER TO ONLY THE CANDIDATES THAT REPRESENT "MY APPLICATIONS"
        const myApplicationCandidates = candidateRecords.filter((c) =>
          storedMyCandidateIds.includes(c.id)
        );

        // READ TIMELINES FOR EACH OF MY APPLICATIONS
        const timelineItemsByCandidateId = new Map();
        await Promise.all(
          myApplicationCandidates.map(async (c) => {
            try {
              const r = await fetch(`/candidates/${c.id}/timeline`);
              const t = await r.json();
              const sortedItems = (t?.items || [])
                .slice()
                .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
              timelineItemsByCandidateId.set(c.id, sortedItems);
            } catch {
              timelineItemsByCandidateId.set(c.id, []);
            }
          })
        );

        // AGGREGATE METRICS
        const totalApps = myApplicationCandidates.length;
        const activeApps = myApplicationCandidates.filter(
          (c) => !["rejected", "hired"].includes(normalizeToLower(c.stage))
        ).length;

        // RECENT APPLICATION SECTION: ORDER BY MOST RECENT TIMELINE TIMESTAMP
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

        // UPCOMING INTERVIEWS: EXTRACT INTERVIEW-LIKE TIMELINE EVENTS
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
                type: { text: "video", color: "blue" }, // SIMPLE DEFAULT LABEL
              });
            }
          });
        });
        allInterviewEvents.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
        const limitedUpcomingInterviews = allInterviewEvents.slice(0, 3);

        // RECOMMENDATION CARDS: TAKE FIRST FEW ACTIVE JOBS
        const recommendationItems = jobRecords
          .filter((j) => j.status === "active")
          .slice(0, 3)
          .map((j) => ({
            id: j.id,
            title: j.role || j.title || "—",
            company: j.company || "—",
            location: j.location || "—",
            salary:
              j.minSalary && j.maxSalary ? `$${j.minSalary} – $${j.maxSalary}` : "",
            posted: "",
            tags: j.tags || [],
            raw: j,
          }));

        // ABORT-SAFE COMMIT BACK TO STATE
        if (didAbort) return;

        setTotalApplicationCount(totalApps);
        setActiveApplicationCount(activeApps);
        setUpcomingInterviewAppointments(limitedUpcomingInterviews);
        setInterviewEventCount(allInterviewEvents.length);
        setRecentApplicationActivities(recentItems);
        setRecommendedJobCards(recommendationItems);
      } catch (e) {
        if (!didAbort) setLoadErrorMessage(e?.message || "Failed to load dashboard");
      } finally {
        if (!didAbort) setIsLoadingDashboard(false);
      }
    }

    loadDashboardDatasets();
    return () => {
      didAbort = true;
    };
  }, []);

  /* 
     TOP SUMMARY CARDS
     BEHAVIOR: MEMOIZE THE FOUR HIGH-LEVEL KPIS FOR THE HEADER GRID
*/
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
    [totalApplicationCount, activeApplicationCount, savedJobsCount, interviewEventCount]
  );

  /* LOADING/ERROR GATES*/
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

  /* 
     MAIN RENDER
    */
  return (
    <div className="space-y-6">
      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topSummaryCards.map((card) => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            delta={card.delta}
            deltaText={card.deltaText}
            darkMode={darkMode}
          />
        ))}
      </div>

      {/* MIDDLE GRID: RECENT APPLICATIONS + UPCOMING INTERVIEWS + QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* RECENT APPLICATIONS SECTION */}
        <div
          className={`lg:col-span-2 rounded-xl border shadow-sm ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`flex items-center justify-between px-5 py-4 border-b ${
              darkMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <div className={`font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>
              Recent Applications
            </div>
          </div>

          <ul className="divide-y">
            {recentApplicationActivities.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-500">No recent updates yet.</li>
            ) : (
              recentApplicationActivities.map((entry, idx) => (
                <li key={idx} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg grid place-items-center ${
                        darkMode ? "bg-slate-700" : "bg-slate-100"
                      }`}
                    >
                      🧑‍💻
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`font-medium ${darkMode ? "text-white" : "text-slate-800"}`}>
                          {entry.title}
                        </div>
                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>•</div>
                        <div className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {entry.company}
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
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
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* RIGHT COLUMN: UPCOMING INTERVIEWS + QUICK ACTIONS */}
        <div className="space-y-4">
          {/* UPCOMING INTERVIEWS SECTION */}
          <div
            className={`rounded-xl border shadow-sm ${
              darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                darkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <div className={`font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>
                Upcoming Interviews
              </div>
              <button
                className={
                  darkMode ? "text-slate-300 hover:text-slate-100" : "text-slate-500 hover:text-slate-700"
                }
                title="Expand"
              >
                ▸
              </button>
            </div>
            <ul className="divide-y">
              {upcomingInterviewAppointments.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">No interviews found.</li>
              ) : (
                upcomingInterviewAppointments.map((iv, idx) => (
                  <li key={idx} className="px-5 py-4">
                    <div className="flex gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg grid place-items-center ${
                          darkMode ? "bg-slate-700" : "bg-slate-100"
                        }`}
                      >
                        📞
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${darkMode ? "text-white" : "text-slate-800"}`}>
                          {iv.title}
                        </div>
                        <div className={`text-[12px] ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {iv.company}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm">
                          <span className={darkMode ? "text-slate-300" : "text-slate-700"}>📅 {iv.date}</span>
                          <span className={darkMode ? "text-slate-300" : "text-slate-700"}>🕑 {iv.time}</span>
                          <Badge color={iv.type.color} darkMode={darkMode}>
                            {iv.type.text}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* QUICK ACTIONS SECTION */}
          <div
            className={`rounded-xl border shadow-sm p-4 ${
              darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className={`font-semibold px-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
              Quick Actions
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { icon: "🔎", label: "Find Jobs", sub: "Discover new opportunities" },
                { icon: "📝", label: "Update Resume", sub: "Keep your profile fresh" },
                { icon: "👤", label: "View Profile", sub: "Check your visibility" },
                { icon: "💬", label: "Messages", sub: "Connect with recruiters" },
              ].map((action) => (
                <button
                  key={action.label}
                  className={`rounded-lg border px-3 py-4 text-left hover:shadow-sm transition ${
                    darkMode
                      ? "bg-slate-700 border-slate-600 hover:bg-slate-600"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 grid place-items-center rounded-md ${
                        darkMode ? "bg-indigo-900 text-indigo-200" : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-800"}`}>
                        {action.label}
                      </div>
                      <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {action.sub}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDED JOBS SECTION */}
      <div
        className={`rounded-xl border shadow-sm ${
          darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            darkMode ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <div className={`font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>
            Recommended For You
          </div>
        </div>

        <ul className="divide-y">
          {recommendedJobCards.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">No recommendations right now.</li>
          ) : (
            recommendedJobCards.map((job) => (
              <li key={job.id} className="px-5 py-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-lg grid place-items-center ${
                      darkMode ? "bg-slate-700" : "bg-slate-100"
                    }`}
                  >
                    🏢
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`font-medium ${darkMode ? "text-white" : "text-slate-800"}`}>
                        {job.title}
                      </div>
                      <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>•</div>
                      <div className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
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
                      {job.posted ? <span>🗓 {job.posted}</span> : null}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {(job.tags || []).map((t) => (
                        <Badge
                          key={t}
                          color={t === "Featured" ? "green" : t === "remote" ? "blue" : "green"}
                          darkMode={darkMode}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/jobseeker/apply/${job.id}`}
                      state={{ job: job.raw || job }}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm shadow hover:bg-indigo-700"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* BOTTOM SAMPLE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Profile Views", value: "127", delta: "+23% this week" },
          { label: "Applications This Week", value: String(totalApplicationCount), delta: "+ this week" },
          { label: "Response Rate", value: "68%", delta: "+15% this week" },
        ].map((b) => (
          <div
            key={b.label}
            className={`rounded-xl border shadow-sm p-5 ${
              darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{b.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>
              {b.value}
            </div>
            <div className="text-[11px] text-emerald-500 mt-1">{b.delta}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 
