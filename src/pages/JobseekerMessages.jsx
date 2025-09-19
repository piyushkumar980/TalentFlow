// src/pages/Interviews.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Search,
  Mail,
  MailOpen,
  Clock,
  Trash2,
  X,
} from "lucide-react";

/* SMALL DISPLAY HELPERS*/

// RETURN A FRIENDLY "TIME SINCE" OR "TIME UNTIL" STRING FOR A GIVEN TIMESTAMP
const deriveRelativeTimeLabel = (value) => {
  const epochMs = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(epochMs)) return "";
  const diff = Date.now() - epochMs;
  const isFuture = diff < 0;
  const abs = Math.abs(diff);

  const mins = Math.floor(abs / 60000);
  if (mins < 1) return isFuture ? "in <1m" : "just now";
  if (mins < 60) return isFuture ? `in ${mins}m` : `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isFuture ? `in ${hrs}h` : `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return isFuture ? `in ${days}d` : `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 8) return isFuture ? `in ${weeks}w` : `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 24) return isFuture ? `in ${months}mo` : `${months}mo ago`;

  const years = Math.floor(days / 365);
  return isFuture ? `in ${years}y` : `${years}y ago`;
};

// BUILD AN EPOCH FOR “X TIME AGO” FOR QUICK SEEDING
const computeEpochMsFromAgoParts = ({ d = 0, h = 0, m = 0 } = {}) =>
  Date.now() - (((d * 24 + h) * 60 + m) * 60 * 1000);

// CONVERT “AGO PARTS” INTO ISO STRING (SEED DATA ONLY)
const isoTimestampFromAgoParts = (parts) =>
  new Date(computeEpochMsFromAgoParts(parts)).toISOString();

// PROVIDE CONSISTENT STYLING FOR DESTRUCTIVE BUTTONS
const getDestructiveButtonClassName = (isDark) =>
  isDark
    ? "bg-rose-600 text-white hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
    : "bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300";

/*  PAGE */

const JobseekerMessages = ({ darkMode }) => {
  // STORE ALL MESSAGE THREADS FOR THE INBOX LIST
  const [conversationThreads, setConversationThreads] = useState([]);

  // STORE THE CURRENT SEARCH QUERY FOR CLIENT-SIDE FILTERING
  const [searchQuery, setSearchQuery] = useState("");

  // STORE THE VISIBILITY FILTER (ALL | UNREAD) FOR THE LIST
  const [visibilityFilter, setVisibilityFilter] = useState("All");

  // STORE THE CURRENTLY PREVIEWED THREAD FOR THE MODAL
  const [selectedThread, setSelectedThread] = useState(null);

  // STORE TEMPORARILY HIDDEN THREAD IDS (CLIENT-ONLY DELETE)
  const [hiddenThreadIds, setHiddenThreadIds] = useState(new Set());

  // SEED A MIX OF RECENT AND OLDER MESSAGES FOR A REALISTIC FEED
  useEffect(() => {
    const seededThreads = [
      {
        id: "msg-201",
        from: "BrightFlow Labs",
        subject: "Next steps & coding sample",
        preview:
          "Thanks for your application! We’d love to move forward with a quick coding sample…",
        unread: true,
        createdAt: isoTimestampFromAgoParts({ h: 2 }),
        body:
          "Hi there,\n\nThanks for your application! We’d love to move forward with a quick coding sample. Please find the details attached.\n\nBest,\nBrightFlow Labs",
      },
      {
        id: "msg-202",
        from: "NovaAnalytics",
        subject: "Interview schedule (Fri, 3:30 PM)",
        preview:
          "Can you confirm your availability for this Friday? We can do 3:30 PM IST…",
        unread: true,
        createdAt: isoTimestampFromAgoParts({ d: 1, h: 3 }),
        body:
          "Hello,\n\nCan you confirm your availability for this Friday? We can do 3:30 PM IST. Let us know if that works.\n\nRegards,\nNovaAnalytics",
      },
      {
        id: "msg-203",
        from: "CloudScape Technologies",
        subject: "Offer details 🎉",
        preview:
          "Great news! We’re thrilled to extend you an offer. The details are attached…",
        unread: false,
        createdAt: isoTimestampFromAgoParts({ d: 5 }),
        body:
          "Hi,\n\nGreat news! We’re thrilled to extend you an offer. The details are attached. Please review and let us know if you have any questions.\n\nCheers,\nCloudScape HR",
      },
      {
        id: "msg-204",
        from: "CobaltWorks",
        subject: "Application update",
        preview:
          "Thank you for interviewing with us. After careful review, we will not be moving forward…",
        unread: false,
        createdAt: isoTimestampFromAgoParts({ d: 21 }),
        body:
          "Hello,\n\nThank you for interviewing with us. After careful review, we will not be moving forward. We appreciate your time and wish you the best in your search.\n\nCobaltWorks Talent",
      },
      {
        id: "msg-205",
        from: "DocuTech Solutions",
        subject: "Follow-up on writing sample",
        preview:
          "We’re reviewing your writing sample. Expect feedback this week…",
        unread: false,
        createdAt: isoTimestampFromAgoParts({ d: 65 }),
        body:
          "Hi,\n\nWe’re reviewing your writing sample. Expect feedback this week.\n\nThanks,\nDocuTech",
      },
      {
        id: "msg-206",
        from: "DataHub Enterprises",
        subject: "Thank you for applying",
        preview:
          "We have received your application and will be in touch if we proceed…",
        unread: false,
        createdAt: isoTimestampFromAgoParts({ d: 400 }),
        body:
          "Hello,\n\nWe have received your application and will be in touch if we proceed.\n\nRegards,\nDataHub",
      },
    ];
    setConversationThreads(seededThreads);
  }, []);

  // FLAG VERY RECENT THREADS TO HIGHLIGHT NEW ITEMS
  const isThreadRecent = (iso) =>
    Date.now() - new Date(iso).getTime() <= 1000 * 60 * 60 * 24 * 2; // ≤48H

  // FLAG VERY OLD THREADS TO SUBTLY DIM THEM
  const isThreadVeryOld = (iso) =>
    Date.now() - new Date(iso).getTime() >= 1000 * 60 * 60 * 24 * 60; // ≥60D

  // FILTER THREADS BY SEARCH + UNREAD/ALL (CLIENT-SIDE ONLY)
  const filteredThreads = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return conversationThreads
      .filter((t) => !hiddenThreadIds.has(t.id))
      .filter((t) => {
        const matchesSearch =
          !needle ||
          t.subject.toLowerCase().includes(needle) ||
          t.preview.toLowerCase().includes(needle) ||
          t.from.toLowerCase().includes(needle);
        const matchesStatus = visibilityFilter === "All" || t.unread;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [conversationThreads, searchQuery, visibilityFilter, hiddenThreadIds]);

  // TOGGLE A THREAD'S UNREAD FLAG (UI-ONLY)
  const toggleThreadReadState = (threadId) =>
    setConversationThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread: !t.unread } : t))
    );

  // HIDE A THREAD LOCALLY (TEMP DELETE)
  const hideThreadById = (threadId) => {
    const ok = window.confirm("Delete this conversation?");
    if (!ok) return;
    setHiddenThreadIds((prev) => {
      const next = new Set(prev);
      next.add(threadId);
      return next;
    });
    setSelectedThread(null);
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
      }`}
    >
      <div className="container mx-auto py-4 max-w-5xl px-3">
        {/* TOOLBAR ROW 
           SHOWS SEARCH INPUT AND QUICK FILTER BUTTONS; FILTERING IS CLIENT-SIDE ONLY */}
        <div
          className={`rounded-xl border p-4 mb-6 ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center max-[720px]:gap-2">
            {/* SEARCH BOX DRIVES CLIENT-SIDE MATCHING */}
            <div className="relative flex-1 max-[720px]:w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company, subject, or keywords…"
                className={`block w-full pl-10 pr-3 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              />
            </div>

            {/* STATUS FILTER: ALL OR UNREAD ONLY */}
            <div className="flex gap-2 max-[720px]:grid max-[720px]:grid-cols-2 max-[720px]:w-full">
              {["All", "Unread"].map((label) => (
                <button
                  key={label}
                  onClick={() => setVisibilityFilter(label)}
                  className={`px-3 py-2 rounded-md text-sm border transition max-[720px]:w-full ${
                    visibilityFilter === label
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/*  THREADS LIST 
           RENDERS CONVERSATIONS; CLICK OPENS A PREVIEW; ACTIONS ARE UI-ONLY */}
        <div className="space-y-3">
          {filteredThreads.map((thread) => {
            const isNewBadgeVisible = isThreadRecent(thread.createdAt);
            const isOldBadgeVisible = isThreadVeryOld(thread.createdAt);

            return (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={[
                  "cursor-pointer rounded-xl border p-4 transition shadow-sm hover:shadow-md overflow-hidden",
                  darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
                  thread.unread
                    ? darkMode
                      ? "ring-1 ring-indigo-400/30"
                      : "ring-1 ring-indigo-200/60"
                    : "",
                  isNewBadgeVisible
                    ? darkMode
                      ? "outline outline-1 outline-cyan-500/20"
                      : "outline outline-1 outline-cyan-300/40"
                    : "",
                  isOldBadgeVisible ? (darkMode ? "opacity-80" : "opacity-90") : "",
                ].join(" ")}
              >
                <div className="flex gap-3 items-start">
                  {/* UNREAD DOT FOR QUICK VISUAL SCANNING */}
                  <div className="pt-2 shrink-0">
                    {thread.unread ? (
                      <span className="block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    ) : (
                      <span className="block w-2.5 h-2.5 rounded-full bg-transparent border border-slate-300 dark:border-slate-600" />
                    )}
                  </div>

                  {/* MAIN THREAD CONTENT */}
                  <div className="flex-1 min-w-0">
                    {/* SUBJECT ROW WITH NEW/OLD FLAGS */}
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <h3 className="font-semibold truncate text-[15px] sm:text-base max-w-full">
                        {thread.subject}
                      </h3>
                      {isNewBadgeVisible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-700 dark:text-white shrink-0">
                          NEW
                        </span>
                      )}
                      {isOldBadgeVisible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 shrink-0">
                          Old
                        </span>
                      )}
                    </div>

                    {/* FROM + PREVIEW LINE WITH SAFE TRUNCATION */}
                    <div
                      className={`${
                        darkMode ? "text-slate-300" : "text-slate-700"
                      } flex items-center gap-1 min-w-0`}
                    >
                      <span className="font-medium shrink-0">{thread.from}</span>
                      <span className="mx-1.5 shrink-0">•</span>
                      <span className="block w-full truncate break-words">
                        {thread.preview}
                      </span>
                    </div>

                    {/* RELATIVE TIME DISPLAY */}
                    <div
                      className={`flex items-center gap-1 text-sm mt-1 ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <Clock size={14} />
                      <span>{deriveRelativeTimeLabel(thread.createdAt)}</span>
                    </div>

                    {/* ACTIONS FOR SMALL SCREENS (INLINE BELOW CARD) */}
                    <div className="flex sm:hidden items-center gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleThreadReadState(thread.id);
                        }}
                        className={`flex-1 px-2.5 py-2 rounded-md text-xs border flex items-center justify-center gap-2 ${
                          darkMode
                            ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                        title={thread.unread ? "Mark as read" : "Mark as unread"}
                      >
                        {thread.unread ? <MailOpen size={14} /> : <Mail size={14} />}
                        <span>{thread.unread ? "Read" : "Unread"}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hideThreadById(thread.id);
                        }}
                        className={`px-3 py-2 rounded-md text-xs transition-colors shadow-sm ${getDestructiveButtonClassName(
                          darkMode
                        )}`}
                        title="Delete (temporary)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* ACTIONS FOR DESKTOP (RIGHT-ALIGNED) */}
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleThreadReadState(thread.id);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs border ${
                        darkMode
                          ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                      title={thread.unread ? "Mark as read" : "Mark as unread"}
                    >
                      {thread.unread ? <MailOpen size={14} /> : <Mail size={14} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        hideThreadById(thread.id);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors shadow-sm ${getDestructiveButtonClassName(
                        darkMode
                      )}`}
                      title="Delete (temporary)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* EMPTY STATE WHEN NO THREADS SATISFY CURRENT FILTERS */}
          {filteredThreads.length === 0 && (
            <div
              className={`rounded-xl border p-10 text-center ${
                darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className="font-medium">No conversations found.</p>
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>
                Try another search or filter.
              </p>
            </div>
          )}
        </div>
      </div>

      {/*  PREVIEW MODAL 
         OPENS THE SELECTED THREAD; ACTIONS HERE ARE ALSO UI-ONLY */}
      {selectedThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* CLICKING THE BACKDROP CLOSES THE PREVIEW */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSelectedThread(null)}
          />
          <div
            className={`relative w-full max-w-2xl max-[720px]:max-w-[94vw] max-[720px]:h-[92vh] mx-4 max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl ring-1 ${
              darkMode
                ? "bg-slate-800 text-slate-100 ring-slate-700"
                : "bg-white text-slate-900 ring-slate-200"
            }`}
          >
            {/* STICKY HEADER WITH QUICK ACTIONS */}
            <div
              className={`flex items-start gap-3 px-6 py-5 border-b sticky top-0 z-10 ${
                darkMode
                  ? "bg-slate-800/95 backdrop-blur border-slate-700"
                  : "bg-white/95 backdrop-blur border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-6 truncate max-w-[70vw] sm:max-w-none">
                  {selectedThread.subject}
                </h2>
                <div
                  className={`mt-1 text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  From <span className="font-medium">{selectedThread.from}</span> •{" "}
                  {deriveRelativeTimeLabel(selectedThread.createdAt)}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* TOGGLE READ/UNREAD FOR THIS THREAD */}
                <button
                  onClick={() => toggleThreadReadState(selectedThread.id)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {selectedThread.unread ? "Mark as read" : "Mark as unread"}
                </button>

                {/* TEMPORARY DELETE OF THIS THREAD */}
                <button
                  onClick={() => hideThreadById(selectedThread.id)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm ${getDestructiveButtonClassName(
                    darkMode
                  )}`}
                >
                  <Trash2 size={14} className="-mt-[2px] inline-block" /> Delete
                </button>

                {/* CLOSE THE PREVIEW */}
                <button
                  onClick={() => setSelectedThread(null)}
                  className={`p-2 rounded-lg ${
                    darkMode
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BODY CONTENT (PRESERVE NEWLINES; WRAP LONG TOKENS) */}
            <div className="px-6 py-5 whitespace-pre-wrap text-[15px] leading-7 break-words">
              {selectedThread.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobseekerMessages;
