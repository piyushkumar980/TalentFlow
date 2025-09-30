import { Link } from "react-router-dom";

/**
 * CandidateRow
 * Renders a single row for a candidate in a compact grid layout.
 * Each row shows:
 * - Candidate name (clickable link to detail page)
 * - Email
 * - Current stage
 * - Associated job ID
 *
 * Props:
 * - c: candidate object containing { id, name, email, stage, jobId }
 */
export default function CandidateRow({ c }) {
  // Extract candidate properties, providing defaults for safety
  const candidateId = c?.id;
  const candidateName = c?.name ?? "—";  // fallback if name missing
  const candidateEmail = c?.email ?? "—";
  const candidateStage = c?.stage ?? "applied";
  const candidateJobId = c?.jobId;

  return (
    <div className="grid grid-cols-4 items-center px-3 py-2 border-b bg-white">
      {/* Column 1: Name (link to candidate detail page) */}
      <div className="truncate">
        <Link
          to={`/candidates/${candidateId}`}
          className="text-slate-900 hover:underline"
        >
          {candidateName}
        </Link>
      </div>

      {/* Column 2: Email */}
      <div className="truncate text-sm text-slate-600">
        {candidateEmail}
      </div>

      {/* Column 3: Current stage displayed as a small pill */}
      <div className="text-xs">
        <span className="px-2 py-0.5 rounded-full bg-slate-100">
          {candidateStage}
        </span>
      </div>

      {/* Column 4: Associated job ID */}
      <div className="text-xs text-slate-500">
        {candidateJobId != null ? `Job #${candidateJobId}` : "Job —"}
      </div>
    </div>
  );
}
