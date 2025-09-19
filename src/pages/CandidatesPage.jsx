// src/pages/CandidatesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { listCandidates, patchCandidate } from "../api/services/candidates.js";
import { listJobs } from "../api/services/jobs.js";

/* 
   CONSTANTS AND PURE HELPERS
   PURPOSE: PROVIDE DISPLAY ORDER, BADGE CLASSES, NORMALIZERS, AND PERSISTENCE
    */
const ALL_PIPELINE_STAGES_IN_DISPLAY_ORDER = [
  "APPLIED",
  "SCREEN",
  "TECH",
  "OFFER",
  "HIRED",
  "REJECTED",
];

const stagePillClassByDisplayStage = {
  APPLIED: "bg-blue-100 text-blue-700",
  SCREEN: "bg-yellow-100 text-yellow-700",
  TECH: "bg-purple-100 text-purple-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

/* NORMALIZE TO DISPLAY (UPPERCASE) */
const toDisplayStageUpper = (value) => (value || "").toUpperCase();

/* NORMALIZE FOR SERVER (LOWERCASE) */
const toServerStageLower = (value) => (value || "").toLowerCase();

/* LOCALSTORAGE KEYS FOR SHORTLIST/REJECT FLAGS */
const LOCALSTORAGE_KEY_SHORTLISTED_EMAILS = "shortlisted_emails";
const LOCALSTORAGE_KEY_REJECTED_EMAILS = "rejected_emails";

/* READ/WRITE SHORTLIST AND REJECT ARRAYS SAFELY */
const readShortlistedEmailsFromLocalStorage = () => {
  try {
    return JSON.parse(
      localStorage.getItem(LOCALSTORAGE_KEY_SHORTLISTED_EMAILS) || "[]"
    );
  } catch {
    return [];
  }
};
const readRejectedEmailsFromLocalStorage = () => {
  try {
    return JSON.parse(
      localStorage.getItem(LOCALSTORAGE_KEY_REJECTED_EMAILS) || "[]"
    );
  } catch {
    return [];
  }
};
const writeShortlistedEmailsToLocalStorage = (emails) => {
  localStorage.setItem(
    LOCALSTORAGE_KEY_SHORTLISTED_EMAILS,
    JSON.stringify(Array.from(new Set(emails)))
  );
};
const writeRejectedEmailsToLocalStorage = (emails) => {
  localStorage.setItem(
    LOCALSTORAGE_KEY_REJECTED_EMAILS,
    JSON.stringify(Array.from(new Set(emails)))
  );
};

/* 
   KANBAN BOARD MODAL
   RESPONSIBILITY: GROUP CANDIDATES BY STAGE AND ALLOW DRAG-AND-DROP STAGE MOVE
    */
function KanbanBoardModal({ candidates, onMoveStage, onClose }) {
  /* BUILD COLUMNS GROUPED BY DISPLAY STAGE KEYS */
  const columnDataByStage = useMemo(() => {
    const initial = Object.fromEntries(
      ALL_PIPELINE_STAGES_IN_DISPLAY_ORDER.map((s) => [s, []])
    );
    candidates.forEach((cand) => {
      const stageKey = toDisplayStageUpper(cand.stage);
      if (initial[stageKey]) initial[stageKey].push(cand);
    });
    return initial;
  }, [candidates]);

  /* HANDLE DRAG-END TO MOVE BETWEEN STAGES */
  function handleDragEndStageChange(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const movedCandidateId = Number(draggableId);
    const nextStageLower = toServerStageLower(destination.droppableId);
    onMoveStage(movedCandidateId, nextStageLower);
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* CLICKING BACKDROP CLOSES MODAL */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 p-2 sm:p-4 overflow-auto">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-2xl border bg-white shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-5 py-3 border-b">
              <div className="text-base sm:text-lg font-semibold text-slate-800">
                Talent Pipeline
              </div>
              <button
                className="w-full sm:w-auto px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className="px-3 sm:px-4 py-3 sm:py-4">
              <DragDropContext onDragEnd={handleDragEndStageChange}>
                <div className="overflow-x-auto pb-2">
                  {/* MOBILE USES HORIZONTAL FLOW; DESKTOP USES GRID */}
                  <div className="grid grid-flow-col auto-cols-[280px] sm:auto-cols-[320px] gap-3 sm:gap-4 md:grid-flow-row md:grid-cols-3 xl:grid-cols-6">
                    {ALL_PIPELINE_STAGES_IN_DISPLAY_ORDER.map((stageKey) => (
                      <div key={stageKey} className="flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold text-slate-700">
                            {stageKey}
                          </div>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              stagePillClassByDisplayStage[stageKey] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {columnDataByStage[stageKey]?.length ?? 0}
                          </span>
                        </div>

                        <Droppable droppableId={stageKey} type="CARD">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-[55vh] sm:min-h-[60vh] rounded-xl border p-2 transition ${
                                snapshot.isDraggingOver
                                  ? "bg-indigo-50 border-indigo-200"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              {(columnDataByStage[stageKey] || []).map(
                                (cand, index) => (
                                  <Draggable
                                    key={String(cand.id)}
                                    draggableId={String(cand.id)}
                                    index={index}
                                  >
                                    {(dragProvided, dragSnapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        className={`rounded-xl bg-white border p-3 shadow-sm mb-2 transition ${
                                          dragSnapshot.isDragging
                                            ? "rotate-[0.2deg] shadow-md"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-medium text-slate-700">
                                              {cand.name?.[0] || "?"}
                                            </div>
                                            <div>
                                              <div className="text-[13px] font-medium text-slate-900">
                                                {cand.name}
                                              </div>
                                              <div className="text-[11px] text-slate-500">
                                                {cand.position || "—"}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                )
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </div>
                </div>
              </DragDropContext>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 
   CANDIDATES PAGE (DEFAULT EXPORT)
   RESPONSIBILITY: LOAD CANDIDATES/JOBS, HYDRATE POSITION, FILTER/PAGE/VIRTUALIZE,
                   SUPPORT STAGE MOVES WITH OPTIMISTIC UPDATE, AND PERSIST BADGES
    */
export default function CandidatesPage() {
  const navigate = useNavigate();

  /* DATA ARRAYS AND NETWORK STATE */
  const [allCandidateRecordsForUi, setAllCandidateRecordsForUi] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [loadingErrorMessage, setLoadingErrorMessage] = useState(null);

  /* FILTERING, STAGE SELECTOR, PAGINATION, AND KANBAN VISIBILITY */
  const [searchQueryText, setSearchQueryText] = useState("");
  const [selectedStageDisplayValue, setSelectedStageDisplayValue] =
    useState("");
  const [currentPageIndexOneBased, setCurrentPageIndexOneBased] = useState(1);
  const [isKanbanBoardVisible, setIsKanbanBoardVisible] = useState(false);

  /* LOCAL BADGE STATE FOR SHORTLIST/REJECT */
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [rejectedCandidates, setRejectedCandidates] = useState([]);

  /* VIRTUALIZATION CONSTANTS */
  const pageSize = 10;
  const ITEM_HEIGHT_PIXELS = 92;
  const virtualListRef = useRef(null);

  /* LOAD CANDIDATES AND JOB TITLES; HYDRATE POSITION FROM JOB WHEN MISSING */
  useEffect(() => {
    let didAbort = false;

    async function fetchCandidatesAndJobs() {
      try {
        setIsLoadingCandidates(true);
        setLoadingErrorMessage(null);

        const [jobsResponse, candidatesResponse] = await Promise.all([
          listJobs({ page: 1, pageSize: 2000, sort: "order" }),
          listCandidates({ page: 1, pageSize: 2000 }),
        ]);

        const jobTitleById = new Map(
          (jobsResponse.items || []).map((j) => [j.id, j.title])
        );

        const hydratedCandidates = (candidatesResponse.items || []).map(
          (c) => ({
            ...c,
            position: c.position || jobTitleById.get(c.jobId) || "—",
          })
        );

        if (!didAbort) setAllCandidateRecordsForUi(hydratedCandidates);
      } catch (e) {
        if (!didAbort) setLoadingErrorMessage(e?.message || "Failed to load");
      } finally {
        if (!didAbort) setIsLoadingCandidates(false);
      }
    }

    fetchCandidatesAndJobs();
    return () => {
      didAbort = true;
    };
  }, []);

  /* INITIALIZE SHORTLIST/REJECT BADGES AFTER DATA ARRIVES */
  useEffect(() => {
    const shortlistedEmails = readShortlistedEmailsFromLocalStorage();
    const rejectedEmails = readRejectedEmailsFromLocalStorage();
    setShortlistedCandidates(
      allCandidateRecordsForUi.filter((c) =>
        shortlistedEmails.includes(c.email)
      )
    );
    setRejectedCandidates(
      allCandidateRecordsForUi.filter((c) => rejectedEmails.includes(c.email))
    );
  }, [allCandidateRecordsForUi]);

  /* PERSIST BADGES BACK TO LOCALSTORAGE WHEN THEY CHANGE */
  useEffect(() => {
    writeShortlistedEmailsToLocalStorage(
      shortlistedCandidates.map((c) => c.email)
    );
  }, [shortlistedCandidates]);
  useEffect(() => {
    writeRejectedEmailsToLocalStorage(rejectedCandidates.map((c) => c.email));
  }, [rejectedCandidates]);

  /* FILTER AND PAGE DERIVATIONS FOR VIRTUALIZED LIST */
  const { filteredAll, totalCount, totalPageCount } = useMemo(() => {
    const normalizedQuery = searchQueryText.trim().toLowerCase();
    const wantedStageLower = selectedStageDisplayValue
      ? toServerStageLower(selectedStageDisplayValue)
      : "";

    const filtered = allCandidateRecordsForUi.filter((c) => {
      const stageMatches =
        !wantedStageLower || String(c.stage).toLowerCase() === wantedStageLower;
      const textMatches =
        !normalizedQuery ||
        (c.name && c.name.toLowerCase().includes(normalizedQuery)) ||
        (c.email && c.email.toLowerCase().includes(normalizedQuery));
      return stageMatches && textMatches;
    });

    return {
      filteredAll: filtered,
      totalCount: filtered.length,
      totalPageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
    };
  }, [allCandidateRecordsForUi, searchQueryText, selectedStageDisplayValue]);

  /* ENSURE CURRENT PAGE IS WITHIN BOUNDS AFTER FILTERS CHANGE */
  useEffect(() => {
    if (currentPageIndexOneBased > totalPageCount) {
      setCurrentPageIndexOneBased(totalPageCount);
    }
  }, [currentPageIndexOneBased, totalPageCount]);

  /* SCROLL VIRTUAL LIST TO TOP OF CURRENT PAGE WHEN PAGE CHANGES */
  useEffect(() => {
    const startIndex = (currentPageIndexOneBased - 1) * pageSize;
    virtualListRef.current?.scrollToItem(
      Math.min(startIndex, Math.max(0, totalCount - 1)),
      "start"
    );
  }, [currentPageIndexOneBased, totalCount]);

  const atFirstPage = currentPageIndexOneBased === 1;
  const atLastPage = currentPageIndexOneBased === totalPageCount;

  /* OPEN CANDIDATE PROFILE ROUTE WITH FALLBACK STATE SAVED */
  function handleOpenCandidateProfile(candidateRecord) {
    sessionStorage.setItem(
      "candidate_profile_last",
      JSON.stringify(candidateRecord)
    );
    navigate(`/hr/candidates/${candidateRecord.id}`, {
      state: { candidate: candidateRecord },
    });
  }

  /* MOVE STAGE WITH OPTIMISTIC UPDATE AND ROLLBACK ON FAILURE */
  async function moveCandidateToNewStageWithOptimisticUpdate(
    candidateId,
    nextStageLower
  ) {
    const previousRecord = allCandidateRecordsForUi.find(
      (c) => c.id === candidateId
    );
    const previousStage = previousRecord?.stage;

    setAllCandidateRecordsForUi((list) =>
      list.map((c) =>
        c.id === candidateId ? { ...c, stage: nextStageLower } : c
      )
    );

    try {
      await patchCandidate(candidateId, {
        stage: nextStageLower,
        by: "Pipeline",
        note: `Moved to ${nextStageLower}`,
      });
    } catch {
      setAllCandidateRecordsForUi((list) =>
        list.map((c) =>
          c.id === candidateId ? { ...c, stage: previousStage } : c
        )
      );
    }
  }

  /* VIRTUALIZED ROW RENDERER */
  const VirtualizedCandidateRow = ({ index, style }) => {
    const cand = filteredAll[index];
    if (!cand) return <div style={style} className="px-1" />;

    const isShortlisted = shortlistedCandidates.some(
      (sc) => sc.email === cand.email
    );
    const isRejected = rejectedCandidates.some((rc) => rc.email === cand.email);
    const displayStage = toDisplayStageUpper(cand.stage);

    return (
      <div style={style} className="px-0">
        <div
          className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition cursor-pointer relative"
          onClick={() => handleOpenCandidateProfile(cand)}
        >
          {isShortlisted && (
            <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 p-1 rounded-full">
              <span className="text-emerald-600">✓</span>
            </div>
          )}
          {isRejected && (
            <div className="absolute top-4 right-4 bg-red-100 text-red-700 p-1 rounded-full">
              <span className="text-red-600">✕</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-200 grid place-items-center text-sm font-medium text-slate-700">
                {cand.name?.[0] || "?"}
              </div>
              <div>
                <div className="text-slate-900 font-semibold text-[15px]">
                  {cand.name}
                </div>
                <div className="text-[12px] text-slate-500">
                  {cand.position || "—"}
                </div>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${
                stagePillClassByDisplayStage[displayStage] ||
                "bg-slate-100 text-slate-700"
              }`}
            >
              {displayStage}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /* STABLE KEY FOR VIRTUALIZED ROWS */
  const virtualizedRowKey = (index) => {
    const cand = filteredAll[index];
    return cand ? `${cand.id}-${cand.email}` : `empty-${index}`;
    // NOTE: KEYS HELP THE VIRTUALIZER PRESERVE ROW STATE
  };

  /* 
     RENDER GATES FOR LOADING/ERROR, THEN MAIN UI
      */
  if (isLoadingCandidates) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Loading candidates…
      </div>
    );
  }
  if (loadingErrorMessage) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-red-600">
        Failed to load candidates: {loadingErrorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* FILTER BAR AND KANBAN ENTRYPOINT */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white border rounded-2xl p-3 shadow-sm">
        <input
          value={searchQueryText}
          onChange={(e) => {
            setSearchQueryText(e.target.value);
            setCurrentPageIndexOneBased(1);
          }}
          placeholder="Search candidates by name or email…"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200 w-full sm:flex-1"
        />
        <select
          value={selectedStageDisplayValue}
          onChange={(e) => {
            setSelectedStageDisplayValue(e.target.value);
            setCurrentPageIndexOneBased(1);
          }}
          className="border rounded-lg px-3 py-2 w-full sm:w-[180px]"
        >
          <option value="">All stages</option>
          {ALL_PIPELINE_STAGES_IN_DISPLAY_ORDER.map((stageLabel) => (
            <option key={stageLabel} value={stageLabel}>
              {stageLabel}
            </option>
          ))}
        </select>

        <button
          onClick={() => setIsKanbanBoardVisible(true)}
          className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
          title="Open Kanban Board"
        >
          Kanban Board
        </button>
      </div>

      {/* VIRTUALIZED LIST OF FILTERED CANDIDATES */}
      {totalCount === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          No candidates found.
        </div>
      ) : (
        <List
          ref={virtualListRef}
          height={520}
          width="100%"
          itemCount={totalCount}
          itemSize={ITEM_HEIGHT_PIXELS}
          overscanCount={6}
          itemKey={virtualizedRowKey}
        >
          {VirtualizedCandidateRow}
        </List>
      )}

      {/* KANBAN OVERLAY FOR DRAG-AND-DROP STAGE MOVES */}
      {isKanbanBoardVisible && (
        <KanbanBoardModal
          candidates={allCandidateRecordsForUi}
          onMoveStage={moveCandidateToNewStageWithOptimisticUpdate}
          onClose={() => setIsKanbanBoardVisible(false)}
        />
      )}
    </div>
  );
}
