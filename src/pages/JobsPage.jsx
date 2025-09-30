// src/pages/JobsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Toasts from "../components/common/Toasts.jsx";
import { useToastStore } from "../store/index.js";

/* ICONS FOR ROW ACTION BUTTONS */
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* READ-ONLY API SERVICE TO FETCH JOBS */
import { listJobs } from "../api/services/jobs.js";

/* 
   SESSION-SCOPED PATCH MAP
   -----------------------
   Purpose: Keep UI-only edits like reordering, archive/unarchive, delete, or rename.
   Scope: Memory-only; resets on page reload.
   Structure: Map<jobId, { title?, company?, status?, order?, __deleted? }>
*/
const __sessionScopedJobPatchMap = new Map();

/* 
   APPLY SESSION PATCHES AND SORT JOBS
   -----------------------------------
   Input: Raw job list from server
   Steps:
     1. Filter out jobs marked as temporarily deleted.
     2. Apply any session-only patches.
     3. Sort by "order" field (fallback to original server order if missing).
*/
function applySessionPatchesAndSortByOrder(rawItems) {
  const patched = rawItems
    .filter((job) => !__sessionScopedJobPatchMap.get(job.id)?.__deleted)
    .map((job, indexFromServer) => {
      const pendingPatch = __sessionScopedJobPatchMap.get(job.id) || {};
      const computedOrder =
        pendingPatch.order !== undefined
          ? pendingPatch.order
          : job.order !== undefined
          ? job.order
          : indexFromServer; // fallback to server-provided order
      return { ...job, ...pendingPatch, order: computedOrder };
    });

  patched.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return patched;
}

/* 
   STORE A SESSION-ONLY PATCH FOR A JOB
   ------------------------------------
   Merges the new patch with any existing patch for the same job ID.
*/
function rememberSessionScopedEdit(jobId, partialPatch) {
  const previous = __sessionScopedJobPatchMap.get(jobId) || {};
  __sessionScopedJobPatchMap.set(jobId, { ...previous, ...partialPatch });
}

/* -----------------------------
   EDIT JOB MODAL (UI-ONLY)
   -----------------------------
   Purpose: Allow HR to update job title or company temporarily.
   Note: Does not send updates to the server; changes live in memory only.
*/
function EditJobModal({ job, onClose, onSave }) {
  const [editedJobTitleInput, setEditedJobTitleInput] = useState(
    job.title || ""
  );
  const [editedCompanyNameInput, setEditedCompanyNameInput] = useState(
    job.company || ""
  );

  const handleSubmitEditedFields = (e) => {
    e.preventDefault();
    onSave({
      ...job,
      title: editedJobTitleInput,
      company: editedCompanyNameInput,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop closes modal */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Centered modal content */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Edit Job
          </h2>

          <form onSubmit={handleSubmitEditedFields} className="space-y-4">
            {/* JOB TITLE FIELD */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={editedJobTitleInput}
                onChange={(e) => setEditedJobTitleInput(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                required
              />
            </div>

            {/* COMPANY NAME FIELD */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={editedCompanyNameInput}
                onChange={(e) => setEditedCompanyNameInput(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                required
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>

            {/* DISCLOSURE: TEMPORARY SESSION SCOPE */}
            <p className="text-xs text-slate-500 pt-2">
              This change is <strong>temporary</strong> and will reset on page
              refresh.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   ROW ITEM COMPONENT
   -----------------------------
   Responsibility: Display a single job in the list.
   Supports:
     - HR actions: edit, archive/unarchive, delete
     - Job seeker actions: apply, archive/unarchive
     - Optional order controls (HR only)
     - Stop event propagation so clicking buttons doesn't trigger row navigation
*/
function RowItem({
  job,
  isHR,
  isJobSeeker,
  onRowClick,
  onApply,
  onEdit,
  onDelete,
  onToggleArchive,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const isArchived = job.status === "archived";
  const archivedOpacityClass = isArchived ? "opacity-60" : "";

  return (
    <div
      onClick={() => onRowClick(job)}
      className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer ${archivedOpacityClass}`}
    >
      {/* LEFT SIDE: ORDER CONTROLS + TITLE/COMPANY */}
      <div className="flex items-center gap-2 min-w-0">
        {isHR && (
          <div className="flex flex-col gap-1 mr-1">
            {/* MOVE UP */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(job);
              }}
              disabled={!canMoveUp}
              className="h-7 w-7 grid place-items-center rounded-md border text-slate-600 disabled:opacity-30"
              title="Move up (temp)"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            {/* MOVE DOWN */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(job);
              }}
              disabled={!canMoveDown}
              className="h-7 w-7 grid place-items-center rounded-md border text-slate-600 disabled:opacity-30"
              title="Move down (temp)"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* JOB TITLE + COMPANY */}
        <div>
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            {job.title}
            {isArchived && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Archived
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">{job.company}</div>
        </div>
      </div>

      {/* RIGHT SIDE: ACTION BUTTONS */}
      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* JOB SEEKER ACTIONS */}
        {isJobSeeker && (
          <>
            {!isArchived && (
              <button
                onClick={() => onApply(job)}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
              >
                Apply
              </button>
            )}
            <button
              onClick={() => onToggleArchive(job)}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50 text-slate-700"
              title={isArchived ? "Unarchive (temp)" : "Archive (temp)"}
            >
              {isArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </button>
          </>
        )}

        {/* HR ACTIONS */}
        {isHR && (
          <>
            <button
              onClick={() => onEdit(job)}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50 text-slate-700"
              title="Edit (temp)"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              onClick={() => onToggleArchive(job)}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50 text-slate-700"
              title={isArchived ? "Unarchive (temp)" : "Archive (temp)"}
            >
              {isArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => onDelete(job)}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50 text-rose-600"
              title="Delete (temp)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* -----------------------------
   MAIN JOBS PAGE
   -----------------------------
   Responsibilities:
     - Fetch jobs from read-only API
     - Apply session-only patches
     - Support search, reorder, archive/unarchive, temporary delete
     - Coordinate edit modal (HR only)
*/
export default function JobsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pushToast = useToastStore((s) => s.push);

  /* Detect role based on route prefix */
  const isJobSeekerRoute = pathname.startsWith("/jobseeker");
  const isHrRoute = pathname.startsWith("/hr");

  /* STATE */
  const [jobListForUi, setJobListForUi] = useState([]);
  const [searchQueryText, setSearchQueryText] = useState("");
  const [jobRecordCurrentlyBeingEdited, setJobRecordCurrentlyBeingEdited] =
    useState(null);

  /* PAGINATION (simplified: load all in one page) */
  const page = 1;
  const pageSize = 2000;

  /* FETCH JOBS AND APPLY SESSION PATCHES */
  useEffect(() => {
    (async () => {
      const response = await listJobs({
        search: searchQueryText,
        page,
        pageSize,
        sort: "order",
      });
      const patched = applySessionPatchesAndSortByOrder(response.items || []);
      setJobListForUi(patched);
    })();
  }, [searchQueryText]);

  /* -----------------------------
     SESSION-ONLY ACTIONS
     ----------------------------- */

  /* Toggle archive/unarchive */
  function handleToggleArchiveStatus(job) {
    const nextStatus = job.status === "archived" ? "active" : "archived";

    rememberSessionScopedEdit(job.id, { status: nextStatus });

    setJobListForUi((prev) =>
      applySessionPatchesAndSortByOrder(
        prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j))
      )
    );

    pushToast?.(
      `${nextStatus === "archived" ? "Archived" : "Unarchived"} "${
        job.title
      }" (temp)`,
      "ok"
    );
  }

  /* Move job up/down in the list temporarily */
  function handleMoveJobOnePosition(job, direction) {
    setJobListForUi((prev) => {
      const snapshot = [...prev];
      const index = snapshot.findIndex((j) => j.id === job.id);
      if (index < 0) return prev;

      const delta = direction === "up" ? -1 : 1;
      const swapIndex = index + delta;
      if (swapIndex < 0 || swapIndex >= snapshot.length) return prev;

      const a = snapshot[index];
      const b = snapshot[swapIndex];

      const orderA = a.order ?? index;
      const orderB = b.order ?? swapIndex;

      // Remember swapped order in session patch map
      rememberSessionScopedEdit(a.id, { order: orderB });
      rememberSessionScopedEdit(b.id, { order: orderA });

      // Rebuild sorted list
      return applySessionPatchesAndSortByOrder(snapshot);
    });

    pushToast?.(`Moved "${job.title}" ${direction} (temp)`, "ok");
  }

  /* Temporarily delete a job */
  function handleTemporaryDelete(job) {
    rememberSessionScopedEdit(job.id, { __deleted: true });
    setJobListForUi((prev) => prev.filter((j) => j.id !== job.id));
    pushToast?.(`Deleted "${job.title}" (temp)`, "ok");
  }

  /* -----------------------------
     RENDER
     ----------------------------- */
  return (
    <div className="space-y-4">
      {/* TOASTS */}
      <Toasts />

      {/* SEARCH INPUT + NEW JOB BUTTON (HR ONLY) */}
      <div className="flex items-center justify-between bg-white border rounded-2xl p-3 shadow-sm">
        <input
          value={searchQueryText}
          onChange={(e) => setSearchQueryText(e.target.value)}
          placeholder="Search jobs or companies..."
          className="w-1/2 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
        />
        {isHrRoute && (
          <Link
            to="/hr/jobs/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
          >
            + New Job
          </Link>
        )}
      </div>

      {/* JOB LIST */}
      <div className="space-y-3">
        {jobListForUi.length === 0 ? (
          <div className="text-center text-slate-500 py-10">No jobs found</div>
        ) : (
          jobListForUi.map((job, indexInList) => (
            <RowItem
              key={job.id}
              job={job}
              isHR={isHrRoute}
              isJobSeeker={isJobSeekerRoute}
              onRowClick={(j) => {
                // Navigate to job details with role-aware route
                const base = isJobSeekerRoute ? "/jobseeker/jobs" : "/hr/jobs";
                navigate(`${base}/${j.id}`, {
                  state: {
                    fromRole: isJobSeekerRoute ? "jobseeker" : "hr",
                    archived: j.status === "archived",
                  },
                });
              }}
              onApply={(j) =>
                navigate(`/jobseeker/apply/${j.id}`, {
                  state: { title: j.title, company: j.company },
                })
              }
              onEdit={(j) => setJobRecordCurrentlyBeingEdited(j)}
              onDelete={(j) => isHrRoute && handleTemporaryDelete(j)}
              onToggleArchive={handleToggleArchiveStatus}
              onMoveUp={(j) => handleMoveJobOnePosition(j, "up")}
              onMoveDown={(j) => handleMoveJobOnePosition(j, "down")}
              canMoveUp={indexInList > 0}
              canMoveDown={indexInList < jobListForUi.length - 1}
            />
          ))
        )}
      </div>

      {/* EDIT MODAL (HR ONLY) */}
      {jobRecordCurrentlyBeingEdited && isHrRoute && (
        <EditJobModal
          job={jobRecordCurrentlyBeingEdited}
          onClose={() => setJobRecordCurrentlyBeingEdited(null)}
          onSave={(updated) => {
            // Save session-only patch for title/company
            rememberSessionScopedEdit(updated.id, {
              title: updated.title,
              company: updated.company,
            });

            // Update visible list immediately
            setJobListForUi((prev) =>
              applySessionPatchesAndSortByOrder(
                prev.map((j) =>
                  j.id === updated.id ? { ...j, ...updated } : j
                )
              )
            );

            setJobRecordCurrentlyBeingEdited(null);
            useToastStore
              .getState()
              .push?.(`Updated "${updated.title}" (temp)`, "ok");
          }}
        />
      )}
    </div>
  );
}
