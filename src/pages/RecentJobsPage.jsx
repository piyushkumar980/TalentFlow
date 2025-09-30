// src/pages/RecentJobsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* -----------------------------
   HELPER FUNCTIONS
   -----------------------------
   These are pure helpers for formatting, deriving fields, or picking class names.
*/

/* STATUS BADGE CLASS
   - ACTIVE → green
   - OTHER → gray
*/
const getStatusBadgeClassName = (statusValue) => {
  const normalized = String(statusValue || "").toLowerCase();
  return normalized === "active"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-700";
};

/* SAFE NUMBER FORMATTER */
function formatNumberForDisplay(n) {
  return Intl.NumberFormat().format(n ?? 0);
}

/* SAFE DATE CONVERTER
   - Converts ISO string or timestamp to Date object
   - Defaults to current date if invalid
*/
function toSafeDateObject(timestampOrIso) {
  try {
    return new Date(timestampOrIso);
  } catch {
    return new Date();
  }
}

/* INFER TEAM FROM ROLE TEXT
   - Maps role/title keywords to a team
   - Default = "Engineering"
*/
function inferTeamFromRoleText(role = "") {
  const r = role.toLowerCase();
  if (r.includes("product")) return "Product";
  if (r.includes("design") || r.includes("ux") || r.includes("ui")) return "Design";
  if (r.includes("security")) return "Security";
  if (r.includes("sales")) return "Sales";
  if (r.includes("support") || r.includes("helpdesk")) return "Support";
  if (r.includes("hr") || r.includes("people") || r.includes("recruit") || r.includes("talent"))
    return "People Ops";
  if (r.includes("finance")) return "Finance";
  if (r.includes("marketing")) return "Marketing";
  if (r.includes("data") || r.includes("ml") || r.includes("ai") || r.includes("analyst"))
    return "Analytics";
  if (r.includes("ops")) return "Ops";
  return "Engineering";
}

/* CHECK IF LAST CONTACT OCCURRED WITHIN 7 DAYS
   - e.g., "3 days ago" → true
*/
function lastContactOccurredWithinSevenDays(lastContact = "") {
  const s = String(lastContact).toLowerCase();
  if (s.includes("today")) return true;
  const m = s.match(/(\d+)\s*day/);
  if (!m) return false;
  const days = Number(m[1] || 99);
  return days <= 7;
}

/* -----------------------------
   JOB DETAIL MODAL COMPONENT
   -----------------------------
   - Read-only, enriched view of a selected job
   - Shows title, team, location, company, status, description, stats
   - Closes on backdrop click or "Close" button
*/
const JobDetailModal = ({ job, onClose }) => {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal container */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <button
                onClick={onClose}
                className="text-indigo-600 hover:text-indigo-800 font-medium mb-4 flex items-center text-sm"
              >
                ← Back to Jobs
              </button>
              <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
              <div className="flex items-center mt-2 text-slate-600 gap-4">
                <span>{job.team || "—"}</span>
                <span>{job.location || "—"}</span>
                {job.company ? <span>• {job.company}</span> : null}
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusBadgeClassName(job.status)}`}>
              {String(job.status || "").toUpperCase()}
            </span>
          </div>

          {/* Description */}
          <div className="border-t border-b border-slate-200 py-4 my-4">
            <p className="text-slate-700">
              {job.description ||
                `Join ${job.company || "our team"} as a ${job.title}. Work with cross-functional teams to deliver high-quality outcomes.`}
            </p>
          </div>

          {/* Job details grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Team</p>
                <p className="text-slate-800">{job.team || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Location</p>
                <p className="text-slate-800">{job.location || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Posted</p>
                <p className="text-slate-800">
                  {toSafeDateObject(job.posted).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tags</p>
                <p className="text-slate-800">
                  {(job.tags || []).length ? job.tags.join(", ") : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-slate-600">Candidates</p>
                <p className="text-xl font-semibold text-slate-800">
                  {formatNumberForDisplay(job.candidates || 0)}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-slate-600">New This Week</p>
                <p className="text-xl font-semibold text-emerald-700">
                  +{formatNumberForDisplay(job.newThisWeek || 0)}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-slate-600">Views</p>
                <p className="text-xl font-semibold text-slate-800">
                  {formatNumberForDisplay(job.views || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------
   RECENT JOBS PAGE COMPONENT
   -----------------------------
   - Fetches jobs + candidates
   - Computes derived fields (counts, new-this-week, synthetic views)
   - Supports search, filter, sort
   - Opens JobDetailModal on row click
*/
export default function RecentJobsPage() {
  /* UI state: search, filters, sort */
  const [searchQueryText, setSearchQueryText] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [selectedSortOrder, setSelectedSortOrder] = useState("posted-desc");

  /* Modal state */
  const [currentlyOpenedJobForModal, setCurrentlyOpenedJobForModal] = useState(null);

  /* Loading & error states */
  const [isLoadingJobsAndCandidates, setIsLoadingJobsAndCandidates] = useState(true);
  const [loadingErrorMessage, setLoadingErrorMessage] = useState("");

  /* Raw + derived data */
  const [rawJobRecordsFromServer, setRawJobRecordsFromServer] = useState([]);
  const [derivedJobStatsByJobId, setDerivedJobStatsByJobId] = useState(new Map());
  const [enrichedJobRowsForUi, setEnrichedJobRowsForUi] = useState([]);

  /* -----------------------------
     FETCH JOBS AND CANDIDATES ON MOUNT
     -----------------------------
     - Computes per-job stats
     - Generates posted date if missing
     - Computes synthetic views
  */
  useEffect(() => {
    let didAbort = false;

    async function fetchAndPrepare() {
      try {
        setIsLoadingJobsAndCandidates(true);
        setLoadingErrorMessage("");

        const [jobsRes, candRes] = await Promise.all([
          fetch("/jobs?page=1&pageSize=2000"),
          fetch("/candidates?page=1&pageSize=2000"),
        ]);

        if (!jobsRes.ok || !candRes.ok) throw new Error("Failed to load data");

        const jobsArray = (await jobsRes.json()).items || [];
        const candidatesArray = (await candRes.json()).items || [];

        // Build per-job stats
        const statsMap = new Map();
        for (const candidate of candidatesArray) {
          const jobId = candidate.jobId;
          if (!statsMap.has(jobId)) statsMap.set(jobId, { candidates: 0, newThisWeek: 0 });
          const bucket = statsMap.get(jobId);
          bucket.candidates += 1;
          if (lastContactOccurredWithinSevenDays(candidate.lastContact)) bucket.newThisWeek += 1;
        }

        // Enrich jobs for UI
        const enrichedJobs = jobsArray.map((job) => {
          const bucket = statsMap.get(job.id) || { candidates: 0, newThisWeek: 0 };
          const daysAgo = Number.isFinite(job.order) ? job.order * 2 : 0;
          const postedIso = new Date(Date.now() - daysAgo * 86400000).toISOString();
          const synthesizedViews = bucket.candidates * 40 + ((job.id || 1) * 97) % 5000;
          const computedTitle = job.role || job.title || "—";

          return {
            id: job.id,
            title: computedTitle,
            team: job.team || inferTeamFromRoleText(computedTitle),
            status: job.status,
            company: job.company || "",
            location: job.location || "",
            tags: job.tags || [],
            posted: postedIso,
            candidates: bucket.candidates,
            newThisWeek: bucket.newThisWeek,
            views: synthesizedViews,
            description: job.description || "",
          };
        });

        if (didAbort) return;
        setRawJobRecordsFromServer(jobsArray);
        setDerivedJobStatsByJobId(statsMap);
        setEnrichedJobRowsForUi(enrichedJobs);
      } catch (e) {
        if (!didAbort) setLoadingErrorMessage(e?.message || "Failed to load");
      } finally {
        if (!didAbort) setIsLoadingJobsAndCandidates(false);
      }
    }

    fetchAndPrepare();
    return () => {
      didAbort = true;
    };
  }, []);

  /* Distinct teams for filter dropdown */
  const distinctTeamsForFilter = useMemo(() => {
    return Array.from(new Set(enrichedJobRowsForUi.map((r) => r.team))).sort();
  }, [enrichedJobRowsForUi]);

  /* -----------------------------
     FILTER + SORT PIPELINE
     -----------------------------
     - Filters: search, team, status
     - Sorts: posted, candidates, new-this-week, views
  */
  const filteredAndSortedJobRows = useMemo(() => {
    let rows = enrichedJobRowsForUi.filter((row) => {
      const query = searchQueryText.trim().toLowerCase();
      const matchesQuery =
        !query ||
        row.title.toLowerCase().includes(query) ||
        row.team.toLowerCase().includes(query) ||
        (row.company || "").toLowerCase().includes(query);

      const matchesTeam = !selectedTeamFilter || row.team === selectedTeamFilter;
      const matchesStatus =
        !selectedStatusFilter ||
        String(row.status || "").toUpperCase() === String(selectedStatusFilter).toUpperCase();

      return matchesQuery && matchesTeam && matchesStatus;
    });

    switch (selectedSortOrder) {
      case "candidates-desc":
        rows = rows.slice().sort((a, b) => (b.candidates || 0) - (a.candidates || 0));
        break;
      case "views-desc":
        rows = rows.slice().sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "new-desc":
        rows = rows.slice().sort((a, b) => (b.newThisWeek || 0) - (a.newThisWeek || 0));
        break;
      case "posted-asc":
        rows = rows
          .slice()
          .sort(
            (a, b) => toSafeDateObject(a.posted).getTime() - toSafeDateObject(b.posted).getTime()
          );
        break;
      default: // posted-desc
        rows = rows
          .slice()
          .sort(
            (a, b) => toSafeDateObject(b.posted).getTime() - toSafeDateObject(a.posted).getTime()
          );
        break;
    }

    return rows;
  }, [
    searchQueryText,
    selectedTeamFilter,
    selectedStatusFilter,
    selectedSortOrder,
    enrichedJobRowsForUi,
  ]);

  /* Handlers for modal open/close */
  const handleOpenJobInModal = (job) => setCurrentlyOpenedJobForModal(job);
  const handleCloseJobModal = () => setCurrentlyOpenedJobForModal(null);

  /* -----------------------------
     LOADING & ERROR UI
  */
  if (isLoadingJobsAndCandidates) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Loading jobs…
      </div>
    );
  }
  if (loadingErrorMessage) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-rose-600">
        {loadingErrorMessage}
      </div>
    );
  }

  /* -----------------------------
     RENDER MAIN PAGE
  */
  return (
    <div className="space-y-4">
      {/* Job detail modal */}
      {currentlyOpenedJobForModal && (
        <JobDetailModal job={currentlyOpenedJobForModal} onClose={handleCloseJobModal} />
      )}

      {/* Toolbar: search + filters + sort + back link */}
      <div className="bg-white border rounded-2xl p-3 shadow-sm flex flex-wrap gap-3">
        <input
          value={searchQueryText}
          onChange={(e) => setSearchQueryText(e.target.value)}
          placeholder="Search jobs, team, or company…"
          className="border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring focus:ring-indigo-200"
        />

        <select
          value={selectedTeamFilter}
          onChange={(e) => setSelectedTeamFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 shadow-sm"
        >
          <option value="">All teams</option>
          {distinctTeamsForFilter.map((teamName) => (
            <option key={teamName} value={teamName}>
              {teamName}
            </option>
          ))}
        </select>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 shadow-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <select
          value={selectedSortOrder}
          onChange={(e) => setSelectedSortOrder(e.target.value)}
          className="border rounded-lg px-3 py-2 shadow-sm"
        >
          <option value="posted-desc">Newest posted</option>
          <option value="posted-asc">Oldest posted</option>
          <option value="candidates-desc">Most candidates</option>
          <option value="new-desc">Most new (7d)</option>
          <option value="views-desc">Most views</option>
        </select>

        <Link
          to="/dashboard"
          className="ml-auto px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Data table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b text-xs font-semibold text-slate-600">
          <div className="col-span-4">Job</div>
          <div className="col-span-2">Team</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Candidates</div>
          <div className="col-span-1 text-right">New (7d)</div>
          <div className="col-span-2 text-right">Views</div>
        </div>

        {/* Table rows */}
        <ul className="divide-y divide-slate-100">
          {filteredAndSortedJobRows.map((row) => (
            <li
              key={row.id}
              className="px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
              onClick={() => handleOpenJobInModal(row)}
            >
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <div className="font-medium text-slate-800">{row.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Posted {toSafeDateObject(row.posted).toLocaleDateString()}
                    {row.company ? ` • ${row.company}` : ""}
                  </div>
                </div>

                <div className="col-span-2 text-slate-700">{row.team}</div>

                <div className="col-span-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClassName(
                      row.status
                    )}`}
                  >
                    {String(row.status || "").toUpperCase()}
                  </span>
                </div>

                <div className="col-span-1 text-right font-semibold">
                  {formatNumberForDisplay(row.candidates)}
                </div>

                <div className="col-span-1 text-right text-emerald-700 font-semibold">
                  +{formatNumberForDisplay(row.newThisWeek)}
                </div>

                <div className="col-span-2 text-right">{formatNumberForDisplay(row.views)}</div>
              </div>
            </li>
          ))}
        </ul>

        {/* Table footer */}
        <div className="px-4 py-3 text-xs text-slate-500 border-t">
          Showing {filteredAndSortedJobRows.length} of {enrichedJobRowsForUi.length} jobs
        </div>
      </div>
    </div>
  );
}
