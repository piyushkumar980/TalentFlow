// src/pages/CandidateProfile.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// ENUM-LIKE STAGE LIST USED FOR DISPLAY ORDER AND VALIDATION
const DISPLAY_STAGES = ["APPLIED", "SCREEN", "TECH", "OFFER", "HIRED", "REJECTED"];

// MAP STAGE NAMES TO BADGE CLASSES; USED PURELY FOR STATUS DISTINCTION
const stageBadgeClassByName = {
  APPLIED: "bg-blue-100 text-blue-700",
  SCREEN: "bg-yellow-100 text-yellow-700",
  TECH: "bg-purple-100 text-purple-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

// NORMALIZE ANY INPUT TO AN UPPERCASE STAGE LABEL FOR CONSISTENT RENDERING
const toDisplayStage = (value) => String(value || "").toUpperCase();

export default function CandidateProfile() {
  // READ THE CANDIDATE IDENTIFIER FROM THE ROUTE
  const { id: candidateIdParamString } = useParams();

  // ALLOW RETURNING TO THE PREVIOUS SCREEN WITHOUT LOSING CONTEXT
  const navigateToPreviousRoute = useNavigate();

  // OPTIONALLY RECEIVE A CANDIDATE OBJECT VIA NAVIGATION STATE FOR INSTANT FIRST PAINT
  const { state: navigationState } = useLocation();

  // PRIME LOCAL STATE WITH ANY NAVIGATION-STATE CANDIDATE, OTHERWISE START EMPTY
  const [candidateRecord, setCandidateRecord] = useState(navigationState?.candidate || null);

  // STORE TIMELINE EVENTS FOR THIS CANDIDATE (MOST RECENT FIRST FROM THE API)
  const [candidateTimelineItems, setCandidateTimelineItems] = useState([]);

  // TRACK REMOTE FETCH STATE TO CONTROL LOADING/ERROR UI
  const [isFetchingFromServer, setIsFetchingFromServer] = useState(!navigationState?.candidate);
  const [fetchErrorMessage, setFetchErrorMessage] = useState(null);

  // FETCH THE MOST RECENT CANDIDATE DETAILS AND TIMELINE BY ID
  useEffect(() => {
    let hasComponentUnMounted = false;

    async function fetchCandidateAndTimeline() {
      try {
        // START LOADING STATE BEFORE FIRING PARALLEL REQUESTS
        setIsFetchingFromServer(true);
        setFetchErrorMessage(null);

        // ALWAYS REFRESH BOTH ENTITIES SO THE VIEW REFLECTS LATEST SERVER STATE
        const [candidateResponse, timelineResponse] = await Promise.all([
          fetch(`/candidates/${candidateIdParamString}`),
          fetch(`/candidates/${candidateIdParamString}/timeline`),
        ]);

        // IF PRIMARY CANDIDATE LOOKUP FAILS, ABORT AND SURFACE ERROR
        if (!candidateResponse.ok) {
          throw new Error("Candidate not found");
        }

        // PARSE RESPONSES; TIMELINE MAY BE EMPTY OR MISSING
        const candidateJson = await candidateResponse.json();
        const timelineJson = timelineResponse.ok ? await timelineResponse.json() : { items: [] };

        // SKIP STATE UPDATES IF THE COMPONENT UNMOUNTED MID-REQUEST
        if (hasComponentUnMounted) return;

        // APPLY NEW DATA INTO STATE ATOMICALY
        setCandidateRecord(candidateJson);
        setCandidateTimelineItems(Array.isArray(timelineJson.items) ? timelineJson.items : []);
      } catch (err) {
        // RECORD A HUMAN-READABLE ERROR FOR THE CALLER
        if (!hasComponentUnMounted) {
          setFetchErrorMessage(err?.message || "Failed to load");
        }
      } finally {
        // CLEAR LOADING FLAG IN ALL CASES
        if (!hasComponentUnMounted) {
          setIsFetchingFromServer(false);
        }
      }
    }

    fetchCandidateAndTimeline();
    return () => {
      // MARK AS UNMOUNTED TO PREVENT SETSTATE AFTER UNMOUNT
      hasComponentUnMounted = true;
    };
  }, [candidateIdParamString]);

  // PRECOMPUTE THE CURRENT STAGE BADGE FOR THE HEADER USING MEMOIZATION
  const headerStageBadgeNode = useMemo(() => {
    const displayStage = toDisplayStage(candidateRecord?.stage);
    const badgeClass =
      stageBadgeClassByName[displayStage] || "bg-slate-100 text-slate-700";
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full ${badgeClass}`}>
        {displayStage || "—"}
      </span>
    );
  }, [candidateRecord]);

  // RENDER A THIN LOADING STATE WHILE DATA IS IN-FLIGHT
  if (isFetchingFromServer) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Loading…
      </div>
    );
  }

  // IF FETCH FAILED OR CANDIDATE DOESN'T EXIST, PROVIDE A SAFE WAY BACK
  if (fetchErrorMessage || !candidateRecord) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <div className="text-red-600 mb-3">{fetchErrorMessage || "Not found"}</div>
        <button
          className="px-3 py-1.5 rounded-md border"
          onClick={() => navigateToPreviousRoute(-1)}
        >
          Go back
        </button>
      </div>
    );
  }

  // HAPPY PATH: SHOW CANDIDATE SUMMARY, ATTRIBUTES, NOTES, AND TIMELINE
  return (
    <div className="space-y-4">
      {/* HEADER WITH BACK ACTION AND PRIMARY IDENTITY FIELDS */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigateToPreviousRoute(-1)}
            className="text-indigo-600 hover:text-indigo-800 font-medium mb-3 text-sm"
          >
            ← Back to Candidates
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {candidateRecord.name}
          </h1>
          <p className="text-slate-600 mt-1">{candidateRecord.position || "—"}</p>
        </div>
        {headerStageBadgeNode}
      </div>

      {/* CORE CANDIDATE DETAILS SPLIT INTO SMALLER, SCANNABLE SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONTACT DETAILS PANEL WITH GUARDED FALLBACKS */}
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Contact</h3>
          <div className="space-y-2 text-slate-800">
            <div>
              <span className="text-sm text-slate-500">Email</span>
              <div>{candidateRecord.email || "—"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-500">Phone</span>
              <div>{candidateRecord.phone || "—"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-500">Location</span>
              <div>{candidateRecord.location || "—"}</div>
            </div>
          </div>
        </div>

        {/* STATUS-ORIENTED ATTRIBUTES PANEL */}
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Status</h3>
          <div className="space-y-2 text-slate-800">
            <div>
              <span className="text-sm text-slate-500">Experience</span>
              <div>{candidateRecord.experience || "—"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-500">Current Status</span>
              <div>{candidateRecord.status || "—"}</div>
            </div>
            <div>
              <span className="text-sm text-slate-500">Last Contact</span>
              <div>{candidateRecord.lastContact || "—"}</div>
            </div>
          </div>
        </div>

        {/* SKILLS PANEL RENDERED ONLY WHEN DATA EXISTS */}
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {(candidateRecord.skills || []).map((skillName, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {skillName}
              </span>
            ))}
            {(!candidateRecord.skills || candidateRecord.skills.length === 0) && (
              <div className="text-slate-500">—</div>
            )}
          </div>
        </div>

        {/* EDUCATION PANEL WITH SIMPLE FALLBACK */}
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Education</h3>
          <div className="text-slate-800">{candidateRecord.education || "—"}</div>
        </div>

        {/* FREE-FORM NOTES PANEL; PRESERVES LINE BREAKS */}
        <div className="rounded-2xl border bg-white p-5 md:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Notes</h3>
          <div className="text-slate-800 whitespace-pre-wrap">
            {candidateRecord.notes || "—"}
          </div>
        </div>

        {/* TIMELINE PANEL OF STATUS CHANGES, ACTIVITY, AND OWNERSHIP */}
        <div className="rounded-2xl border bg-white p-5 md:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Timeline</h3>

          <ol className="relative border-l border-slate-200 pl-4">
            {candidateTimelineItems.length === 0 && (
              <div className="text-slate-500">No timeline yet.</div>
            )}

            {candidateTimelineItems.map((timelineItem, idx) => {
              const normalizedStage = toDisplayStage(timelineItem.stage);
              const badgeClass =
                stageBadgeClassByName[normalizedStage] ||
                "bg-slate-100 text-slate-700";

              return (
                <li key={idx} className="mb-5 ml-2">
                  {/* DOT MARKER TO VISUALLY DELIMIT THE EVENT POINT */}
                  <div className="absolute w-3 h-3 bg-white border-2 border-indigo-400 rounded-full -left-1.5 mt-1.5" />

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${badgeClass}`}>
                      {normalizedStage}
                    </span>

                    {/* DATETIME IS SHOWN AS LOCALIZED STRING FOR QUICK SCANNING */}
                    <span className="text-xs text-slate-500">
                      {new Date(timelineItem.at).toLocaleString()}
                    </span>

                    <span className="text-xs text-slate-400">•</span>

                    {/* OPTIONAL AUTHOR FIELD IDENTIFIES WHO MADE THE CHANGE */}
                    <span className="text-xs text-slate-500">{timelineItem.by}</span>
                  </div>

                  {/* OPTIONAL NOTE FIELD PROVIDES EXTRA CONTEXT FOR THE EVENT */}
                  {timelineItem.note && (
                    <div className="mt-1 text-sm text-slate-700">
                      {timelineItem.note}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
