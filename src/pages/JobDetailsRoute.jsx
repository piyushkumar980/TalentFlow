// src/pages/JobDetailsRoute.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

/* ---------------- UTILITY FUNCTIONS ---------------- */

// Returns a badge style based on job status (active vs. inactive)
const getStatusBadgeClass = (status) =>
  (status || "").toLowerCase() === "active"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-700";

// Returns a readable job title, falling back to role or generic "Job"
const getJobTitle = (job) => job?.title || job?.role || "Job";

// Returns a nicely formatted salary range string
const getSalaryLabel = (job) => {
  const min = job?.minSalary;
  const max = job?.maxSalary;
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  }
  if (Number.isFinite(min)) return `From $${min.toLocaleString()}`;
  if (Number.isFinite(max)) return `Up to $${max.toLocaleString()}`;
  return "";
};

/* ---------------- MAIN COMPONENT ---------------- */

export default function JobDetailsRoute() {
  const { id } = useParams(); // Get job ID from URL
  const navigate = useNavigate();
  const location = useLocation();

  // Determine viewer role (jobseeker vs hr) from URL or state
  const inferredRole = location.pathname.startsWith("/jobseeker")
    ? "jobseeker"
    : location.pathname.startsWith("/hr")
    ? "hr"
    : "unknown";
  const viewerRole = location.state?.fromRole || inferredRole;
  const viewerIsJobSeeker = viewerRole === "jobseeker";

  // Optional archive flag passed from previous page (UI-only)
  const archivedOverride = location.state?.archived;

  // Fetch job data from API
  const {
    data: jobData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await fetch(`/jobs/${id}`);
      if (!res.ok) throw new Error("Failed to load job");
      return res.json();
    },
  });

  // Normalize job record for easier rendering
  const job = jobData || {};
  const serverArchived = (job.status || "").toLowerCase() === "archived";
  const isArchived =
    typeof archivedOverride === "boolean" ? archivedOverride : serverArchived;
  const jobTitle = useMemo(() => getJobTitle(job), [job]);

  /* ---------------- LOADING STATE ---------------- */
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-3">
          <div className="h-9 w-48 bg-slate-200 rounded" />
          <div className="rounded-2xl bg-white border shadow-sm p-5 space-y-3">
            <div className="h-5 w-56 bg-slate-200 rounded" />
            <div className="h-4 w-4/5 bg-slate-100 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-slate-50 border rounded" />
              <div className="h-16 bg-slate-50 border rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- ERROR STATE ---------------- */
  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="mt-4 rounded-2xl bg-white border shadow-sm p-5 text-rose-600">
          {error?.message || "Failed to load job."}
        </div>
      </div>
    );
  }

  /* ---------------- MAIN JOB DETAILS ---------------- */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header with back button and viewer info */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="ml-2 text-xs text-slate-500">
          Path: <code>{location.pathname}</code>
          {viewerRole !== "unknown" ? ` · viewed as ${viewerRole}` : ""}
        </div>
      </div>

      {/* Job card */}
      <div className="rounded-2xl bg-white border shadow-sm">
        {/* Title row with status badge */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="text-lg font-semibold text-slate-800">{jobTitle}</div>
          <div className="ml-auto">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                job.status
              )}`}
            >
              {(job.status || "active").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Body: company, location, description, facts, tags */}
        <div className="px-5 py-4 space-y-3">
          {/* Company, location, archive */}
          <div className="text-slate-600">
            {job.company && <span className="font-medium">{job.company}</span>}
            {job.company && job.location ? " · " : ""}
            {job.location || ""}
            {isArchived && (
              <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Archived
              </span>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <p className="text-slate-700">{job.description}</p>
          )}

          {/* Quick facts grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(job.type || job.employmentType) && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Employment</div>
                <div>{job.type || job.employmentType}</div>
              </div>
            )}
            {job.level && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Level</div>
                <div>{job.level}</div>
              </div>
            )}
            {job.location && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Location</div>
                <div>{job.location}</div>
              </div>
            )}
            {getSalaryLabel(job) && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Salary Range</div>
                <div>{getSalaryLabel(job)}</div>
              </div>
            )}
          </div>

          {/* Tags */}
          {job.tags?.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Tags</div>
              <div className="flex gap-2 flex-wrap">
                {job.tags.map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions: Apply / Close */}
          <div className="flex items-center gap-2 pt-2">
            {viewerIsJobSeeker && !isArchived && (
              <button
                onClick={() =>
                  navigate(`/jobseeker/apply/${job.id}`, {
                    state: {
                      job: {
                        id: job.id,
                        title: jobTitle,
                        company: job.company || "",
                        location: job.location || "",
                        salary: getSalaryLabel(job),
                      },
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
              >
                Apply
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
            >
              {viewerIsJobSeeker ? "Cancel" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
