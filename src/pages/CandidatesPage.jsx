// src/pages/CandidatesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { listCandidates, patchCandidate } from "../api/services/candidates.js";
import { listJobs } from "../api/services/jobs.js";

/* -------------------------- CONSTANTS -------------------------- */

// Pipeline stages and display order
const ALL_PIPELINE_STAGES = ["APPLIED", "SCREEN", "TECH", "OFFER", "HIRED", "REJECTED"];

// Badge colors by stage
const stageBadgeClass = {
  APPLIED: "bg-blue-100 text-blue-700",
  SCREEN: "bg-yellow-100 text-yellow-700",
  TECH: "bg-purple-100 text-purple-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

// Normalizers
const toDisplayStageUpper = (s) => (s || "").toUpperCase();
const toServerStageLower = (s) => (s || "").toLowerCase();

// LocalStorage keys
const LS_SHORTLISTED = "shortlisted_emails";
const LS_REJECTED = "rejected_emails";

// Helpers to read/write shortlisted/rejected emails
const readFromLS = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
const writeToLS = (key, array) => {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(array))));
};

/* ------------------------ KANBAN MODAL ------------------------ */

function KanbanBoardModal({ candidates, onMoveStage, onClose }) {
  // Group candidates by stage
  const columnsByStage = useMemo(() => {
    const cols = Object.fromEntries(ALL_PIPELINE_STAGES.map((s) => [s, []]));
    candidates.forEach((c) => {
      const stage = toDisplayStageUpper(c.stage);
      if (cols[stage]) cols[stage].push(c);
    });
    return cols;
  }, [candidates]);

  // Handle drag-and-drop stage change
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    onMoveStage(Number(draggableId), toServerStageLower(destination.droppableId));
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop closes modal */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 p-2 sm:p-4 overflow-auto">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-2xl border bg-white shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-5 py-3 border-b">
              <div className="text-base sm:text-lg font-semibold text-slate-800">Talent Pipeline</div>
              <button
                className="w-full sm:w-auto px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            {/* Columns */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 overflow-x-auto">
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-flow-col auto-cols-[280px] sm:auto-cols-[320px] gap-3 sm:gap-4 md:grid-flow-row md:grid-cols-3 xl:grid-cols-6">
                  {ALL_PIPELINE_STAGES.map((stage) => (
                    <div key={stage} className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-700">{stage}</div>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full ${
                            stageBadgeClass[stage] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {columnsByStage[stage]?.length || 0}
                        </span>
                      </div>

                      <Droppable droppableId={stage} type="CARD">
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
                            {(columnsByStage[stage] || []).map((cand, idx) => (
                              <Draggable key={cand.id} draggableId={String(cand.id)} index={idx}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`rounded-xl bg-white border p-3 shadow-sm mb-2 transition ${
                                      dragSnapshot.isDragging ? "rotate-[0.2deg] shadow-md" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-medium text-slate-700">
                                        {cand.name?.[0] || "?"}
                                      </div>
                                      <div>
                                        <div className="text-[13px] font-medium text-slate-900">{cand.name}</div>
                                        <div className="text-[11px] text-slate-500">{cand.position || "—"}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------ CANDIDATES PAGE ------------------------ */

export default function CandidatesPage() {
  const navigate = useNavigate();

  /* -------------------- DATA AND STATE -------------------- */
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isKanbanOpen, setIsKanbanOpen] = useState(false);

  const [shortlisted, setShortlisted] = useState([]);
  const [rejected, setRejected] = useState([]);

  const ITEM_HEIGHT = 92;
  const PAGE_SIZE = 10;
  const listRef = useRef(null);

  /* -------------------- FETCH CANDIDATES AND JOBS -------------------- */
  useEffect(() => {
    let aborted = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [jobsRes, candidatesRes] = await Promise.all([
          listJobs({ page: 1, pageSize: 2000 }),
          listCandidates({ page: 1, pageSize: 2000 }),
        ]);

        if (aborted) return;

        const jobMap = new Map((jobsRes.items || []).map((j) => [j.id, j.title]));
        const hydratedCandidates = (candidatesRes.items || []).map((c) => ({
          ...c,
          position: c.position || jobMap.get(c.jobId) || "—",
        }));

        setCandidates(hydratedCandidates);
        setJobs(jobsRes.items || []);
      } catch (err) {
        if (!aborted) setError(err?.message || "Failed to load");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchData();
    return () => (aborted = true);
  }, []);

  /* -------------------- LOAD SHORTLIST/REJECT FROM LOCALSTORAGE -------------------- */
  useEffect(() => {
    const shortlistedEmails = readFromLS(LS_SHORTLISTED);
    const rejectedEmails = readFromLS(LS_REJECTED);

    setShortlisted(candidates.filter((c) => shortlistedEmails.includes(c.email)));
    setRejected(candidates.filter((c) => rejectedEmails.includes(c.email)));
  }, [candidates]);

  /* -------------------- PERSIST SHORTLIST/REJECT -------------------- */
  useEffect(() => writeToLS(LS_SHORTLISTED, shortlisted.map((c) => c.email)), [shortlisted]);
  useEffect(() => writeToLS(LS_REJECTED, rejected.map((c) => c.email)), [rejected]);

  /* -------------------- FILTERED & PAGINATED CANDIDATES -------------------- */
  const { filteredCandidates, totalCount, totalPages } = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const stageLower = selectedStage ? toServerStageLower(selectedStage) : "";

    const filtered = candidates.filter((c) => {
      const stageMatch = !stageLower || c.stage?.toLowerCase() === stageLower;
      const textMatch =
        !query ||
        (c.name?.toLowerCase().includes(query)) ||
        (c.email?.toLowerCase().includes(query));
      return stageMatch && textMatch;
    });

    return {
      filteredCandidates: filtered,
      totalCount: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    };
  }, [candidates, searchText, selectedStage]);

  /* Adjust page if out of bounds */
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  /* Scroll virtual list to top of current page */
  useEffect(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    listRef.current?.scrollToItem(Math.min(startIndex, Math.max(0, totalCount - 1)), "start");
  }, [currentPage, totalCount]);

  /* -------------------- NAVIGATION -------------------- */
  const openCandidateProfile = (c) => {
    sessionStorage.setItem("candidate_profile_last", JSON.stringify(c));
    navigate(`/hr/candidates/${c.id}`, { state: { candidate: c } });
  };

  /* -------------------- OPTIMISTIC STAGE MOVE -------------------- */
  const moveCandidateStage = async (id, nextStage) => {
    const prev = candidates.find((c) => c.id === id)?.stage;

    setCandidates((list) =>
      list.map((c) => (c.id === id ? { ...c, stage: nextStage } : c))
    );

    try {
      await patchCandidate(id, { stage: nextStage, by: "Pipeline", note: `Moved to ${nextStage}` });
    } catch {
      // rollback on error
      setCandidates((list) =>
        list.map((c) => (c.id === id ? { ...c, stage: prev } : c))
      );
    }
  };

  /* -------------------- VIRTUALIZED CANDIDATE ROW -------------------- */
  const CandidateRow = ({ index, style }) => {
    const c = filteredCandidates[index];
    if (!c) return <div style={style} />;

    const isShortlisted = shortlisted.some((s) => s.email === c.email);
    const isRejected = rejected.some((r) => r.email === c.email);
    const stage = toDisplayStageUpper(c.stage);

    return (
      <div style={style} className="px-0">
        <div
          className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition cursor-pointer relative"
          onClick={() => openCandidateProfile(c)}
        >
          {isShortlisted && <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 p-1 rounded-full">✓</div>}
          {isRejected && <div className="absolute top-4 right-4 bg-red-100 text-red-700 p-1 rounded-full">✕</div>}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-200 grid place-items-center text-sm font-medium text-slate-700">{c.name?.[0] || "?"}</div>
              <div>
                <div className="text-slate-900 font-semibold text-[15px]">{c.name}</div>
                <div className="text-[12px] text-slate-500">{c.position || "—"}</div>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${stageBadgeClass[stage] || "bg-slate-100 text-slate-700"}`}>{stage}</span>
          </div>
        </div>
      </div>
    );
  };

  const rowKey = (index) => {
    const c = filteredCandidates[index];
    return c ? `${c.id}-${c.email}` : `empty-${index}`;
  };

  /* -------------------- RENDER -------------------- */
  if (loading) return <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Loading candidates…</div>;
  if (error) return <div className="rounded-2xl border bg-white p-8 text-center text-red-600">Failed to load: {error}</div>;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white border rounded-2xl p-3 shadow-sm">
        <input
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
          placeholder="Search candidates by name or email…"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200 w-full sm:flex-1"
        />
        <select
          value={selectedStage}
          onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
          className="border rounded-lg px-3 py-2 w-full sm:w-[180px]"
        >
          <option value="">All stages</option>
          {ALL_PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
        <button
          onClick={() => setIsKanbanOpen(true)}
          className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
        >
          Kanban Board
        </button>
      </div>

      {/* Candidate list */}
      {totalCount === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">No candidates found.</div>
      ) : (
        <List
          ref={listRef}
          height={520}
          width="100%"
          itemCount={totalCount}
          itemSize={ITEM_HEIGHT}
          overscanCount={6}
          itemKey={rowKey}
        >
          {CandidateRow}
        </List>
      )}

      {/* Kanban modal */}
      {isKanbanOpen && (
        <KanbanBoardModal
          candidates={candidates}
          onMoveStage={moveCandidateStage}
          onClose={() => setIsKanbanOpen(false)}
        />
      )}
    </div>
  );
}
