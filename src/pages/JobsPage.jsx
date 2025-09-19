// src/pages/JobsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Toasts from "../components/common/Toasts.jsx";
import { useToastStore } from "../store/index.js";

/* ICONS USED FOR ROW ACTIONS */
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* READ-ONLY API SERVICE FOR JOB LISTING */
import { listJobs } from "../api/services/jobs.js";

/* 
   IN-MEMORY, SESSION-SCOPED PATCH STORE
   PURPOSE: HOLD UI-ONLY EDITS (REORDER/ARCHIVE/DELETE/RENAME) THAT DO NOT HIT THE SERVER
   LIFETIME: CLEARED WHEN THE PAGE IS RELOADED OR THE APP IS RESTARTED
   KEY: JOB ID → VALUE: PARTIAL PATCH { title?, company?, status?, order?, __deleted? }
   */
const __sessionScopedJobPatchMap = new Map();

/* 
   APPLY SESSION PATCHES AND PRODUCE A SORTED LIST
   INPUT: RAW ITEMS FROM SERVER (READ-ONLY)
   OUTPUT: ARRAY AFTER (1) FILTERING TEMP DELETES (2) APPLYING PATCHES (3) ORDERING BY "order" */
function applySessionPatchesAndSortByOrder(rawItems) {
  const patched = rawItems
    .filter((job) => !(__sessionScopedJobPatchMap.get(job.id)?.__deleted))
    .map((job, indexFromServer) => {
      const pendingPatch = __sessionScopedJobPatchMap.get(job.id) || {};
      const computedOrder =
        pendingPatch.order !== undefined
          ? pendingPatch.order
          : job.order !== undefined
          ? job.order
          : indexFromServer; // FALLBACK TO ORIGINAL SERVER ORDER
      return { ...job, ...pendingPatch, order: computedOrder };
    });

  patched.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return patched;
}

/* 
   REMEMBER A SESSION-ONLY EDIT FOR A GIVEN JOB
   MERGE STRATEGY: SHALLOW MERGE OF EXISTING PATCH OBJECT WITH NEW FIELDS*/
function rememberSessionScopedEdit(jobId, partialPatch) {
  const previous = __sessionScopedJobPatchMap.get(jobId) || {};
  __sessionScopedJobPatchMap.set(jobId, { ...previous, ...partialPatch });
}

/* EDIT JOB MODAL
   RESPONSIBILITY: CAPTURE TITLE/COMPANY CHANGES AND RETURN A UI-ONLY PATCH VIA onSave
   NOTE: THIS COMPONENT DOES NOT PERFORM ANY NETWORK REQUESTS */
function EditJobModal({ job, onClose, onSave }) {
  const [editedJobTitleInput, setEditedJobTitleInput] = useState(job.title || "");
  const [editedCompanyNameInput, setEditedCompanyNameInput] = useState(job.company || "");

  const handleSubmitEditedFields = (e) => {
    e.preventDefault();
    onSave({ ...job, title: editedJobTitleInput, company: editedCompanyNameInput });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* CLICKING BACKDROP CLOSES THE MODAL */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* CENTERED MODAL CONTENT */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Edit Job</h2>

          <form onSubmit={handleSubmitEditedFields} className="space-y-4">
            {/* JOB TITLE FIELD */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
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

            {/* DISCLOSURE ABOUT SESSION SCOPE */}
            <p className="text-xs text-slate-500 pt-2">
              This change is <strong>temporary</strong> and will reset on page refresh.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ROW ITEM
   RESPONSIBILITY: RENDER A SINGLE JOB WITH CONTEXTUAL ACTIONS (APPLY/EDIT/ARCHIVE/DELETE)
   PROP onRowClick: NAVIGATE TO DETAILS WITHOUT TRIGGERING WHEN CLICKING ACTION BUTTONS*/
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
      {/* LEFT SIDE: ORDER CONTROLS (HR ONLY) + TITLE/COMPANY */}
      <div className="flex items-center gap-2 min-w-0">
        {isHR && (
          <div className="flex flex-col gap-1 mr-1">
            {/* MOVE UP TEMPORARILY */}
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

            {/* MOVE DOWN TEMPORARILY */}
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

        {/* JOB TITLE + OPTIONAL ARCHIVE BADGE + COMPANY NAME */}
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

      {/* RIGHT SIDE: ACTION BUTTONS; STOP PROPAGATION TO AVOID ROW NAVIGATION */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* JOB SEEKER ACTIONS */}
        {isJobSeeker && (
          <>
            {/* APPLY IS AVAILABLE ONLY WHEN NOT ARCHIVED */}
            {!isArchived && (
              <button
                onClick={() => onApply(job)}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
              >
                Apply
              </button>
            )}
            {/* ARCHIVE/UNARCHIVE AS A NO-OP ON SERVER, SESSION ONLY */}
            <button
              onClick={() => onToggleArchive(job)}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50 text-slate-700"
              title={isArchived ? "Unarchive (temp)" : "Archive (temp)"}
            >
              {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </button>
          </>
        )}

        {/* HR ACTIONS: EDIT / ARCHIVE / DELETE — ALL SESSION-ONLY */}
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
              {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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

/* JOBS PAGE (DEFAULT EXPORT)
   RESPONSIBILITY: FETCH DATA, APPLY SESSION PATCHES, SUPPORT SEARCH/REORDER/ARCHIVE,
                   AND COORDINATE MODAL EDITS — ALL WITHOUT SERVER MUTATIONS */
export default function JobsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pushToast = useToastStore((s) => s.push);

  /* ROLE AWARENESS DRIVEN BY ROUTE PREFIX */
  const isJobSeekerRoute = pathname.startsWith("/jobseeker");
  const isHrRoute = pathname.startsWith("/hr");

  /* STATE FOR VISIBLE JOBS AND CONTROLS */
  const [jobListForUi, setJobListForUi] = useState([]);
  const [searchQueryText, setSearchQueryText] = useState("");
  const [jobRecordCurrentlyBeingEdited, setJobRecordCurrentlyBeingEdited] = useState(null);

  /* PAGINATION CONSTANTS (SINGLE BIG PAGE FOR SIMPLICITY) */
  const page = 1;
  const pageSize = 2000;

  /* EFFECT: FETCH JOBS AND APPLY SESSION PATCHES
     TRIGGERS: CHANGES IN SEARCH QUERY
     NOTE: listJobs IS READ-ONLY; ALL MUTATIONS ARE MAINTAINED LOCALLY IN MEMORY */
  useEffect(() => {
    (async () => {
      const response = await listJobs({ search: searchQueryText, page, pageSize, sort: "order" });
      const patched = applySessionPatchesAndSortByOrder(response.items || []);
      setJobListForUi(patched);
    })();
  }, [searchQueryText]);

  /* TEMPORARY ACTIONS (SESSION-ONLY; NO SERVER REQUESTS) */

  /* TOGGLE ARCHIVE FLAG FOR A JOB AND RE-APPLY PATCHES */
  function handleToggleArchiveStatus(job) {
    const nextStatus = job.status === "archived" ? "active" : "archived";

    rememberSessionScopedEdit(job.id, { status: nextStatus });

    setJobListForUi((prev) =>
      applySessionPatchesAndSortByOrder(
        prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j))
      )
    );

    pushToast?.(`${nextStatus === "archived" ? "Archived" : "Unarchived"} "${job.title}" (temp)`, "ok");
  }

  /* PERFORM A LOCAL MOVE BY SWAPPING ORDER FIELDS */
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

      /* REMEMBER SWAPPED ORDER VALUES IN SESSION PATCH MAP */
      rememberSessionScopedEdit(a.id, { order: orderB });
      rememberSessionScopedEdit(b.id, { order: orderA });

      /* REBUILD WITH SORT APPLIED */
      return applySessionPatchesAndSortByOrder(snapshot);
    });

    pushToast?.(`Moved "${job.title}" ${direction} (temp)`, "ok");
  }

  /* MARK A JOB AS TEMPORARILY DELETED AND REMOVE FROM VISIBLE LIST */
  function handleTemporaryDelete(job) {
    rememberSessionScopedEdit(job.id, { __deleted: true });
    setJobListForUi((prev) => prev.filter((j) => j.id !== job.id));
    pushToast?.(`Deleted "${job.title}" (temp)`, "ok");
  }

  return (
    <div className="space-y-4">
      {/* TOASTS RENDER TARGET */}
      <Toasts />

      {/* SEARCH INPUT AND NEW-JOB CTA (HR ONLY) */}
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

      {/* JOB LIST WITH PER-ROW ACTIONS; EMPTY STATE WHEN NO MATCHES */}
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
                /* NAVIGATE TO A ROLE-SCOPED DETAILS ROUTE */
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
              onEdit={(j) => setJobRecordCurrentlyBeingEdited(j)}          /* OPEN EDIT MODAL */
              onDelete={(j) => isHrRoute && handleTemporaryDelete(j)}      /* TEMP DELETE */
              onToggleArchive={handleToggleArchiveStatus}
              onMoveUp={(j) => handleMoveJobOnePosition(j, "up")}
              onMoveDown={(j) => handleMoveJobOnePosition(j, "down")}
              canMoveUp={indexInList > 0}
              canMoveDown={indexInList < jobListForUi.length - 1}
            />
          ))
        )}
      </div>

      {/* EDIT MODAL MOUNTED FOR HR ONLY */}
      {jobRecordCurrentlyBeingEdited && isHrRoute && (
        <EditJobModal
          job={jobRecordCurrentlyBeingEdited}
          onClose={() => setJobRecordCurrentlyBeingEdited(null)}
          onSave={(updated) => {
            /* REMEMBER TITLE/COMPANY PATCH IN SESSION STORE */
            rememberSessionScopedEdit(updated.id, {
              title: updated.title,
              company: updated.company,
            });

            /* UPDATE VISIBLE LIST IMMEDIATELY */
            setJobListForUi((prev) =>
              applySessionPatchesAndSortByOrder(
                prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j))
              )
            );

            setJobRecordCurrentlyBeingEdited(null);
            useToastStore.getState().push?.(`Updated "${updated.title}" (temp)`, "ok");
          }}
        />
      )}
    </div>
  );
}
