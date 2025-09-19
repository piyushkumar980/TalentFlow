// /src/pages/AssessmentsPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listJobs } from "../api/services/jobs.js"; // READ-ONLY SERVICE

/* =============================================================================
   SMALL, PURE UTILITIES
   PURPOSE: TIME CONSTANTS, DATE FORMATTER, RELATIVE DAY CALCULATOR, SIMPLE UID
   ========================================================================== */
const MILLISECONDS_PER_DAY = 86400000;

/* FORMAT A TIMESTAMP (MS) INTO A LOCALE DATE STRING */
const formatDateFromMs = (ms) => new Date(ms).toLocaleDateString();

/* RETURN WHOLE DAYS REMAINING FROM NOW TO A FUTURE TIMESTAMP (NEGATIVE IF PAST) */
const daysRemainingFromNow = (ms) => Math.ceil((ms - Date.now()) / MILLISECONDS_PER_DAY);

/* GENERATE A SHORT, MOSTLY UNIQUE IDENTIFIER FOR CLIENT-SIDE OBJECTS */
const generateUniqueIdString = () => Math.random().toString(36).slice(2);

/* =============================================================================
   COMPUTE A DETERMINISTIC DATE WINDOW FROM A JOB ID
   PURPOSE: PROVIDE OPEN/UPCOMING/EXPIRED WINDOWS SO THE UI FEELS ALIVE
   OUTPUT SHAPE: { start, end, kind: "open" | "upcoming" | "expired" }
   ========================================================================== */
function computeDeterministicAssessmentWindow(jobId) {
  const mod = Number(jobId) % 3;
  const now = Date.now();

  if (mod === 0) {
    const start = now - (2 + (jobId % 5)) * MILLISECONDS_PER_DAY;
    const end = now + (2 + (jobId % 6)) * MILLISECONDS_PER_DAY;
    return { start, end, kind: "open" };
  }

  if (mod === 1) {
    const start = now + (2 + (jobId % 6)) * MILLISECONDS_PER_DAY;
    const end = start + (5 + (jobId % 7)) * MILLISECONDS_PER_DAY;
    return { start, end, kind: "upcoming" };
  }

  const end = now - (2 + (jobId % 6)) * MILLISECONDS_PER_DAY;
  const start = end - (6 + (jobId % 7)) * MILLISECONDS_PER_DAY;
  return { start, end, kind: "expired" };
}

/* =============================================================================
   SESSION-ONLY STORES (CLEARED ON REFRESH)
   PURPOSE: HOLD UI PATCHES AND ASSESSMENT DOCS WITHOUT SERVER PERSISTENCE
   ========================================================================== */
// JOB UI PATCHES: jobId -> { status }
const __sessionScopedJobPatchesMap = new Map();

// ASSESSMENT DOCS: jobId -> { jobId, sections: [{ id, title, questions: [{ id, type, label, options[], correctIndex, required }]}] }
const __sessionScopedAssessmentDocumentsMap = new Map();

/* APPLY A PATCH TO A SINGLE JOB ROW IF ONE EXISTS */
function applySessionJobPatchIfAny(jobRow) {
  const patch = __sessionScopedJobPatchesMap.get(jobRow.id);
  return patch ? { ...jobRow, ...patch } : jobRow;
}

/* ENSURE AN ASSESSMENT DOC EXISTS FOR A JOB; CREATE A SIMPLE SEED IF MISSING */
function ensureAssessmentDocumentForJob(jobRow) {
  let doc = __sessionScopedAssessmentDocumentsMap.get(jobRow.id);
  if (!doc) {
    doc = {
      jobId: jobRow.id,
      sections: [
        {
          id: generateUniqueIdString(),
          title: "General",
          questions: [
            {
              id: generateUniqueIdString(),
              type: "single",
              label: `Why are you a good fit for ${jobRow.role || jobRow.title || "this role"}?`,
              required: true,
              options: ["Strong skills", "Relevant experience", "Great culture fit", "All of the above"],
              correctIndex: 3,
            },
          ],
        },
      ],
    };
    __sessionScopedAssessmentDocumentsMap.set(jobRow.id, doc);
  }
  return doc;
}

/* =============================================================================
   TOAST COMPONENT
   RESPONSIBILITY: TEMPORARY, SELF-DISMISSING NOTIFICATION WITH MANUAL CLOSE
   ========================================================================== */
const Toast = ({ message, type = "success", onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timerId);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-100 border-green-200"
      : type === "error"
      ? "bg-red-100 border-red-200"
      : "bg-blue-100 border-blue-200";

  const textColor =
    type === "success"
      ? "text-green-800"
      : type === "error"
      ? "text-red-800"
      : "text-blue-800";

  return (
    <div className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      <div className={`flex items-center p-4 rounded-lg border shadow-lg ${bgColor}`}>
        <div className={`flex-1 ${textColor}`}>{message}</div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-slate-500 hover:text-slate-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/* =============================================================================
   PERMISSION MODAL
   RESPONSIBILITY: COLLECT CAMERA/MIC PERMISSIONS AND ACKNOWLEDGMENT BEFORE RUN
   ========================================================================== */
const PermissionModal = ({ company, role, onClose, onConfirm }) => {
  const [isCameraAllowed, setIsCameraAllowed] = useState(false);
  const [isAudioAllowed, setIsAudioAllowed] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  /* REQUEST CAMERA PERMISSION AND CLEAN UP TRACKS IMMEDIATELY */
  const handleGrantCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setIsCameraAllowed(true);
    } catch {
      alert("Camera access is required for this assessment. Please allow camera access.");
    }
  };

  /* REQUEST MICROPHONE PERMISSION AND CLEAN UP TRACKS IMMEDIATELY */
  const handleGrantAudioPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setIsAudioAllowed(true);
    } catch {
      alert("Microphone access is required for this assessment. Please allow microphone access.");
    }
  };

  const allRequiredPermissionsGranted = isCameraAllowed && isAudioAllowed && isAcknowledged;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* CLICK OUTSIDE TO CLOSE MODAL */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Assessment Setup</h2>
            <p className="text-slate-600 mt-2">
              You're about to start the assessment for <span className="font-semibold">{role}</span> at{" "}
              <span className="font-semibold">{company}</span>.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Required Permissions</h3>

            {/* CAMERA PERMISSION */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium text-slate-700">Camera Access</h4>
                <p className="text-sm text-slate-500">Required for proctoring during the assessment</p>
              </div>
              <button
                onClick={handleGrantCameraPermission}
                disabled={isCameraAllowed}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isCameraAllowed ? "bg-green-100 text-green-700 cursor-default" : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {isCameraAllowed ? "✓ Granted" : "Allow Camera"}
              </button>
            </div>

            {/* MICROPHONE PERMISSION */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium text-slate-700">Microphone Access</h4>
                <p className="text-sm text-slate-500">Required for audio-based proctoring during the assessment</p>
              </div>
              <button
                onClick={handleGrantAudioPermission}
                disabled={isAudioAllowed}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isAudioAllowed ? "bg-green-100 text-green-700 cursor-default" : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {isAudioAllowed ? "✓ Granted" : "Allow Microphone"}
              </button>
            </div>

            {/* POLICY ACKNOWLEDGMENT */}
            <div className="flex items-start p-3 border rounded-lg">
              <input
                type="checkbox"
                id="acknowledge"
                checked={isAcknowledged}
                onChange={(e) => setIsAcknowledged(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="acknowledge" className="text-sm text-slate-700">
                I acknowledge that this assessment will be proctored and recorded. I understand that
                any attempt to cheat or use unauthorized resources will result in disqualification.
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onConfirm}
              disabled={!allRequiredPermissionsGranted}
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow transition ${
                allRequiredPermissionsGranted ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              Start Assessment
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
   EDIT ASSESSMENT MODAL (SESSION-ONLY)
   RESPONSIBILITY: ADD/EDIT/REMOVE QUESTIONS WITH A SINGLE-SECTION EDITOR
   ========================================================================== */
const EditAssessmentModal = ({ jobRow, initialDoc, onClose, onSave }) => {
  /* CREATE A DEEP COPY FOR LOCAL EDITING TO AVOID MUTATING THE SOURCE */
  const [workingAssessmentDoc, setWorkingAssessmentDoc] = useState(() =>
    JSON.parse(JSON.stringify(initialDoc || ensureAssessmentDocumentForJob(jobRow)))
  );

  /* SINGLE SECTION EDITOR FOR SIMPLICITY */
  const sectionIndex = 0;
  const section = workingAssessmentDoc.sections[sectionIndex];

  /* ADD A NEW QUESTION WITH DEFAULT SHAPE */
  const addQuestion = () => {
    const newQuestion = {
      id: generateUniqueIdString(),
      type: "single",
      label: "New question",
      required: true,
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctIndex: 0,
    };
    const nextDoc = { ...workingAssessmentDoc };
    nextDoc.sections = [...workingAssessmentDoc.sections];
    nextDoc.sections[sectionIndex] = { ...section, questions: [...section.questions, newQuestion] };
    setWorkingAssessmentDoc(nextDoc);
  };

  /* UPDATE A QUESTION PARTIALLY BY INDEX */
  const updateQuestion = (questionIndex, patch) => {
    const nextDoc = { ...workingAssessmentDoc };
    const updatedQuestions = [...section.questions];
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], ...patch };
    nextDoc.sections = [...workingAssessmentDoc.sections];
    nextDoc.sections[sectionIndex] = { ...section, questions: updatedQuestions };
    setWorkingAssessmentDoc(nextDoc);
  };

  /* UPDATE A SPECIFIC OPTION VALUE BY QUESTION/OPTION INDEX */
  const updateOption = (questionIndex, optionIndex, value) => {
    const q = section.questions[questionIndex];
    const opts = [...q.options];
    opts[optionIndex] = value;
    updateQuestion(questionIndex, { options: opts });
  };

  /* REMOVE A QUESTION ENTIRELY */
  const removeQuestion = (questionIndex) => {
    const nextQuestions = section.questions.slice();
    nextQuestions.splice(questionIndex, 1);
    const nextDoc = { ...workingAssessmentDoc };
    nextDoc.sections = [...workingAssessmentDoc.sections];
    nextDoc.sections[sectionIndex] = { ...section, questions: nextQuestions };
    setWorkingAssessmentDoc(nextDoc);
  };

  /* SAVE CHANGES BACK TO CALLER */
  const save = (e) => {
    e?.preventDefault?.();
    onSave({ jobId: jobRow.id, doc: workingAssessmentDoc });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* CLICKING BACKDROP CLOSES MODAL */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* HEADER WITH JOB CONTEXT */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Edit Assessment</h2>
              <p className="text-slate-600 mt-1">
                Company: <span className="font-medium">{jobRow.company}</span>
              </p>
              <p className="text-slate-600">
                Role: <span className="font-medium">{jobRow.role}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
          </div>

          {/* SECTION TITLE + ADD QUESTION */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">{section.title || "Section"}</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-700"
            >
              + Add Question
            </button>
          </div>

          {/* QUESTIONS EDITOR */}
          <form onSubmit={save} className="space-y-6">
            {section.questions.map((q, qi) => (
              <div key={q.id} className="rounded-xl border p-4">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 text-sm mt-1">Q{qi + 1}.</span>
                  <input
                    value={q.label}
                    onChange={(e) => updateQuestion(qi, { label: e.target.value })}
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="ml-2 text-red-600 hover:text-red-700"
                    title="Remove question"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === q.correctIndex;
                    return (
                      <div
                        key={oi}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isCorrect ? "bg-white border-emerald-200" : "bg-white border-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={isCorrect}
                          onChange={() => updateQuestion(qi, { correctIndex: oi })}
                          className="h-4 w-4 text-emerald-600 "
                          title="Mark as correct"
                        />
                        <input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          className="flex-1 border rounded-md px-2 py-1 focus:outline-none focus:ring focus:ring-indigo-200"
                        />
                        {isCorrect && <span className="text-xs font-medium text-emerald-700">Correct</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ACTIONS: SAVE/CANCEL */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition">
                Save
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <p className="ml-auto text-xs text-slate-500 self-center">Changes applied successfully.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
   ASSESSMENTS PAGE (DEFAULT EXPORT)
   RESPONSIBILITY: LIST ASSESSMENT ENTRIES (BACKED BY JOBS), FILTER/PAGINATE,
                   OPEN PERMISSION MODAL, EDIT DOCS (SESSION-ONLY), ARCHIVE/HIDE
   ========================================================================== */
export default function AssessmentsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /* DETERMINE ROLE CONTEXT FROM ROUTE PREFIX */
  const isJobSeeker = pathname.startsWith("/jobseeker");
  const isHR = pathname.startsWith("/hr");

  /* PAGE-LEVEL STATE */
  const [searchQueryText, setSearchQueryText] = useState("");
  const [currentPageIndexOneBased, setCurrentPageIndexOneBased] = useState(1);
  const [jobRowSelectedForPermissions, setJobRowSelectedForPermissions] = useState(null);

  /* EDITOR STATE (SESSION-ONLY) */
  const [jobRowBeingEdited, setJobRowBeingEdited] = useState(null);
  const [assessmentDocDraftForEditor, setAssessmentDocDraftForEditor] = useState(null);

  /* FILTERS AND TOASTS */
  const [shouldShowArchivedRows, setShouldShowArchivedRows] = useState(false);
  const [toastItems, setToastItems] = useState([]);

  /* UI-ONLY HIDDEN ROWS AND PATCH TICK TO FORCE RECOMPUTE */
  const [hiddenJobIds, setHiddenJobIds] = useState(new Set());
  const [patchNonceCounter, setPatchNonceCounter] = useState(0);

  const pageSize = 12;

  /* FETCH JOBS AS THE ASSESSMENT CATALOG */
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["assessments-jobs"],
    queryFn: () => listJobs({ page: 1, pageSize: 2000, sort: "order" }),
  });

  const serverJobRows = data?.items ?? [];

  /* APPLY SESSION PATCHES (ARCHIVE STATUS) ON TOP OF SERVER DATA */
  const patchedJobRows = useMemo(
    () => serverJobRows.map(applySessionJobPatchIfAny),
    [serverJobRows, patchNonceCounter]
  );

  /* TOAST HELPERS */
  const pushToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToastItems((prev) => [...prev, { id, message, type }]);
  };
  const popToast = (id) => setToastItems((prev) => prev.filter((t) => t.id !== id));

  /* COMBINE FILTERS AND DERIVED WINDOWS */
  const filteredEntries = useMemo(() => {
    const needle = searchQueryText.trim().toLowerCase();

    let rows = patchedJobRows
      .filter((j) => !hiddenJobIds.has(j.id))
      .map((j) => ({
        id: j.id,
        company: j.company || "—",
        role: j.role || j.title || "—",
        archived: j.status === "archived",
        ...computeDeterministicAssessmentWindow(j.id),
      }));

    if (!shouldShowArchivedRows) {
      rows = rows.filter((r) => !r.archived);
    }

    if (needle) {
      rows = rows.filter(
        (r) =>
          (r.company || "").toLowerCase().includes(needle) ||
          (r.role || "").toLowerCase().includes(needle)
      );
    }

    return rows;
  }, [patchedJobRows, searchQueryText, shouldShowArchivedRows, hiddenJobIds]);

  /* PAGINATION CALCULATIONS */
  const totalPageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPageItems = useMemo(() => {
    const start = (currentPageIndexOneBased - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPageIndexOneBased]);

  /* BUILD A HUMAN-READABLE STATUS PILL FOR EACH ROW */
  const buildStatusForRow = (row) => {
    const { start, end, kind } = row;
    if (kind === "upcoming") return { kind, text: `Opens in ${daysRemainingFromNow(start)}d` };
    if (kind === "expired") return { kind, text: "Expired" };
    return { kind: "open", text: `Closes in ${daysRemainingFromNow(end)}d` };
  };

  /* OPEN PERMISSION MODAL FOR JOBSEEKER RUN */
  const handleStartAssessment = (row) => {
    setJobRowSelectedForPermissions(row);
  };

  /* OPEN EDITOR MODAL WITH A DEEP COPY OF THE DOC (HR ONLY) */
  const handleEditAssessment = (row) => {
    if (!isHR) return;
    const matchingPatched = patchedJobRows.find((j) => j.id === row.id) || {
      id: row.id,
      company: row.company,
      role: row.role,
    };
    const ensuredDoc = ensureAssessmentDocumentForJob(matchingPatched);
    setAssessmentDocDraftForEditor(JSON.parse(JSON.stringify(ensuredDoc)));
    setJobRowBeingEdited(row);
  };

  /* HIDE ROW LOCALLY (UI-ONLY DELETE) */
  const handleDeleteAssessment = (row) => {
    setHiddenJobIds((prev) => new Set(prev).add(row.id));
    pushToast(`Assessment for ${row.company} - ${row.role} removed from view`, "success");
  };

  /* TOGGLE ARCHIVE LOCALLY (SESSION-ONLY) */
  const handleArchiveAssessment = (row) => {
    const currentPatch = __sessionScopedJobPatchesMap.get(row.id) || {};
    const nextStatus = row.archived ? "active" : "archived";
    __sessionScopedJobPatchesMap.set(row.id, { ...currentPatch, status: nextStatus });
    setPatchNonceCounter((n) => n + 1);
    const actionVerb = row.archived ? "unarchived" : "archived";
    pushToast(`Assessment for ${row.company} - ${row.role} ${actionVerb} (temp)`, "success");
  };

  /* CONFIRM PERMISSIONS AND NAVIGATE TO RUN ROUTE */
  const handleConfirmAssessment = () => {
    if (!jobRowSelectedForPermissions) return;
    const base = isJobSeeker ? "/jobseeker/assessments/run" : "/hr/assessments/run";
    navigate(`${base}/${jobRowSelectedForPermissions.id}`);
  };

  /* SAVE EDITED ASSESSMENT DOC BACK INTO SESSION STORE */
  const handleSaveAssessment = ({ jobId, doc }) => {
    __sessionScopedAssessmentDocumentsMap.set(jobId, doc);
    pushToast("Assessment updated", "success");
    setJobRowBeingEdited(null);
    setAssessmentDocDraftForEditor(null);
  };

  /* CLOSE HELPERS FOR MODALS */
  const handleClosePermissionModal = () => setJobRowSelectedForPermissions(null);
  const handleCloseEditModal = () => {
    setJobRowBeingEdited(null);
    setAssessmentDocDraftForEditor(null);
  };

  /* LOADING/ERROR GATES */
  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Loading assessments…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-rose-600">
        Failed to load: {error?.message || "Unknown error"}
      </div>
    );
  }

  /* =============================================================================
     MAIN RENDER
     ========================================================================== */
  return (
    <div className="relative space-y-3">
      {/* TOAST NOTIFICATIONS */}
      {toastItems.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => popToast(t.id)} />
      ))}

      {/* PERMISSION MODAL FOR JOBSEEKER RUN */}
      {jobRowSelectedForPermissions && (
        <PermissionModal
          company={jobRowSelectedForPermissions.company}
          role={jobRowSelectedForPermissions.role}
          onClose={handleClosePermissionModal}
          onConfirm={handleConfirmAssessment}
        />
      )}

      {/* EDIT ASSESSMENT MODAL (HR ONLY) */}
      {jobRowBeingEdited && isHR && (
        <EditAssessmentModal
          jobRow={jobRowBeingEdited}
          initialDoc={assessmentDocDraftForEditor}
          onClose={handleCloseEditModal}
          onSave={handleSaveAssessment}
        />
      )}

      {/* SEARCH AND ARCHIVE TOGGLE */}
      <div className="bg-white border rounded-2xl p-3 shadow-sm flex gap-2 items-center max-[400px]:flex-col max-[400px]:items-stretch">
        <input
          value={searchQueryText}
          onChange={(e) => {
            setSearchQueryText(e.target.value);
            setCurrentPageIndexOneBased(1);
          }}
          placeholder="Search company or role…"
          className="border rounded-lg px-3 py-2 flex-1 max-[400px]:w-full"
        />
        <button
          onClick={() => setShouldShowArchivedRows(!shouldShowArchivedRows)}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition max-[400px]:w-full max-[400px]:justify-center ${
            shouldShowArchivedRows
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
            <path
              fillRule="evenodd"
              d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {shouldShowArchivedRows ? "Hide Archived" : "Show Archived"}
        </button>
      </div>

      {/* CATALOG LIST (BACKED BY JOBS) */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* HEADER ROW (HIDDEN ON SMALL SCREENS) */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-3 border-b text-xs font-semibold text-slate-600">
          <div className="col-span-4">Company</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-2">Dates</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <ul className="divide-y divide-slate-100">
          {currentPageItems.map((row) => {
            const statusInfo = buildStatusForRow(row);
            const pillClassName =
              statusInfo.kind === "open"
                ? "bg-emerald-100 text-emerald-700"
                : statusInfo.kind === "upcoming"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-200 text-slate-600";

            const canStart = statusInfo.kind === "open";

            return (
              <li key={row.id} className={`px-4 py-3 ${row.archived ? "bg-slate-50" : ""}`}>
                {/* MOBILE-FIRST STACKING; SWITCH TO GRID ON SM+ */}
                <div className="grid grid-cols-1 sm:grid-cols-12 items-start gap-2">
                  {/* COMPANY */}
                  <div className="sm:col-span-4">
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {row.company}
                      {row.archived && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">Job #{row.id}</div>
                  </div>

                  {/* ROLE */}
                  <div className="sm:col-span-3 text-slate-700">{row.role}</div>

                  {/* DATES + RELATIVE STATUS */}
                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
                      <span>
                        {formatDateFromMs(row.start)} – {formatDateFromMs(row.end)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${pillClassName}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="sm:col-span-3 sm:text-right">
                    <div className="flex flex-wrap gap-2 justify-start sm:justify-end pt-2 sm:pt-0">
                      {/* ARCHIVE/UNARCHIVE (SESSION-ONLY) */}
                      <button
                        onClick={() => handleArchiveAssessment(row)}
                        className={`w-full sm:w-auto p-2 rounded-lg transition ${
                          row.archived
                            ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={row.archived ? "Unarchive (temp)" : "Archive (temp)"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                          <path
                            fillRule="evenodd"
                            d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* EDIT (HR ONLY; SESSION-ONLY DOC) */}
                      {!isJobSeeker && (
                        <button
                          onClick={() => handleEditAssessment(row)}
                          className="w-full sm:w-auto p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                          title="Edit (temp)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      )}

                      {/* START (JOBSEEKER ONLY) */}
                      {isJobSeeker && (
                        <button
                          disabled={!canStart}
                          onClick={() => handleStartAssessment(row)}
                          className={`w-full sm:w-auto p-2 rounded-lg transition ${
                            canStart
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                          title="Start Assessment"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}

                      {/* DELETE FROM VIEW (HR ONLY; UI-ONLY HIDE) */}
                      {!isJobSeeker && (
                        <button
                          onClick={() => handleDeleteAssessment(row)}
                          className="w-full sm:w-auto p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                          title="Delete (temp)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {currentPageItems.length === 0 && (
            <li className="px-4 py-10 text-center text-slate-500">No results</li>
          )}
        </ul>

        {/* PAGINATION CONTROLS */}
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t">
          <button
            onClick={() => setCurrentPageIndexOneBased((p) => Math.max(1, p - 1))}
            disabled={currentPageIndexOneBased === 1}
            className={`px-3 py-1.5 rounded-md border text-sm transition ${
              currentPageIndexOneBased === 1
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">
            Page <span className="font-medium">{currentPageIndexOneBased}</span> / {totalPageCount}
          </span>
          <button
            onClick={() =>
              setCurrentPageIndexOneBased((p) => Math.min(totalPageCount, p + 1))
            }
            disabled={currentPageIndexOneBased === totalPageCount}
            className={`px-3 py-1.5 rounded-md border text-sm transition ${
              currentPageIndexOneBased === totalPageCount
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
