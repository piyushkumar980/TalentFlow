// /src/pages/ApplyPage.jsx
import React, { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import Toasts from "../components/common/Toasts.jsx";
import { useToastStore } from "../store/index.js";
import { createCandidate } from "../api/services/candidates.js";

export default function ApplyPage() {
  //FOR PULLING TOAST FROM THE GLOBAL STORE
  const pushToastNotification = useToastStore((s) => s.push);

  // READ ANY ROUTE STATE (OPTIONAL JOB METADATA PASSED BY THE CALLER)
  const { state: navigationStatePayload } = useLocation();

  // EXTRACT THE JOB IDENTIFIER FROM THE URL AND COERCE TO NUMBER
  const { id: jobIdParam } = useParams();

  // PROVIDE IMPERATIVE NAVIGATION FOR CANCEL/SUCCESS PATHS
  const navigateToRoute = useNavigate();

  // DERIVE JOB DISPLAY METADATA FROM ROUTE STATE WITH SANE FALLBACKS
  const derivedJobTitle =
    navigationStatePayload?.job?.title ||
    navigationStatePayload?.title ||
    "Job";
  const derivedCompanyName =
    navigationStatePayload?.job?.company ||
    navigationStatePayload?.company ||
    "Company";
  const derivedJobLocation = navigationStatePayload?.job?.location || "";
  const derivedJobSalary = navigationStatePayload?.job?.salary || "";

  // CONTROLLED FORM STATE FOR ALL USER-ENTERED FIELDS
  const [applicantFullName, setApplicantFullName] = useState("");
  const [applicantEmailAddress, setApplicantEmailAddress] = useState("");
  const [resumePublicUrl, setResumePublicUrl] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");

  // UI FLAGS FOR SUBMISSION AND PENDING NETWORK ACTIVITY
  const [hasSubmissionCompleted, setHasSubmissionCompleted] = useState(false);
  const [isSubmittingToServer, setIsSubmittingToServer] = useState(false);

  // VALIDATE AND SUBMIT THE APPLICATION PAYLOAD TO THE BACKEND
  async function handleSubmitApplicationForm(event) {
    event.preventDefault();

    // ENSURE REQUIRED FIELDS ARE PRESENT BEFORE ATTEMPTING NETWORK CALL
    if (!applicantFullName || !applicantEmailAddress || !resumePublicUrl) {
      pushToastNotification("Please fill all required fields", "error");
      return;
    }

    try {
      // FLAG UI AS BUSY WHILE THE REQUEST IS IN-FLIGHT
      setIsSubmittingToServer(true);

      // SEND APPLICATION DATA TO THE SERVICE LAYER
      await createCandidate({
        name: applicantFullName,
        email: applicantEmailAddress,
        jobId: Number(jobIdParam),
        resumeUrl: resumePublicUrl,
        coverLetter: coverLetterText,
        stage: "applied", // START ALL NEW APPLICATIONS AT THE APPLIED STAGE
      });

      // ANNOUNCE SUCCESS TO THE USER AND SWITCH TO THE CONFIRMATION VIEW
      pushToastNotification(`Successfully applied to ${derivedCompanyName}`, "ok");
      setHasSubmissionCompleted(true);
    } catch (err) {
      // SURFACE A USEFUL ERROR MESSAGE WHEN THE REQUEST FAILS
      pushToastNotification(err?.message || "Failed to submit application", "error");
    } finally {
      // ALWAYS CLEAR THE BUSY FLAG WHEN THE REQUEST SETTLES
      setIsSubmittingToServer(false);
    }
  }

  // RETURN TO THE PREVIOUS ROUTE WITHOUT MUTATING ANY SERVER STATE
  function handleCancelAndGoBack() {
    navigateToRoute(-1);
  }

  return (
    <div className="space-y-6">
      {/* MOUNT GLOBAL TOAST CONTAINER SO FEEDBACK CAN BE RENDERED */}
      <Toasts />

      {/* STATIC JOB SUMMARY CARD TO REMIND THE USER WHAT THEY'RE APPLYING FOR */}
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <h2 className="text-xl font-semibold text-slate-800">
          Apply for {derivedJobTitle}
        </h2>
        <div className="text-sm text-slate-500 mt-2 space-y-1">
          <p>
            <span className="font-medium text-slate-700">Company:</span>{" "}
            {derivedCompanyName}
          </p>
          {derivedJobLocation && (
            <p>
              <span className="font-medium text-slate-700">Location:</span>{" "}
              {derivedJobLocation}
            </p>
          )}
          {derivedJobSalary && (
            <p>
              <span className="font-medium text-slate-700">Salary:</span>{" "}
              {derivedJobSalary}
            </p>
          )}
        </div>
      </div>

      {/* SHOW FORM UNTIL SUCCESS; AFTER SUCCESS, RENDER A CONFIRMATION PANEL */}
      {!hasSubmissionCompleted ? (
        <form
          onSubmit={handleSubmitApplicationForm}
          className="rounded-2xl bg-white border shadow-sm p-5 space-y-5"
        >
          {/* NAME FIELD IS REQUIRED FOR IDENTIFICATION */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Full Name *
            </label>
            <input
              value={applicantFullName}
              onChange={(e) => setApplicantFullName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
          </div>

          {/* EMAIL FIELD IS REQUIRED FOR FOLLOW-UP COMMUNICATION */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              value={applicantEmailAddress}
              onChange={(e) => setApplicantEmailAddress(e.target.value)}
              type="email"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
          </div>

          {/* RESUME URL IS REQUIRED SO RECRUITERS CAN REVIEW THE CANDIDATE */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Resume URL *
            </label>
            <input
              value={resumePublicUrl}
              onChange={(e) => setResumePublicUrl(e.target.value)}
              type="url"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
          </div>

          {/* COVER LETTER IS OPTIONAL; ALLOWS THE CANDIDATE TO PROVIDE CONTEXT */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Cover Letter
            </label>
            <textarea
              value={coverLetterText}
              onChange={(e) => setCoverLetterText(e.target.value)}
              rows={5}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
          </div>

          {/* PRIMARY ACTIONS: SUBMIT TO SERVER OR CANCEL AND NAVIGATE BACK */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmittingToServer}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSubmittingToServer ? "Submitting…" : "Submit Application"}
            </button>
            <button
              type="button"
              onClick={handleCancelAndGoBack}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // SUCCESS STATE: CONFIRM SUBMISSION AND OFFER NEXT STEPS
        <div className="rounded-2xl bg-slate-100 border border-green-200 shadow-sm p-6 text-center space-y-4">
          <h3 className="text-lg font-semibold text-green-700">
            🎉 Application Submitted
          </h3>
          <p className="text-sm text-green-600 bg-slate-100">
            You have successfully applied to <b>{derivedCompanyName}</b> for the{" "}
            <b>{derivedJobTitle}</b> role.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigateToRoute("/jobseeker/find-jobs")}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition"
            >
              Apply for More Jobs
            </button>
            <button
              onClick={handleCancelAndGoBack}
              className="mt-4 px-4 py-2 rounded-lg bg-slate-500 text-slate-700 text-sm hover:bg-slate-600 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
