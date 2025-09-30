// /src/pages/CandidatePage.jsx
import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate, getTimeline } from "../api/services/candidates.js";

// Simple date/time formatting
const formatDate = (ms) => new Date(ms).toLocaleDateString();
const formatTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function CandidatePage() {
  const { id: routeId } = useParams(); // Get candidate id from URL
  const location = useLocation(); // Optional fallback state
  const navigate = useNavigate();

  // Resolve candidate ID (URL param preferred)
  const candidateId =
    Number.isFinite(Number(routeId)) ? Number(routeId) :
    Number.isFinite(Number(location.state?.candidate?.id)) ? Number(location.state.candidate.id) :
    undefined;

  // Early return if ID is invalid
  if (!Number.isFinite(candidateId)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6 text-rose-600">
          Invalid candidate id.
        </div>
      </div>
    );
  }

  // Fetch candidate info
  const { data: candidate, isLoading: loadingCandidate, isError: errorCandidate, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId),
    enabled: true,
  });

  // Fetch candidate timeline
  const { data: timelineData, isLoading: loadingTimeline, isError: errorTimeline } = useQuery({
    queryKey: ["timeline", candidateId],
    queryFn: () => getTimeline(candidateId),
    enabled: true,
  });

  // Loading state
  if (loadingCandidate || loadingTimeline) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6 text-slate-500">Loading candidate…</div>
      </div>
    );
  }

  // Candidate load error
  if (errorCandidate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="mt-4 rounded-2xl border bg-white p-6 text-rose-600">
          Failed to load candidate: {error?.message || "Unknown error"}
        </div>
      </div>
    );
  }

  const timelineItems = timelineData?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-sm"
        >
          ← Back
        </button>
        <div className="ml-2 text-xs text-slate-500">
          Route: <code>/hr/candidates/{candidateId}</code>
        </div>
      </div>

      {/* Candidate summary */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="text-lg font-semibold text-slate-800">{candidate?.name || "Candidate"}</div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {(candidate?.stage || "applied").toUpperCase()}
          </span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-slate-600">
            <span className="font-medium">{candidate?.email}</span>
            {candidate?.location ? ` · ${candidate.location}` : ""}
          </div>

          {/* Key facts grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {candidate?.position && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Position</div>
                <div>{candidate.position}</div>
              </div>
            )}
            {candidate?.experience && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Experience</div>
                <div>{candidate.experience}</div>
              </div>
            )}
            {candidate?.phone && (
              <div className="rounded-lg border p-3">
                <div className="text-slate-500">Phone</div>
                <div>{candidate.phone}</div>
              </div>
            )}
            {candidate?.skills?.length > 0 && (
              <div className="rounded-lg border p-3 col-span-2">
                <div className="text-slate-500">Skills</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {candidate.skills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b font-semibold text-slate-800">Timeline</div>

        {errorTimeline ? (
          <div className="p-5 text-rose-600">Failed to load timeline.</div>
        ) : timelineItems.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No timeline items.</div>
        ) : (
          <ul className="divide-y">
            {timelineItems.map((item, idx) => (
              <li key={idx} className="px-5 py-4 flex justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{(item.stage || "").toUpperCase()}</div>
                  {item.note && <div className="text-[13px] text-slate-600 mt-0.5">{item.note}</div>}
                  {item.by && <div className="text-[12px] text-slate-500 mt-0.5">By: {item.by}</div>}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(item.ts)} · {formatTime(item.ts)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
