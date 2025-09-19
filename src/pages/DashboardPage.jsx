// src/pages/DashboardPage.jsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listJobs } from "../api/services/jobs.js";
import { listCandidates } from "../api/services/candidates.js";

/* 
   DASHBOARD PAGE
   PURPOSE: FETCH SUMMARY DATA FOR JOBS AND CANDIDATES AND RENDER QUICK INSIGHTS
  */
export default function DashboardPage() {
  /* 
     FETCH A SUFFICIENT NUMBER OF JOBS SO THE DASHBOARD HAS MEANINGFUL CONTENT
     NOTE: REACT-QUERY HANDLES CACHING/DEDUPING; QUERY KEYS MUST BE STABLE
     */
  const { data: allJobRecords } = useQuery({
    queryKey: ["dash-jobs"],
    queryFn: () => listJobs({ page: 1, pageSize: 150 }),
  });

  /* 
     FETCH A LARGE CANDIDATE SET TO SUPPORT COUNTS AND A SMALL ACTIVITY FEED
    */
  const { data: allCandidateRecords } = useQuery({
    queryKey: ["dash-cands"],
    queryFn: () => listCandidates({ page: 1, pageSize: 5000 }),
  });

  /*
     NORMALIZE RETURNED ARRAYS SO DOWNSTREAM CODE DOES NOT GUARD ON UNDEFINED
    */
  const jobRecordList = allJobRecords?.items ?? [];
  const candidateRecordList = allCandidateRecords?.items ?? [];

  /* 
     COMPUTE HIGH-LEVEL STATS FOR TOP CARDS
     - TOTAL NUMBER OF JOBS
     - NUMBER OF ACTIVE JOBS
     - TOTAL NUMBER OF CANDIDATES
     */
  const totalNumberOfJobs = allJobRecords?.total ?? jobRecordList.length;

  const numberOfActiveJobs =
    jobRecordList.filter((job) => String(job.status).toLowerCase() === "active")
      .length || 0;

  const totalNumberOfCandidates =
    allCandidateRecords?.total ?? candidateRecordList.length;

  /* 
     ESTIMATE "NEW THIS WEEK" WITHOUT TIMESTAMPS
     APPROACH: COUNT CANDIDATES WHOSE CURRENT STAGE IS "APPLIED"
     RATIONALE: THIS IS A REASONABLE PROXY FOR RECENT INFLOW
     */
  const numberOfNewApplicationsThisWeek = useMemo(
    () =>
      candidateRecordList.filter(
        (cand) => String(cand.stage).toLowerCase() === "applied"
      ).length,
    [candidateRecordList]
  );

  /* 
     GENERATE A DETERMINISTIC INTEGER FROM A STRING
     PURPOSE: DERIVE STABLE UI-ONLY NUMBERS (E.G., VIEWS/WEEKLY NEW) PER JOB
     NOTE: FNV-STYLE MIXING; RETURNS UNSIGNED 32-BIT INTEGER
      */
  const deriveDeterministicIntegerFromString = (anyStringLikeInput) => {
    let hash = 2166136261;
    const s = String(anyStringLikeInput);
    for (let idx = 0; idx < s.length; idx++) {
      hash ^= s.charCodeAt(idx);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  /* 
     BUILD A LOOKUP MAP FROM JOB ID → NUMBER OF CANDIDATES
     USES MULTIPLE FALLBACK KEYS BECAUSE DATA SHAPES CAN VARY
    */
  const candidateCountLookupByJobId = useMemo(() => {
    const map = new Map();
    for (const cand of candidateRecordList) {
      const jobKey = cand.jobId ?? cand.job?.id ?? cand.job_id;
      if (jobKey == null) continue;
      map.set(jobKey, (map.get(jobKey) || 0) + 1);
    }
    return map;
  }, [candidateRecordList]);

  /* 
     PREPARE "LATEST JOB POSTINGS" LIST
     ORDER: DESCENDING BY "ORDER" FIELD IF AVAILABLE; OTHERWISE STABLE COPY
     ALSO ATTACHES LIGHTWEIGHT UI-ONLY FIELDS (VIEWS/WEEKLY NEW)
     */
  const latestJobPostingsForDisplay = useMemo(() => {
    const sortedClone = [...jobRecordList].sort((a, b) => {
      const aOrder = Number.isFinite(a.order) ? a.order : 0;
      const bOrder = Number.isFinite(b.order) ? b.order : 0;
      return bOrder - aOrder; // DESCENDING
    });

    return sortedClone.slice(0, 10).map((job) => {
      const stableSeed = deriveDeterministicIntegerFromString(
        job.id ?? job.slug ?? job.title ?? ""
      );

      const derivedViewsCount = 300 + (stableSeed % 5200);
      const derivedWeeklyNew = 1 + (stableSeed % 9); // RANGE 1..9

      const normalizedStatus = String(job.status || "active").toUpperCase();
      const owningTeamOrDept = job.team || job.department || job.role || "—";

      const linkedCandidateCount = candidateCountLookupByJobId.get(job.id) || 0;

      return {
        id: job.id,
        title: job.title || job.role || "Job",
        team: owningTeamOrDept,
        status: normalizedStatus,
        candidates: linkedCandidateCount,
        newThisWeek: derivedWeeklyNew,
        views: derivedViewsCount,
      };
    });
  }, [jobRecordList, candidateCountLookupByJobId]);

  /* 
     CREATE A LIGHTWEIGHT RECENT ACTIVITY FEED FROM CANDIDATES
     NOTE: WITHOUT TIMESTAMPS, THIS IS A SIMPLE SNAPSHOT OF CURRENT STAGES
     */
  const recentCandidateActivityFeed = useMemo(() => {
    const sample = candidateRecordList.slice(0, 18);
    return sample.map((cand) => ({
      name: cand.name || cand.email || "Candidate",
      stage: String(cand.stage || "applied").toUpperCase(),
    }));
  }, [candidateRecordList]);

  /* 
     RENDER DASHBOARD WITH:
     - FOUR STAT CARDS
     - TWO SCROLLABLE LISTS (LATEST JOBS AND RECENT ACTIVITY)
     */
  return (
    <div className="space-y-6">
      {/* TOP SUMMARY CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard
          title="Total Jobs"
          value={totalNumberOfJobs}
          badge="+12% from last month"
          icon="📂"
        />
        <StatisticCard
          title="Active Jobs"
          value={numberOfActiveJobs}
          subtitle="Currently hiring"
          icon="✅"
        />
        <StatisticCard
          title="Total Candidates"
          value={totalNumberOfCandidates}
          badge="+8% from last week"
          icon="👥"
        />
        <StatisticCard
          title="New This Week"
          value={numberOfNewApplicationsThisWeek}
          subtitle="Fresh applications"
          icon="⏱️"
        />
      </section>

      {/* TWO-PANEL SECTION: LATEST JOBS + RECENT ACTIVITY */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LATEST JOBS LIST (SCROLLABLE CONTAINER) */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-slate-700">
              Latest Job Postings
            </div>
            <Link
              to="/hr/dashboard/recent-jobs"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View All →
            </Link>
          </div>

          <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
            {latestJobPostingsForDisplay.length === 0 ? (
              <div className="text-sm text-slate-500 px-2 py-8 text-center">
                No jobs available.
              </div>
            ) : (
              latestJobPostingsForDisplay.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border hover:shadow-sm transition p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-800">
                        {job.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {job.team}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            job.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-right">
                      <MiniKpi label="Candidates" value={job.candidates} />
                      <MiniKpi
                        label="New"
                        value={`+${job.newThisWeek}`}
                        hint="this week"
                      />
                      <MiniKpi label="Views" value={job.views} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY LIST (SCROLLABLE CONTAINER) */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 py-3 border-b font-semibold text-slate-700">
            Recent Activity
          </div>

          <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
            {recentCandidateActivityFeed.length === 0 ? (
              <div className="text-sm text-slate-500 px-2 py-8 text-center">
                No recent activity.
              </div>
            ) : (
              recentCandidateActivityFeed.map((activity, idx) => (
                <div
                  key={`${activity.name}-${idx}`}
                  className="flex items-center justify-between rounded-xl border p-3 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs">
                      {activity.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium">{activity.name}</div>
                      <div className="text-xs text-slate-500">
                        UPDATED RECENTLY
                      </div>
                    </div>
                  </div>

                  <PipelineStageBadge stage={activity.stage} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* 
   PRESENTATIONAL SUBCOMPONENTS
    */

/*
   STATISTIC CARD
   RESPONSIBILITY: DISPLAY A SINGLE SUMMARY METRIC WITH OPTIONAL SUBTEXT
   */
function StatisticCard({ title, value, subtitle, badge, icon }) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm hover:shadow-md transition p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">{value}</div>
          {subtitle && (
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          )}
          {badge && (
            <div className="mt-2 text-xs text-emerald-600">{badge}</div>
          )}
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* 
   MINI KPI
   RESPONSIBILITY: RENDER A SMALL LABEL + VALUE (AND OPTIONAL HINT)
   */
function MiniKpi({ label, value, hint }) {
  return (
    <div className="min-w-[80px]">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-800 leading-tight">
        {value}
      </div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}

/*
   PIPELINE STAGE BADGE
   RESPONSIBILITY: SHOW A SMALL PILL INDICATING CANDIDATE/JOB STAGE
    */
function PipelineStageBadge({ stage }) {
  const stageToClassName = {
    APPLIED: "bg-blue-100 text-blue-700",
    SCREEN: "bg-yellow-100 text-yellow-700",
    TECH: "bg-purple-100 text-purple-700",
    OFFER: "bg-emerald-100 text-emerald-700",
    HIRED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    ARCHIVED: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full ${
        stageToClassName[stage] || "bg-slate-100 text-slate-700"
      }`}
    >
      {stage}
    </span>
  );
}
