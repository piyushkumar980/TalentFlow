import React, { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import Toasts from "../components/common/Toasts.jsx";
import { useToastStore } from "../store/index.js";
import { createCandidate } from "../api/services/candidates.js";

export default function ApplyPage() {
  const pushToast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const { id: jobId } = useParams();
  const { state } = useLocation();

  // Job info (fallbacks if not provided by navigation)
  const jobTitle = state?.job?.title || state?.title || "Job";
  const company = state?.job?.company || state?.company || "Company";
  const location = state?.job?.location || "";
  const salary = state?.job?.salary || "";

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  // UI states
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !email || !resumeUrl) {
      pushToast("Please fill all required fields", "error");
      return;
    }

    try {
      setLoading(true);

      await createCandidate({
        name,
        email,
        jobId: Number(jobId),
        resumeUrl,
        coverLetter,
        stage: "applied",
      });

      pushToast(`Applied to ${company}`, "ok");
      setSubmitted(true);
    } catch (err) {
      pushToast(err?.message || "Failed to apply", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toasts />

      {/* Job summary card */}
      <div className="bg-white border rounded-2xl shadow-sm p-5">
        <h2 className="text-xl font-semibold">Apply for {jobTitle}</h2>
        <div className="text-sm text-slate-500 mt-2 space-y-1">
          <p><b>Company:</b> {company}</p>
          {location && <p><b>Location:</b> {location}</p>}
          {salary && <p><b>Salary:</b> {salary}</p>}
        </div>
      </div>

      {/* Show form until submitted */}
      {!submitted ? (
        <form onSubmit={handleSubmit} className="bg-white border rounded-2xl shadow-sm p-5 space-y-5">
          <div>
            <label>Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label>Resume URL *</label>
            <input type="url" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label>Cover Letter (optional)</label>
            <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={5} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded">
              {loading ? "Submitting…" : "Submit Application"}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="bg-slate-200 px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // Success state
        <div className="bg-slate-100 border rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-green-700">🎉 Application Submitted</h3>
          <p>You applied to <b>{company}</b> for the <b>{jobTitle}</b> role.</p>

          <div className="flex gap-3 justify-center mt-4">
            <button onClick={() => navigate("/jobseeker/find-jobs")} className="bg-indigo-600 text-white px-4 py-2 rounded">
              Apply for More Jobs
            </button>
            <button onClick={() => navigate(-1)} className="bg-slate-400 px-4 py-2 rounded">
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
