// src/pages/DashboardPage.jsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listJobs } from "../api/services/jobs.js";
import { listCandidates } from "../api/services/candidates.js";

/* ------------------------ DASHBOARD PAGE ------------------------ */
export default function DashboardPage() {
  // Fetch jobs (for dashboard)
  const { data: jobData } = useQuery({
    queryKey: ["dash-jobs"],
    queryFn: () => listJobs({ page: 1, pageSize: 150 }),
  });

  // Fetch candidates (for dashboard)
  const { data: candidateData } = useQuery({
    queryKey: ["dash-cands"],
    queryFn: () => listCandidates({ page: 1, pageSize: 5000 }),
  });

  // Normalize arrays
  const jobs = jobData?.items ?? [];
  const candidates = candidateData?.items ?? [];

  // Basic stats
  const totalJobs = jobData?.total ?? jobs.length;
  const activeJobs = jobs.filter((job) => String(job.status).toLowerCase() === "active").length;
  const totalCandidates = candidateData?.total ?? candidates.length;
  const newThisWeek = useMemo(
    () => candidates.filter((c) => String(c.stage).toLowerCase() === "applied").length,
    [candidates]
  );

  // Helper: deterministic number from string (for UI-only counts like views)
  const stableNumberFromString = (str) => {
    let hash = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  // Map: jobId → number of candidates
  const candidatesPerJob = useMemo(() => {
    const map = new Map();
    candidates.forEach((c) => {
      const jobId = c.jobId ?? c.job?.id ?? c.job_id;
      if (jobId != null) map.set(jobId, (map.get(jobId) || 0) + 1);
    });
    return map;
  }, [candidates]);

  // Latest jobs for display (top 10, descending by 'order')
  const latestJobs = useMemo(() => {
    const sortedJobs = [...jobs].sort((a, b) => (b.order || 0) - (a.order || 0));
    return sortedJobs.slice(0, 10).map((job) => {
      const seed = stableNumberFromString(job.id ?? job.slug ?? job.title ?? "");
      return {
        id: job.id,
        title: job.title || job.role || "Job",
        team: job.team || job.department || job.role || "—",
        status: String(job.status || "active").toUpperCase(),
        candidates: candidatesPerJob.get(job.id) || 0,
        newThisWeek: 1 + (seed % 9),
        views: 300 + (seed % 5200),
      };
    });
  }, [jobs, candidatesPerJob]);

  // Recent candidate activity (first 18 candidates)
  const recentActivity = useMemo(
    () => candidates.slice(0, 18).map((c) => ({
      name: c.name || c.email || "Candidate",
      stage: String(c.stage || "applied").toUpperCase(),
    })),
    [candidates]
  );

  /* ------------------------ RENDER ------------------------ */
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard title="Total Jobs" value={totalJobs} badge="+12% from last month" icon="📂" />
        <StatisticCard title="Active Jobs" value={activeJobs} subtitle="Currently hiring" icon="✅" />
        <StatisticCard title="Total Candidates" value={totalCandidates} badge="+8% from last week" icon="👥" />
        <StatisticCard title="New This Week" value={newThisWeek} subtitle="Fresh applications" icon="⏱️" />
      </section>

      {/* Latest Jobs & Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Latest Jobs */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-slate-700">Latest Job Postings</div>
            <Link to="/hr/dashboard/recent-jobs" className="text-sm text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>
          <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
            {latestJobs.length === 0 ? (
              <div className="text-sm text-slate-500 px-2 py-8 text-center">No jobs available.</div>
            ) : (
              latestJobs.map((job) => (
                <div key={job.id} className="rounded-xl border hover:shadow-sm transition p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-800">{job.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{job.team}</div>
                      <div className="mt-2">
                        <PipelineStageBadge stage={job.status} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-right">
                      <MiniKpi label="Candidates" value={job.candidates} />
                      <MiniKpi label="New" value={`+${job.newThisWeek}`} hint="this week" />
                      <MiniKpi label="Views" value={job.views} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 py-3 border-b font-semibold text-slate-700">Recent Activity</div>
          <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-sm text-slate-500 px-2 py-8 text-center">No recent activity.</div>
            ) : (
              recentActivity.map((act, idx) => (
                <div
                  key={`${act.name}-${idx}`}
                  className="flex items-center justify-between rounded-xl border p-3 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs">
                      {act.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium">{act.name}</div>
                      <div className="text-xs text-slate-500">UPDATED RECENTLY</div>
                    </div>
                  </div>
                  <PipelineStageBadge stage={act.stage} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------ SUBCOMPONENTS ------------------------ */
function StatisticCard({ title, value, subtitle, badge, icon }) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm hover:shadow-md transition p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">{value}</div>
          {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
          {badge && <div className="mt-2 text-xs text-emerald-600">{badge}</div>}
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center text-lg">{icon}</div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, hint }) {
  return (
    <div className="min-w-[80px]">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-800 leading-tight">{value}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}

function PipelineStageBadge({ stage }) {
  const classes = {
    APPLIED: "bg-blue-100 text-blue-700",
    SCREEN: "bg-yellow-100 text-yellow-700",
    TECH: "bg-purple-100 text-purple-700",
    OFFER: "bg-emerald-100 text-emerald-700",
    HIRED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    ARCHIVED: "bg-slate-100 text-slate-700",
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${classes[stage] || "bg-slate-100 text-slate-700"}`}>{stage}</span>;
}
