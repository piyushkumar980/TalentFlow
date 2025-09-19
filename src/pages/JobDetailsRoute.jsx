// src/pages/JobDetailsRoute.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

/* DISPLAY-ONLY HELPERS*/

// RETURN A BADGE COLOR BASED ON JOB STATUS (ACTIVE VS. NOT-ACTIVE)
const getStatusPillClassName = (statusValue) =>
  String(statusValue || "").toLowerCase() === "active"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-700";

// PRODUCE THE MOST READABLE TITLE FOR A JOB (FALL BACKS INCLUDED)
const deriveReadableJobTitle = (job) => job?.title || job?.role || "Job";

// RENDER A SALARY RANGE STRING WHEN WE HAVE ENOUGH INFORMATION
const formatSalaryRangeLabel = (job) => {
  const min = job?.minSalary;
  const max = job?.maxSalary;
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  }
  if (Number.isFinite(min)) return `From $${min.toLocaleString()}`;
  if (Number.isFinite(max)) return `Up to $${max.toLocaleString()}`;
  return "";
};

/* 
   PAGE 
  */

export default function JobDetailsRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // INFER VIEWER ROLE FROM URL WHEN EXPLICIT STATE IS MISSING
  const inferredRoleFromPathname = location.pathname.startsWith("/jobseeker")
    ? "jobseeker"
    : location.pathname.startsWith("/hr")
    ? "hr"
    : "unknown";
  const viewerRole = location.state?.fromRole || inferredRoleFromPathname;

  // HONOR A TEMPORARY ARCHIVE FLAG PASSED FROM CALLER (UI-ONLY)
  const archivedOverrideFlag = location.state?.archived;

  // LOAD THE JOB DATA FOR THE GIVEN ID (READ-ONLY)
  const {
    data: jobResponseData,
    isLoading: isJobLoading,
    isError: isJobErrored,
    error: jobErrorObject,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      // FETCH JOB DETAILS FROM API ENDPOINT
      const res = await fetch(`/jobs/${id}`);
      if (!res.ok) throw new Error("Failed to load job");
      return res.json();
    },
  });

  // NORMALIZE FIELDS FOR RENDERING
  const jobRecord = jobResponseData || {};
  const serverSaysArchived =
    String(jobRecord.status || "").toLowerCase() === "archived";
  const isArchived =
    typeof archivedOverrideFlag === "boolean"
      ? archivedOverrideFlag
      : serverSaysArchived;

  const readableJobTitle = useMemo(
    () => deriveReadableJobTitle(jobRecord),
    [jobRecord]
  );

  const viewerIsJobSeeker = viewerRole === "jobseeker";

  // LOADING STATE: SHOW A SIMPLE SKELETON LAYOUT
  if (isJobLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* SHOW A LIGHTWEIGHT SKELETON TO INDICATE DATA IS IN FLIGHT */}
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

  // ERROR STATE: ALLOW USER TO RETURN AND EXPLAIN WHAT WENT WRONG
  if (isJobErrored) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="mt-4 rounded-2xl bg-white border shadow-sm p-5 text-rose-600">
          {jobErrorObject?.message || "Failed to load job."}
        </div>
      </div>
    );
  }

  // HAPPY PATH: RENDER JOB DETAILS, WITH ROLE-AWARE ACTIONS
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* SIMPLE HEADER WITH NAVIGATION AND CONTEXT */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="ml-2 text-xs text-slate-500">
          Path: <code>{location.pathname}</code>{" "}
          {viewerRole !== "unknown" ? `· viewed as ${viewerRole}` : ""}
        </div>
      </div>

      {/* MAIN CARD WITH JOB META AND ACTIONS */}
      <div className="rounded-2xl bg-white border shadow-sm">
        {/* TITLE ROW WITH STATUS PILL */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="text-lg font-semibold text-slate-800">
            {readableJobTitle}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getStatusPillClassName(
                jobRecord.status
              )}`}
            >
              {(jobRecord.status || "active").toUpperCase()}
            </span>
          </div>
        </div>

        {/* BODY: COMPANY, LOCATION, DESCRIPTION, FACT GRID, TAGS, ACTIONS */}
        <div className="px-5 py-4 space-y-3">
          {/* COMPANY + LOCATION + ARCHIVE FLAG */}
          <div className="text-slate-600">
            {jobRecord.company ? (
              <span className="font-medium">{jobRecord.company}</span>
            ) : null}
            {jobRecord.company && (jobRecord.location || "").trim()
              ? " · "
              : ""}
            {jobRecord.location || ""}
            {isArchived && (
              <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Archived
              </span>
            )}
          </div>

          {/* DESCRIPTION WHEN AVAILABLE */}
          {jobRecord.description ? (
            <p className="text-slate-700">{jobRecord.description}</p>
          ) : null}

          {/* QUICK FACTS GRID */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(jobRecord.type || jobRecord.employmentType) && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Employment</div>
                <div>{jobRecord.type || jobRecord.employmentType}</div>
              </div>
            )}
            {jobRecord.level && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Level</div>
                <div>{jobRecord.level}</div>
              </div>
            )}
            {jobRecord.location && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Location</div>
                <div>{jobRecord.location}</div>
              </div>
            )}
            {formatSalaryRangeLabel(jobRecord) && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Salary Range</div>
                <div>{formatSalaryRangeLabel(jobRecord)}</div>
              </div>
            )}
          </div>

          {/* TAGS WHEN PRESENT */}
          {(jobRecord.tags || []).length > 0 && (
            <div>
              <div className="font-semibold mb-1">Tags</div>
              <div className="flex gap-2 flex-wrap">
                {jobRecord.tags.map((tag, idx) => (
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

          {/* ROLE-AWARE ACTIONS (APPLY FOR JOBSEEKER, CLOSE/CANCEL FOR EVERYONE) */}
          <div className="flex items-center gap-2 pt-2">
            {viewerIsJobSeeker && !isArchived && (
              <button
                onClick={() =>
                  navigate(`/jobseeker/apply/${jobRecord.id}`, {
                    state: {
                      job: {
                        id: jobRecord.id,
                        title: readableJobTitle,
                        company: jobRecord.company || "",
                        location: jobRecord.location || "",
                        salary: formatSalaryRangeLabel(jobRecord),
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
