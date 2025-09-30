// src/pages/JobseekerApplications.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Building2,
  FileText,
  Eye,
  User,
  Calendar,
  CheckCircle,
  X,
} from "lucide-react";

// Local storage key to track candidate applications
const MY_APPLICATION_IDS_KEY = "my_app_candidate_ids";

// --- UTILITY FUNCTIONS ---
// Format timestamp into human-friendly "time ago"
const formatTimeAgo = (ts) => {
  const time = typeof ts === "number" ? ts : new Date(ts).getTime();
  if (!Number.isFinite(time)) return "";

  const diff = Date.now() - time;
  const future = diff < 0;
  const absDiff = Math.abs(diff);

  const minutes = Math.floor(absDiff / 60000);
  if (minutes < 1) return future ? "in <1m" : "just now";
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`;

  const weeks = Math.floor(days / 7);
  return future ? `in ${weeks}w` : `${weeks}w ago`;
};

// Map status to tailwind styles
const getStatusStyle = (status, dark) => {
  const styles = {
    "Under Review": dark
      ? "bg-sky-900 text-sky-200"
      : "bg-sky-100 text-sky-800",
    Assessment: dark
      ? "bg-violet-900 text-violet-200"
      : "bg-violet-100 text-violet-800",
    Interview: dark ? "bg-cyan-700 text-white" : "bg-cyan-100 text-cyan-800",
    Offer: dark
      ? "bg-emerald-900 text-emerald-200"
      : "bg-emerald-100 text-emerald-800",
    Rejected: dark ? "bg-rose-900 text-rose-200" : "bg-rose-100 text-rose-800",
  };
  return (
    styles[status] ||
    (dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800")
  );
};

// Map timeline stage to icon
const getUpdateIcon = (type) => {
  const iconProps = { size: 16, className: "" };
  switch (type) {
    case "applied":
      iconProps.className = "text-blue-600 dark:text-blue-400";
      return <FileText {...iconProps} />;
    case "resume":
      iconProps.className = "text-violet-600 dark:text-violet-400";
      return <Eye {...iconProps} />;
    case "viewed":
      iconProps.className = "text-emerald-600 dark:text-emerald-400";
      return <User {...iconProps} />;
    case "interview":
      iconProps.className = "text-cyan-600 dark:text-cyan-400";
      return <Calendar {...iconProps} />;
    case "offer":
      iconProps.className = "text-emerald-600 dark:text-emerald-400";
      return <CheckCircle {...iconProps} />;
    case "rejected":
      iconProps.className = "text-rose-600 dark:text-rose-400";
      return <X {...iconProps} />;
    default:
      iconProps.className = "text-slate-500 dark:text-slate-400";
      return <FileText {...iconProps} />;
  }
};

// Map candidate stage to readable status
const mapStageToStatus = (stage) => {
  const s = (stage || "").toLowerCase();
  if (["applied", "screen"].includes(s)) return "Under Review";
  if (s === "tech") return "Assessment";
  if (["offer", "hired"].includes(s)) return "Offer";
  if (s === "rejected") return "Rejected";
  return "Under Review";
};

// Map timeline item to update object
const mapTimelineToUpdate = (item) => {
  const stage = (item.stage || "").toLowerCase();
  switch (stage) {
    case "applied":
      return {
        type: "applied",
        text: item.note || "Application submitted",
        at: item.ts,
      };
    case "screen":
      return {
        type: "resume",
        text: item.note || "Resume reviewed",
        at: item.ts,
      };
    case "tech":
      return {
        type: "interview",
        text: item.note || "Technical assessment",
        at: item.ts,
      };
    case "offer":
    case "hired":
      return {
        type: "offer",
        text: item.note || (stage === "hired" ? "Hired" : "Offer extended"),
        at: item.ts,
      };
    case "rejected":
      return {
        type: "rejected",
        text: item.note || "Application not selected",
        at: item.ts,
      };
    default:
      return {
        type: "applied",
        text: item.note || "Status update",
        at: item.ts,
      };
  }
};

// --- MAIN COMPONENT ---
const JobseekerApplications = ({ darkMode }) => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [hiddenIds, setHiddenIds] = useState(new Set());

  // Load applications on mount
  useEffect(() => {
    let mounted = true;

    const loadApplications = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Get saved candidate IDs
        const myIds = JSON.parse(
          localStorage.getItem(MY_APPLICATION_IDS_KEY) || "[]"
        );
        if (!Array.isArray(myIds) || myIds.length === 0) {
          setApplications([]);
          return;
        }

        // Fetch jobs and candidates
        const [jobsRes, candidatesRes] = await Promise.all([
          fetch("/jobs?page=1&pageSize=2000"),
          fetch("/candidates?page=1&pageSize=2000"),
        ]);

        if (!jobsRes.ok || !candidatesRes.ok)
          throw new Error("Failed to load data");

        const jobs = (await jobsRes.json()).items || [];
        const candidates = (await candidatesRes.json()).items || [];

        // Map jobs by ID
        const jobsMap = new Map(jobs.map((job) => [job.id, job]));

        // Filter applications
        const myApps = candidates.filter((c) => myIds.includes(c.id));

        // Fetch timelines
        const timelines = await Promise.all(
          myApps.map(async (c) => {
            try {
              const res = await fetch(`/candidates/${c.id}/timeline`);
              const data = await res.json();
              return data.items || [];
            } catch {
              return [];
            }
          })
        );

        // Build application objects
        const appList = myApps.map((c, i) => {
          const job = jobsMap.get(c.jobId) || {};
          const items = (timelines[i] || []).sort(
            (a, b) => (a.ts ?? 0) - (b.ts ?? 0)
          );
          const updates = items.map(mapTimelineToUpdate);
          const appliedAt = items[0]?.ts || Date.now();

          return {
            id: `application-${c.id}`,
            title: job.role || c.position || "Position",
            company: job.company || "Company",
            location: job.location || c.location || "Location not specified",
            status: mapStageToStatus(c.stage),
            appliedAt,
            updates: updates.length
              ? updates
              : [
                  {
                    type: "applied",
                    text: "Application submitted",
                    at: appliedAt,
                  },
                ],
          };
        });

        if (mounted) setApplications(appList);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load applications");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadApplications();
    return () => {
      mounted = false;
    };
  }, []);

  const TABS = [
    "All",
    "Under Review",
    "Assessment",
    "Interview",
    "Offer",
    "Rejected",
  ];

  // Filter applications by tab and search
  const filteredApplications = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return applications
      .filter((app) => !hiddenIds.has(app.id))
      .filter((app) => {
        const matchesSearch =
          !q ||
          app.title.toLowerCase().includes(q) ||
          app.company.toLowerCase().includes(q) ||
          app.location.toLowerCase().includes(q);
        return activeTab === "All"
          ? matchesSearch
          : matchesSearch && app.status === activeTab;
      });
  }, [applications, searchQuery, activeTab, hiddenIds]);

  // Withdraw application
  const withdrawApplication = (app) => {
    if (!window.confirm("Are you sure you want to withdraw this application?"))
      return;
    setHiddenIds((prev) => new Set(prev).add(app.id));
    setSelectedApplication(null);
    setToastMessage("Your withdrawal request has been sent to the recruiter.");
    setTimeout(() => setToastMessage(""), 2500);
  };

  // --- RENDER ---
  if (isLoading)
    return (
      <div
        className={`min-h-screen grid place-items-center ${
          darkMode ? "bg-slate-900" : "bg-white"
        }`}
      >
        <div
          className={`rounded-xl border p-6 ${
            darkMode
              ? "bg-slate-800 border-slate-700 text-slate-200"
              : "bg-white border-slate-200 text-slate-700"
          }`}
        >
          Loading your applications...
        </div>
      </div>
    );

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
      }`}
    >
      <div className="container mx-auto py-5 max-w-5xl">
        {/* Search + Tabs */}
        <div
          className={`rounded-xl border p-4 mb-6 ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, company, or location..."
                className={`block w-full pl-10 pr-3 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition ${
                    activeTab === tab
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {applications.length === 0 && !error && (
          <div
            className={`rounded-xl border p-8 text-center ${
              darkMode
                ? "bg-slate-800 border-slate-700"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <p className="font-medium">No applications yet</p>
            <p className={darkMode ? "text-slate-400" : "text-slate-600"}>
              Your job applications will appear here once you start applying to
              positions.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            className={`rounded-xl border p-8 text-center ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-rose-300"
                : "bg-white border-rose-200 text-rose-700"
            }`}
          >
            Failed to load applications: {error}
          </div>
        )}

        {/* Application list */}
        {!error && filteredApplications.length > 0 && (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                onClick={() => setSelectedApplication(app)}
                className={`cursor-pointer rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                  darkMode
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl grid place-items-center ${
                        darkMode ? "bg-slate-900" : "bg-slate-100"
                      }`}
                    >
                      <Building2
                        size={18}
                        className={
                          darkMode ? "text-slate-200" : "text-slate-700"
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold truncate">
                          {app.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${getStatusStyle(
                            app.status,
                            darkMode
                          )}`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div
                        className={`mt-1 flex flex-wrap items-center gap-2 ${
                          darkMode ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={14} /> {app.company}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} /> {app.location}
                        </span>
                      </div>
                      <div
                        className={`mt-1 text-sm ${
                          darkMode ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Applied {formatTimeAgo(app.appliedAt)} • Last update:{" "}
                        {app.updates[app.updates.length - 1].text} ·{" "}
                        {formatTimeAgo(app.updates[app.updates.length - 1].at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={
                        darkMode
                          ? "text-slate-400 text-sm"
                          : "text-slate-500 text-sm"
                      }
                    >
                      View details
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-60">
          <div className="rounded-lg shadow-lg px-4 py-3 bg-emerald-600 text-white">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSelectedApplication(null)}
          />
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl ring-1 ${
              darkMode
                ? "bg-slate-800 text-slate-100 ring-slate-700"
                : "bg-white text-slate-900 ring-slate-200"
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-start justify-between px-6 py-5 border-b ${
                darkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <h2 className="text-xl font-semibold truncate">
                  {selectedApplication.title}
                </h2>
                <div
                  className={`mt-1 flex flex-wrap items-center gap-2 text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  <span className="font-medium">
                    {selectedApplication.company}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {selectedApplication.location}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                    selectedApplication.status,
                    darkMode
                  )}`}
                >
                  {selectedApplication.status}
                </span>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className={`p-2 rounded-lg transition ${
                    darkMode
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`rounded-lg p-4 ring-1 ${
                    darkMode
                      ? "bg-slate-900/40 ring-slate-700"
                      : "bg-slate-50 ring-slate-200"
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Applied Date
                  </p>
                  <p className="mt-1 font-medium">
                    {new Date(selectedApplication.appliedAt).toLocaleString()} (
                    {formatTimeAgo(selectedApplication.appliedAt)})
                  </p>
                </div>
                <div
                  className={`rounded-lg p-4 ring-1 ${
                    darkMode
                      ? "bg-slate-900/40 ring-slate-700"
                      : "bg-slate-50 ring-slate-200"
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Application ID
                  </p>
                  <p className="mt-1 font-medium">{selectedApplication.id}</p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold">
                  Application Timeline
                </h3>
                <div
                  className={`mt-3 space-y-4 border-l pl-5 ${
                    darkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  {selectedApplication.updates.map((u, i) => (
                    <div key={i} className="relative">
                      <div
                        className={`absolute -left-7 grid place-items-center rounded-full ring-1 w-7 h-7 ${
                          darkMode
                            ? "bg-slate-800 ring-slate-700"
                            : "bg-white ring-slate-200"
                        }`}
                      >
                        {getUpdateIcon(u.type)}
                      </div>
                      <div>
                        <p className="font-medium">{u.text}</p>
                        <p
                          className={`text-sm mt-0.5 ${
                            darkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {formatTimeAgo(u.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  onClick={() => withdrawApplication(selectedApplication)}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition"
                >
                  Withdraw Application
                </button>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    darkMode
                      ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobseekerApplications;
