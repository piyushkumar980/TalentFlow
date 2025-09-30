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

/* ---------------- UTILITY FUNCTIONS ---------------- */

// Format an ISO datetime string into a readable label for display
const formatDateTime = (isoString) => {
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

// Check if the interview is in the future
const isFutureInterview = (isoString) => new Date(isoString) > new Date();

// Returns a background color class based on status and dark mode
const getStatusClass = (status, darkMode) => {
  const classes = {
    Scheduled: darkMode
      ? "bg-indigo-900 text-indigo-200"
      : "bg-indigo-100 text-indigo-800",
    Pending: darkMode
      ? "bg-amber-900 text-amber-200"
      : "bg-amber-100 text-amber-800",
    Rescheduled: darkMode
      ? "bg-cyan-900 text-cyan-200"
      : "bg-cyan-100 text-cyan-800",
    Completed: darkMode
      ? "bg-emerald-900 text-emerald-200"
      : "bg-emerald-100 text-emerald-800",
    Cancelled: darkMode
      ? "bg-rose-900 text-rose-200"
      : "bg-rose-100 text-rose-800",
    Default: darkMode
      ? "bg-slate-800 text-slate-200"
      : "bg-slate-100 text-slate-800",
  };
  return classes[status] || classes.Default;
};

// Returns a small icon based on interview status
const getStatusIcon = (status, className = "w-4 h-4") => {
  const icons = {
    Scheduled: <Calendar className={className} />,
    Pending: <Clock className={className} />,
    Rescheduled: <RefreshCw className={className} />,
    Completed: <CheckCircle className={className} />,
    Cancelled: <X className={className} />,
    Default: <Calendar className={className} />,
  };
  return icons[status] || icons.Default;
};

/* ---------------- MAIN COMPONENT ---------------- */

const Interviews = ({ darkMode }) => {
  // ---------------- STATE ----------------
  const [interviews, setInterviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Upcoming");
  const [hiddenIds, setHiddenIds] = useState(new Set());

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleInterview, setRescheduleInterview] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const [toast, setToast] = useState("");

  // ---------------- FILTER BUTTONS ----------------
  const statusOptions = [
    "All",
    "Upcoming",
    "Scheduled",
    "Pending",
    "Rescheduled",
    "Completed",
    "Cancelled",
  ];

  // ---------------- INITIAL DATA ----------------
  useEffect(() => {
    const now = Date.now();
    setInterviews([
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
    ]);
  }, []);

  // ---------------- FILTERED & SORTED LIST ----------------
  const filteredInterviews = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return interviews
      .filter((iv) => !hiddenIds.has(iv.id)) // hide deleted
      .filter((iv) => {
        const matchesSearch =
          !query ||
          iv.title.toLowerCase().includes(query) ||
          iv.company.toLowerCase().includes(query) ||
          iv.location.toLowerCase().includes(query);

        if (statusFilter === "Upcoming")
          return matchesSearch && isFutureInterview(iv.when);
        if (statusFilter === "All") return matchesSearch;
        return matchesSearch && iv.status === statusFilter;
      })
      .sort((a, b) => new Date(a.when) - new Date(b.when)); // soonest first
  }, [interviews, searchQuery, statusFilter, hiddenIds]);

  // ---------------- HANDLERS ----------------
  const deleteInterview = (id) => {
    if (window.confirm("Delete this entry?")) {
      setHiddenIds((prev) => new Set(prev).add(id));
    }
  };

  const openReschedule = (interview) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleNote("");
    setRescheduleInterview(interview);
    setRescheduleOpen(true);
  };

  const submitReschedule = (e) => {
    e.preventDefault();
    setRescheduleOpen(false);
    setRescheduleInterview(null);
    setToast("Your reschedule request was sent to the recruiter.");
    setTimeout(() => setToast(""), 2500);
  };

  // ---------------- RENDER ----------------
  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
      }`}
    >
      <div className="container mx-auto py-5 max-w-5xl">
        {/* SEARCH & STATUS FILTER */}
        <div
          className={`rounded-xl border p-4 mb-6 ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by interview, company, or location…"
                className={`block w-full pl-10 pr-3 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition ${
                    statusFilter === status
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* INTERVIEW LIST */}
        <div className="space-y-4">
          {filteredInterviews.length === 0 ? (
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
            filteredInterviews.map((iv) => {
              const future = isFutureInterview(iv.when);
              const pillClass = getStatusClass(iv.status, darkMode);
              const iconColor = darkMode
                ? "w-5 h-5 text-slate-200"
                : "w-5 h-5 text-slate-700";

              return (
                <div
                  key={iv.id}
                  className={`rounded-xl border p-5 shadow-sm hover:shadow-md ${
                    darkMode
                      ? "bg-slate-800 border-slate-700"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* LEFT: ICON + DETAILS */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl grid place-items-center ${
                          darkMode ? "bg-slate-900" : "bg-slate-100"
                        }`}
                      >
                        {getStatusIcon(iv.status, iconColor)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">
                            {iv.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${pillClass}`}
                          >
                            {iv.status}
                          </span>
                        </div>

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-2 ${
                            darkMode ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={14} />
                            {iv.company}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDateTime(iv.when)}
                          </span>
                        </div>

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-3 ${
                            darkMode ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {iv.mode === "Video" && (
                            <span className="inline-flex items-center gap-1">
                              <Video size={14} /> {iv.location}
                            </span>
                          )}
                          {iv.mode === "Onsite" && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={14} /> {iv.location}
                            </span>
                          )}
                          {iv.mode === "Remote" && (
                            <span className="inline-flex items-center gap-1">
                              <Globe size={14} /> Remote
                            </span>
                          )}
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Phone size={14} /> {iv.contact}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: ACTION BUTTONS */}
                    <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch gap-2">
                      {future && (iv.mode === "Video" || iv.link) && (
                        <a
                          href={iv.link || "#"}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
                        >
                          Join <Link2 size={16} />
                        </a>
                      )}

                      {future && (
                        <button
                          onClick={() => openReschedule(iv)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            darkMode
                              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                              : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                          }`}
                        >
                          <RefreshCw size={16} /> Reschedule
                        </button>
                      )}

                      <button
                        onClick={() => deleteInterview(iv.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RESCHEDULE MODAL */}
      {rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setRescheduleOpen(false)}
          />
          <form
            onSubmit={submitReschedule}
            className={`relative w-full max-w-md mx-4 rounded-2xl shadow-xl ring-1 p-6 ${
              darkMode
                ? "bg-slate-800 text-slate-100 ring-slate-700"
                : "bg-white text-slate-900 ring-slate-200"
            }`}
          >
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
                  {rescheduleInterview?.title} — {rescheduleInterview?.company}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleOpen(false)}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
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
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note…"
                  className={`w-full rounded-lg border px-3 py-2 resize-none ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRescheduleOpen(false)}
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
                  <Send size={16} /> Send Request
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="rounded-lg shadow-lg px-4 py-3 bg-emerald-600 text-white">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
