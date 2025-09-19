// /src/pages/CandidatePage.jsx
import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate, getTimeline } from "../api/services/candidates.js";

// FORMAT A UNIX TIMESTAMP OR MS VALUE INTO A SHORT DATE STRING FOR DISPLAY
const formatDateForDisplay = (ms) =>
  new Date(ms).toLocaleDateString();

// FORMAT A UNIX TIMESTAMP OR MS VALUE INTO A SHORT TIME STRING FOR DISPLAY
const formatTimeForDisplay = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function CandidatePage() {
  // READ THE CANDIDATE IDENTIFIER FROM THE ROUTE PARAMS (STRING BY DEFAULT)
  const { id: routeIdParamString } = useParams();

  // ACCESS ANY STATE PASSED VIA NAVIGATION (FALLBACK CANDIDATE INFO MAY LIVE HERE)
  const routeLocation = useLocation();

  // PROVIDE A WAY TO GO BACK TO THE PREVIOUS PAGE OR DIFFERENT ROUTES
  const navigateToPrevious = useNavigate();

  // CHOOSE THE MOST RELIABLE CANDIDATE ID: PREFER URL PARAM, FALL BACK TO ROUTE STATE
  const candidateIdFromRoute = Number(routeIdParamString);
  const candidateIdFromState = Number(routeLocation.state?.candidate?.id);
  const resolvedCandidateId = Number.isFinite(candidateIdFromRoute)
    ? candidateIdFromRoute
    : Number.isFinite(candidateIdFromState)
    ? candidateIdFromState
    : undefined;

  // FETCH THE CANDIDATE RECORD WHEN WE HAVE A VALID ID
  const candidateQueryResult = useQuery({
    queryKey: ["candidate", resolvedCandidateId],
    queryFn: () => getCandidate(resolvedCandidateId),
    enabled: Number.isFinite(resolvedCandidateId), // ONLY RUN WHEN ID IS VALID
  });

  // FETCH THE CANDIDATE TIMELINE (STATUS UPDATES, NOTES, ETC.) WHEN ID IS VALID
  const timelineQueryResult = useQuery({
    queryKey: ["timeline", resolvedCandidateId],
    queryFn: () => getTimeline(resolvedCandidateId),
    enabled: Number.isFinite(resolvedCandidateId), // ONLY RUN WHEN ID IS VALID
  });

  // IF THE ID IS MISSING OR NOT NUMERIC, STOP EARLY AND INFORM THE USER
  if (!Number.isFinite(resolvedCandidateId)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6 text-rose-600">
          Invalid candidate id.
        </div>
      </div>
    );
  }

  // WHILE ANY REQUIRED QUERY IS IN-FLIGHT, SHOW A LIGHTWEIGHT LOADING STATE
  if (candidateQueryResult.isLoading || timelineQueryResult.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6 text-slate-500">
          Loading candidate…
        </div>
      </div>
    );
  }

  // IF THE PRIMARY CANDIDATE QUERY ERRS, GIVE A WAY TO GO BACK AND SHOW THE MESSAGE
  if (candidateQueryResult.isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => navigateToPrevious(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="mt-4 rounded-2xl border bg-white p-6 text-rose-600">
          Failed to load candidate: {candidateQueryResult.error?.message || "Unknown error"}
        </div>
      </div>
    );
  }

  // USE SAFE FALLBACKS WHEN DATA MAY BE PARTIALLY UNDEFINED
  const candidateRecord = candidateQueryResult.data || {};
  const candidateTimelineItems = timelineQueryResult.data?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* TOP BAR WITH A BACK BUTTON AND A DEBUG-FRIENDLY ROUTE INDICATOR */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateToPrevious(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="ml-2 text-xs text-slate-500">
          Route: <code>/hr/candidates/{resolvedCandidateId}</code>
        </div>
      </div>

      {/* PRIMARY CANDIDATE SUMMARY CARD (BASIC FIELDS + CURRENT STAGE BADGE) */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="text-lg font-semibold text-slate-800">
            {candidateRecord.name || "Candidate"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {(candidateRecord.stage || "applied").toUpperCase()}
            </span>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* CONTACT LINE: EMAIL IS PRIMARY; LOCATION IS OPTIONAL */}
          <div className="text-slate-600">
            <span className="font-medium">{candidateRecord.email}</span>
            {candidateRecord.location ? <> · {candidateRecord.location}</> : null}
          </div>

          {/* KEY FACTS GRID: ONLY RENDER PANELS WHEN VALUES EXIST */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {candidateRecord.position && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Position</div>
                <div>{candidateRecord.position}</div>
              </div>
            )}
            {candidateRecord.experience && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Experience</div>
                <div>{candidateRecord.experience}</div>
              </div>
            )}
            {candidateRecord.phone && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Phone</div>
                <div>{candidateRecord.phone}</div>
              </div>
            )}
            {Array.isArray(candidateRecord.skills) && candidateRecord.skills.length > 0 && (
              <div className="rounded-lg border p-3 col-span-2">
                <div className="text-slate-500">Skills</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {candidateRecord.skills.map((skillName, idx) => (
                    <span
                      key={`${skillName}-${idx}`}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                    >
                      {skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TIMELINE OF STATUS CHANGES AND NOTES (MOST RECENT ITEMS INCLUDED) */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b font-semibold text-slate-800">
          Timeline
        </div>

        {timelineQueryResult.isError ? (
          // HANDLE TIMELINE LOAD ERRORS INDEPENDENTLY FROM THE CANDIDATE CARD
          <div className="p-5 text-rose-600">Failed to load timeline.</div>
        ) : (
          <ul className="divide-y">
            {candidateTimelineItems.length === 0 ? (
              // NO ENTRIES FOUND FOR THIS CANDIDATE
              <li className="px-5 py-6 text-sm text-slate-500">No timeline items.</li>
            ) : (
              // RENDER EACH TIMELINE ENTRY WITH STAGE, NOTE, AUTHOR, AND TIMESTAMP
              candidateTimelineItems.map((timelineItem, index) => (
                <li key={index} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {(timelineItem.stage || "").toUpperCase()}
                      </div>
                      {timelineItem.note ? (
                        <div className="text-[13px] text-slate-600 mt-0.5">
                          {timelineItem.note}
                        </div>
                      ) : null}
                      {timelineItem.by ? (
                        <div className="text-[12px] text-slate-500 mt-0.5">
                          By: {timelineItem.by}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateForDisplay(timelineItem.ts)} · {formatTimeForDisplay(timelineItem.ts)}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
