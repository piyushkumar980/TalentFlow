// src/pages/Interviews.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  MapPin,
  Building2,
  Video,
  Phone,
  Globe,
  Link2,
  CheckCircle,
  RefreshCw,
  Search,
  Clock,
  X,
  Trash2,
  Send,
} from "lucide-react";

/*UTILITY FUNCTIONS */

// FORMAT AN ISO DATETIME STRING INTO A SHORT, FRIENDLY LABEL FOR LIST DISPLAY
const formatInterviewDateTimeForList = (isoString) => {
  const dt = new Date(isoString);
  return dt.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// RETURN TRUE WHEN THE INTERVIEW OCCURS IN THE FUTURE
const interviewOccursInFuture = (isoString) =>
  new Date(isoString).getTime() > Date.now();

// RETURN A STATUS PILL STYLE BASED ON STATUS AND THEME
const computeStatusPillClass = (statusText, isDarkMode) => {
  switch (statusText) {
    case "Scheduled":
      return isDarkMode
        ? "bg-indigo-900 text-indigo-200"
        : "bg-indigo-100 text-indigo-800";
    case "Pending":
      return isDarkMode
        ? "bg-amber-900 text-amber-200"
        : "bg-amber-100 text-amber-800";
    case "Rescheduled":
      return isDarkMode
        ? "bg-cyan-900 text-cyan-200"
        : "bg-cyan-100 text-cyan-800";
    case "Completed":
      return isDarkMode
        ? "bg-emerald-900 text-emerald-200"
        : "bg-emerald-100 text-emerald-800";
    case "Cancelled":
      return isDarkMode
        ? "bg-rose-900 text-rose-200"
        : "bg-rose-100 text-rose-800";
    default:
      return isDarkMode
        ? "bg-slate-800 text-slate-200"
        : "bg-slate-100 text-slate-800";
  }
};

// RETURN A SMALL ICON COMPONENT MATCHING THE CURRENT STATUS
const renderIconForStatus = (statusText, className = "w-4 h-4") => {
  switch (statusText) {
    case "Scheduled":
      return <Calendar className={className} />;
    case "Pending":
      return <Clock className={className} />;
    case "Rescheduled":
      return <RefreshCw className={className} />;
    case "Completed":
      return <CheckCircle className={className} />;
    case "Cancelled":
      return <X className={className} />;
    default:
      return <Calendar className={className} />;
  }
};

/* MAIN VIEW */

const Interviews = ({ darkMode }) => {
  // HOLDS ALL INTERVIEW ENTRIES RENDERED IN THE LIST
  const [interviewEntries, setInterviewEntries] = useState([]);

  // HOLDS THE FREE-TEXT SEARCH QUERY ENTERED BY THE USER
  const [searchQueryText, setSearchQueryText] = useState("");

  // HOLDS THE CURRENT STATUS FILTER SELECTION
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Upcoming");

  // HOLDS INTERVIEW IDS THAT SHOULD BE TEMPORARILY HIDDEN FROM THE LIST
  const [hiddenInterviewIdSet, setHiddenInterviewIdSet] = useState(new Set());

  // HOLDS RESCHEDULE MODAL VISIBILITY STATE AND WORKING FIELDS
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [interviewBeingRescheduled, setInterviewBeingRescheduled] =
    useState(null);
  const [requestedRescheduleDate, setRequestedRescheduleDate] = useState("");
  const [requestedRescheduleNote, setRequestedRescheduleNote] = useState("");

  // SIMPLE TOAST MESSAGE TEXT (AUTO-HIDES AFTER SHORT DURATION)
  const [toastMessageText, setToastMessageText] = useState("");

  // LIST OF VALID STATUS FILTERS SHOWN AS QUICK FILTER BUTTONS
  const availableStatusFilters = useMemo(
    () => [
      "All",
      "Upcoming",
      "Scheduled",
      "Pending",
      "Rescheduled",
      "Completed",
      "Cancelled",
    ],
    []
  );

  // SEED A SMALL SET OF INTERVIEWS ON FIRST MOUNT SO THE SCREEN HAS CONTENT
  useEffect(() => {
    const now = Date.now();
    const seeded = [
      {
        id: "iv-1",
        title: "Frontend System Design",
        company: "BrightFlow Labs",
        status: "Scheduled",
        when: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
        mode: "Video",
        location: "Google Meet",
        link: "#",
        contact: "Aarti (Recruiter)",
      },
      {
        id: "iv-2",
        title: "Data Analysis Case Study",
        company: "NovaAnalytics",
        status: "Pending",
        when: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
        mode: "Video",
        location: "Zoom",
        link: "#",
        contact: "Rohit (Coordinator)",
      },
      {
        id: "iv-3",
        title: "PM Product Sense",
        company: "ZenithSystems",
        status: "Rescheduled",
        when: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
        mode: "Onsite",
        location: "Hyderabad, TS",
        link: "",
        contact: "Priya (Hiring Manager)",
      },
      {
        id: "iv-4",
        title: "DevOps Practical",
        company: "CloudScape Technologies",
        status: "Completed",
        when: new Date(now - 30 * 60 * 60 * 1000).toISOString(),
        mode: "Video",
        location: "Teams",
        link: "",
        contact: "Vikram (Engineer)",
      },
      {
        id: "iv-5",
        title: "UX Portfolio Deep Dive",
        company: "DataDynamo",
        status: "Cancelled",
        when: new Date(now - 120 * 60 * 60 * 1000).toISOString(),
        mode: "Remote",
        location: "—",
        link: "",
        contact: "Sneha (Design Lead)",
      },
    ];
    setInterviewEntries(seeded);
  }, []);

  // DERIVE A FILTERED AND SORTED VIEW OF INTERVIEWS BASED ON SEARCH AND STATUS
  const filteredInterviewEntries = useMemo(() => {
    const needle = searchQueryText.trim().toLowerCase();

    return (
      interviewEntries
        // HIDE ANY INTERVIEWS THE USER EXPLICITLY REMOVED
        .filter((iv) => !hiddenInterviewIdSet.has(iv.id))
        // MATCH TEXT AGAINST A FEW COMMON FIELDS
        .filter((iv) => {
          const matchesSearch =
            !needle ||
            iv.title.toLowerCase().includes(needle) ||
            iv.company.toLowerCase().includes(needle) ||
            iv.location.toLowerCase().includes(needle);

          if (selectedStatusFilter === "Upcoming") {
            return matchesSearch && interviewOccursInFuture(iv.when);
          }
          if (selectedStatusFilter === "All") {
            return matchesSearch;
          }
          return matchesSearch && iv.status === selectedStatusFilter;
        })
        // ALWAYS ORDER BY SOONEST FIRST FOR EASIER SCANNING
        .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
    );
  }, [
    interviewEntries,
    searchQueryText,
    selectedStatusFilter,
    hiddenInterviewIdSet,
  ]);

  // REMOVE AN INTERVIEW FROM THE CURRENT VIEW AFTER USER CONFIRMATION
  const permanentlyHideInterviewById = (id) => {
    const confirmDelete = window.confirm("Delete this entry?");
    if (!confirmDelete) return;
    setHiddenInterviewIdSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // OPEN THE RESCHEDULE MODAL AND PRIME THE DATE FIELD TO TODAY
  const openRescheduleModalForInterview = (interview) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    setRequestedRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRequestedRescheduleNote("");
    setInterviewBeingRescheduled(interview);
    setIsRescheduleModalOpen(true);
  };

  // SUBMIT THE RESCHEDULE REQUEST (UI-ONLY ACKNOWLEDGEMENT)
  const submitRescheduleRequest = (evt) => {
    evt.preventDefault();
    setIsRescheduleModalOpen(false);
    setInterviewBeingRescheduled(null);
    setToastMessageText("YOUR RESCHEDULE REQUEST WAS SENT TO THE RECRUITER.");
    setTimeout(() => setToastMessageText(""), 2500);
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
      }`}
    >
      <div
        className={`container mx-auto py-5 max-w-5xl ${
          darkMode ? "bg-slate-900" : "bg-white"
        }`}
      >
        {/*  TOOLBAR  */}

        <div
          className={`rounded-xl border p-4 mb-6 ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* SEARCH INPUT CONTROLS TEXT FILTERING OF THE LIST */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                value={searchQueryText}
                onChange={(e) => setSearchQueryText(e.target.value)}
                placeholder="Search by interview, company, or location…"
                className={`block w-full pl-10 pr-3 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
            </div>

            {/* QUICK STATUS FILTERS TO NARROW THE RESULT SET */}
            <div className="flex items-center gap-2 flex-wrap">
              {availableStatusFilters.map((filterLabel) => (
                <button
                  key={filterLabel}
                  onClick={() => setSelectedStatusFilter(filterLabel)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition ${
                    selectedStatusFilter === filterLabel
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {filterLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/*  LIST VIEW */}

        <div className="space-y-4">
          {filteredInterviewEntries.length === 0 ? (
            // EMPTY STATE WHEN NO INTERVIEWS MATCH CURRENT FILTERS
            <div
              className={`rounded-xl border p-8 text-center ${
                darkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className="font-medium">No interviews match your filters.</p>
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>
                Try clearing search or choosing a different status.
              </p>
            </div>
          ) : (
            filteredInterviewEntries.map((entry) => {
              const isFuture = interviewOccursInFuture(entry.when);
              const pillClass = computeStatusPillClass(entry.status, darkMode);
              const iconColor = darkMode
                ? "w-5 h-5 text-slate-200"
                : "w-5 h-5 text-slate-700";

              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                    darkMode
                      ? "bg-slate-800 border-slate-700"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* LEFT COLUMN: ICON + PRIMARY DETAILS */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl grid place-items-center ${
                          darkMode ? "bg-slate-900" : "bg-slate-100"
                        }`}
                      >
                        {renderIconForStatus(entry.status, iconColor)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">
                            {entry.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${pillClass}`}
                          >
                            {entry.status}
                          </span>
                        </div>

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-2 ${
                            darkMode ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={14} />
                            {entry.company}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={14} />
                            {formatInterviewDateTimeForList(entry.when)}
                          </span>
                        </div>

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-3 ${
                            darkMode ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {entry.mode === "Video" && (
                            <span className="inline-flex items-center gap-1">
                              <Video size={14} /> {entry.location}
                            </span>
                          )}
                          {entry.mode === "Onsite" && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={14} /> {entry.location}
                            </span>
                          )}
                          {entry.mode === "Remote" && (
                            <span className="inline-flex items-center gap-1">
                              <Globe size={14} /> Remote
                            </span>
                          )}
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Phone size={14} /> {entry.contact}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: CONTEXTUAL ACTIONS */}
                    <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch gap-2">
                      {/* JOIN LINK SHOWS ONLY WHEN THE INTERVIEW IS IN THE FUTURE AND HAS A LINK/MODE */}
                      {isFuture && (entry.mode === "Video" || entry.link) && (
                        <a
                          href={entry.link || "#"}
                          className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                            darkMode
                              ? "bg-indigo-600 text-white hover:bg-indigo-500"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                        >
                          Join
                          <Link2 size={16} />
                        </a>
                      )}

                      {/* RESCHEDULE AVAILABLE WHEN THE INTERVIEW HAS NOT HAPPENED YET */}
                      {isFuture && (
                        <button
                          onClick={() => openRescheduleModalForInterview(entry)}
                          className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                            darkMode
                              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                              : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                          }`}
                        >
                          <RefreshCw size={16} />
                          Reschedule
                        </button>
                      )}

                      {/* DELETE REMOVES THE ITEM FROM THE CURRENT VIEW */}
                      <button
                        onClick={() => permanentlyHideInterviewById(entry.id)}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          darkMode
                            ? "bg-rose-600 text-white hover:bg-rose-500"
                            : "bg-rose-600 text-white hover:bg-rose-700"
                        }`}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/*RESCHEDULE MODAL */}

      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsRescheduleModalOpen(false)}
          />
          <form
            onSubmit={submitRescheduleRequest}
            className={`relative w-full max-w-md mx-4 rounded-2xl shadow-xl ring-1 p-6 ${
              darkMode
                ? "bg-slate-800 text-slate-100 ring-slate-700"
                : "bg-white text-slate-900 ring-slate-200"
            }`}
          >
            {/* MODAL HEADER WITH CONTEXT AND DISMISS ACTION */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg grid place-items-center ${
                  darkMode ? "bg-slate-700" : "bg-slate-100"
                }`}
              >
                <RefreshCw
                  size={18}
                  className={darkMode ? "text-slate-200" : "text-slate-700"}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Request Reschedule</h2>
                <p className={darkMode ? "text-slate-400" : "text-slate-500"}>
                  {interviewBeingRescheduled?.title} —{" "}
                  {interviewBeingRescheduled?.company}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className={`ml-auto p-2 rounded-lg ${
                  darkMode
                    ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY WITH DATE PICKER AND OPTIONAL NOTE */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={requestedRescheduleDate}
                  onChange={(e) => setRequestedRescheduleDate(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Note (optional)</label>
                <textarea
                  value={requestedRescheduleNote}
                  onChange={(e) => setRequestedRescheduleNote(e.target.value)}
                  rows={3}
                  placeholder="Share any constraints or preferred time windows…"
                  className={`w-full rounded-lg border px-3 py-2 resize-none ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* MODAL FOOTER WITH ACTIONS */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    darkMode
                      ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-2"
                >
                  <Send size={16} />
                  Send Request
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/*TOAST */}
      {toastMessageText && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="rounded-lg shadow-lg px-4 py-3 bg-emerald-600 text-white">
            {toastMessageText}
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
