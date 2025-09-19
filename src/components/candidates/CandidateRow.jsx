import { Link } from "react-router-dom";

/* CANDIDATEROW
 * RENDERS A SINGLE, COMPACT ROW FOR A CANDIDATE WITH NAME → EMAIL → STAGE → JOB.
 * EACH CELL TRUNCATES OVERFLOWING TEXT TO KEEP THE ROW HEIGHT CONSISTENT.
 * CLICKING THE NAME NAVIGATES TO THE CANDIDATE’S DETAIL PAGE. */
export default function CandidateRow({ c }) {
  // MAP THE BRIEF PROP TO MORE DESCRIPTIVE NAMES FOR READABILITY
  const candidateId = c?.id;
  const candidateName = c?.name ?? "—";
  const candidateEmail = c?.email ?? "—";
  const candidateStage = c?.stage ?? "applied";
  const candidateJobId = c?.jobId;

  return (
    <div className="grid grid-cols-4 items-center px-3 py-2 border-b bg-white">
      {/* COLUMN 1: CANDIDATE NAME AS A LINK TO THE DETAIL VIEW */}
      <div className="truncate">
        <Link
          to={`/candidates/${candidateId}`}
          className="text-slate-900 hover:underline"
        >
          {candidateName}
        </Link>
      </div>

      {/* COLUMN 2: EMAIL ADDRESS WITH SUBTLE EMPHASIS */}
      <div className="truncate text-sm text-slate-600">{candidateEmail}</div>

      {/* COLUMN 3: CURRENT STAGE AS A SMALL STATUS PILL */}
      <div className="text-xs">
        <span className="px-2 py-0.5 rounded-full bg-slate-100">
          {String(candidateStage)}
        </span>
      </div>

      {/* COLUMN 4: ASSOCIATED JOB IDENTIFIER (READ-ONLY CONTEXT) */}
      <div className="text-xs text-slate-500">
        {candidateJobId != null ? `Job #${candidateJobId}` : "Job —"}
      </div>
    </div>
  );
}
