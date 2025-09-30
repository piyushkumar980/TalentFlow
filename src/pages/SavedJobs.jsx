// src/pages/SavedJobs.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin as MapPinIcon,
  Bookmark as BookmarkIcon,
  ExternalLink as ExternalLinkIcon,
  Trash2 as TrashIcon,
  Building2 as BuildingIcon,
  Search as SearchIcon,
  Tag as TagIcon,
} from "lucide-react";

/* -------------------------------
   HELPER FUNCTION: TIME AGO FORMAT
   Converts ISO date to a human-readable "x minutes/hours/days ago"
------------------------------- */
const formatRelativeSince = (isoString) => {
  const elapsedMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/* -------------------------------
   HELPER FUNCTION: TAG COLOR STYLES
   Returns the correct Tailwind classes for each job tag
------------------------------- */
const getTagPillUtilityClasses = (tagLabel, darkModeEnabled) => {
  switch (tagLabel) {
    case "Remote":
      return darkModeEnabled
        ? "bg-sky-900 text-sky-200"
        : "bg-sky-100 text-sky-800";
    case "Hybrid":
      return darkModeEnabled
        ? "bg-amber-900 text-amber-200"
        : "bg-amber-100 text-amber-800";
    case "Onsite":
      return darkModeEnabled
        ? "bg-fuchsia-900 text-fuchsia-200"
        : "bg-fuchsia-100 text-fuchsia-800";
    case "Full-time":
      return darkModeEnabled
        ? "bg-emerald-900 text-emerald-200"
        : "bg-emerald-100 text-emerald-800";
    case "Contract":
      return darkModeEnabled
        ? "bg-violet-900 text-violet-200"
        : "bg-violet-100 text-violet-800";
    case "Part-time":
      return darkModeEnabled
        ? "bg-indigo-900 text-indigo-200"
        : "bg-indigo-100 text-indigo-800";
    default:
      return darkModeEnabled
        ? "bg-gray-800 text-gray-200"
        : "bg-gray-100 text-gray-800";
  }
};

/* -------------------------------
   MAIN COMPONENT: SAVED JOBS PAGE
   - Displays saved jobs for the user
   - Supports search and tag filters
   - Allows removing jobs from the list
------------------------------- */
const SavedJobs = ({ darkMode }) => {
  // STATE: list of saved jobs in memory
  const [savedJobsList, setSavedJobsList] = useState([]);
  // STATE: current search text
  const [searchQueryText, setSearchQueryText] = useState("");
  // STATE: currently selected tag filter
  const [selectedTagFilter, setSelectedTagFilter] = useState("All");

  /* -------------------------------
     DEMO DATA: seed some saved jobs
     This mimics jobs a user might save.
     Normally, this would come from an API.
  ------------------------------- */
  useEffect(() => {
    const demoJobs = [
      {
        id: "sj-1",
        title: "Senior Frontend Developer",
        company: "BrightFlow Labs",
        location: "Remote · India",
        tags: ["Remote", "Full-time"],
        salary: "₹28–38 LPA",
        savedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        url: "/jobseeker/apply/sj-1",
      },
      {
        id: "sj-2",
        title: "Data Analyst",
        company: "NovaAnalytics",
        location: "Bengaluru, KA",
        tags: ["Onsite", "Full-time"],
        salary: "₹12–20 LPA",
        savedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
        url: "/jobseeker/apply/sj-2",
      },
      {
        id: "sj-3",
        title: "Product Manager",
        company: "ZenithSystems",
        location: "Hyderabad, TS",
        tags: ["Hybrid", "Full-time"],
        salary: "₹35–50 LPA",
        savedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
        url: "/jobseeker/apply/sj-3",
      },
      {
        id: "sj-4",
        title: "DevOps Specialist",
        company: "CloudScape Technologies",
        location: "Chennai, TN",
        tags: ["Remote", "Contract"],
        salary: "₹18–28 LPA",
        savedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
        url: "/jobseeker/apply/sj-4",
      },
      {
        id: "sj-5",
        title: "UX Designer",
        company: "DataDynamo",
        location: "Pune, MH",
        tags: ["Hybrid", "Part-time"],
        salary: "₹10–16 LPA",
        savedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        url: "/jobseeker/apply/sj-5",
      },
    ];
    setSavedJobsList(demoJobs);
  }, []);

  /* -------------------------------
     REMOVE JOB HANDLER
     Removes a job card from the list (UI only)
  ------------------------------- */
  const handleRemoveSavedJob = (jobId) => {
    setSavedJobsList((prevList) => prevList.filter((job) => job.id !== jobId));
  };

  /* -------------------------------
     TAG FILTER OPTIONS
     Extract unique tags from saved jobs for dropdown
  ------------------------------- */
  const availableTagOptions = useMemo(() => {
    const uniqueTags = new Set();
    savedJobsList.forEach((job) =>
      job.tags.forEach((tag) => uniqueTags.add(tag))
    );
    return ["All", ...Array.from(uniqueTags)];
  }, [savedJobsList]);

  /* -------------------------------
     FILTERED JOB LIST
     Filter jobs based on search query and selected tag
  ------------------------------- */
  const visibleSavedJobs = useMemo(() => {
    const query = searchQueryText.trim().toLowerCase();
    return savedJobsList.filter((job) => {
      const matchesText =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query);
      const matchesTag =
        selectedTagFilter === "All" || job.tags.includes(selectedTagFilter);
      return matchesText && matchesTag;
    });
  }, [savedJobsList, searchQueryText, selectedTagFilter]);

  /* -------------------------------
     MAIN RENDER
  ------------------------------- */
  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
      }`}
    >
      <div className="container mx-auto py-5 max-w-5xl">
        {/* SEARCH & TAG FILTER TOOLBAR */}
        <div
          className={`rounded-xl border p-4 mb-6 ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* SEARCH INPUT */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                value={searchQueryText}
                onChange={(e) => setSearchQueryText(e.target.value)}
                placeholder="Search by role, company, or location…"
                className={`block w-full pl-10 pr-3 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
            </div>

            {/* TAG FILTER DROPDOWN */}
            <div className="flex items-center gap-2">
              <TagIcon
                size={16}
                className={darkMode ? "text-slate-300" : "text-slate-500"}
              />
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className={`rounded-lg border px-3 py-2 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              >
                {availableTagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SAVED JOB CARDS */}
        <div className="space-y-4">
          {visibleSavedJobs.length === 0 ? (
            <div
              className={`rounded-xl border p-8 text-center ${
                darkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className="font-medium">No saved jobs match your filters.</p>
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>
                Try clearing search or tag filters.
              </p>
            </div>
          ) : (
            visibleSavedJobs.map((job) => (
              <div
                key={job.id}
                className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                  darkMode
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* LEFT: COMPANY LOGO/INITIALS + JOB INFO */}
                  <div className="flex items-start gap-4 min-w-0">
                    {/* COMPANY INITIALS */}
                    <div
                      className={`w-12 h-12 rounded-xl grid place-items-center text-sm font-semibold ${
                        darkMode
                          ? "bg-slate-900 text-slate-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                      aria-hidden
                    >
                      {job.company
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    {/* JOB DETAILS */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold truncate">
                          {job.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            darkMode
                              ? "bg-slate-900 text-slate-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          saved {formatRelativeSince(job.savedAt)}
                        </span>
                      </div>

                      <div
                        className={`mt-1 flex flex-wrap items-center gap-2 ${
                          darkMode ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <BuildingIcon size={14} />
                          {job.company}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon size={14} />
                          {job.location}
                        </span>
                        <span>•</span>
                        <span className="font-medium">{job.salary}</span>
                      </div>

                      {/* TAG BADGES */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagPillUtilityClasses(
                              tag,
                              darkMode
                            )}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: ACTION BUTTONS */}
                  <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch gap-2">
                    <Link
                      to={`/jobseeker/apply/${job.id}`}
                      state={{ job }}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        darkMode
                          ? "bg-indigo-600 text-white hover:bg-indigo-500"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      Apply <ExternalLinkIcon size={16} />
                    </Link>

                    <button
                      onClick={() => handleRemoveSavedJob(job.id)}
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        darkMode
                          ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                          : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                      }`}
                    >
                      <TrashIcon size={16} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedJobs;
