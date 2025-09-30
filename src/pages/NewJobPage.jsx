// src/pages/NewJobPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listJobs, createJob } from "../api/services/jobs.js";

/* -----------------------------
   LIGHTWEIGHT TOAST COMPONENT
   -----------------------------
   Purpose: Show temporary success message when job is created.
   Auto-hides after 3 seconds.
*/
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timerId = setTimeout(onClose, 3000);
    return () => clearTimeout(timerId);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      {message}
    </div>
  );
};

/* -----------------------------
   STATIC FORM OPTIONS
   -----------------------------
   These options populate dropdowns for department, employment type, and seniority level.
*/
const ALL_DEPARTMENTS_OPTIONS = [
  "Engineering",
  "Product",
  "Quality",
  "People Ops",
  "Analytics",
  "Design",
  "Security",
  "Sales",
  "Support",
  "Ops",
];

const ALL_EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Internship",
  "Temporary",
  "Freelance",
];

const ALL_SENIORITY_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Principal"];

/* -----------------------------
   SLUG GENERATOR
   -----------------------------
   Converts free text into URL-friendly lowercase slug.
   Removes special characters, trims, replaces spaces with hyphens, max 60 chars.
*/
function makeUrlFriendlySlugFromText(textInput) {
  return String(textInput || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/* -----------------------------
   NEW JOB PAGE COMPONENT
   -----------------------------
   Responsibilities:
     - Render a create-job form
     - Validate inputs (title, slug, salary)
     - Auto-generate and normalize slug
     - Call createJob API mutation
     - Show success toast and navigate to jobs list
     - Invalidate React Query caches so job lists refresh
*/
export default function NewJobPage() {
  const reactQueryClientInstance = useQueryClient();
  const navigate = useNavigate();

  /* Toast visibility */
  const [isToastVisible, setIsToastVisible] = useState(false);

  /* -----------------------------
     PREFETCH EXISTING JOBS FOR SLUG UNIQUENESS CHECK
     -----------------------------
     We fetch all jobs once to ensure new slug is unique client-side.
  */
  const { data: existingJobsQueryData } = useQuery({
    queryKey: ["all-jobs-for-slug-check"],
    queryFn: () => listJobs({ page: 1, pageSize: 2000 }),
  });

  /* Build a lowercased set of existing slugs for O(1) lookup */
  const existingJobSlugSetLower = useMemo(
    () =>
      new Set(
        (existingJobsQueryData?.items ?? []).map((job) =>
          String(job.slug || "").toLowerCase()
        )
      ),
    [existingJobsQueryData]
  );

  /* -----------------------------
     FORM STATE
     -----------------------------
     Each input is stored explicitly for easy tracking.
  */
  const [jobTitleInput, setJobTitleInput] = useState("");
  const [jobSlugInput, setJobSlugInput] = useState("");
  const [jobStatusSelectValue, setJobStatusSelectValue] = useState("active");
  const [selectedDepartment, setSelectedDepartment] = useState(
    ALL_DEPARTMENTS_OPTIONS[0]
  );
  const [selectedEmploymentType, setSelectedEmploymentType] = useState(
    ALL_EMPLOYMENT_TYPES[0]
  );
  const [selectedSeniorityLevel, setSelectedSeniorityLevel] = useState(
    ALL_SENIORITY_LEVELS[1]
  ); // MID
  const [jobLocationInput, setJobLocationInput] = useState("");
  const [minimumSalaryInput, setMinimumSalaryInput] = useState("");
  const [maximumSalaryInput, setMaximumSalaryInput] = useState("");
  const [jobDescriptionInput, setJobDescriptionInput] = useState("");
  const [jobTagsCsvInput, setJobTagsCsvInput] = useState("remote, full-time");

  /* -----------------------------
     AUTO-GENERATE SLUG FROM TITLE
     -----------------------------
     Updates slug automatically unless user manually edits it.
  */
  const [hasUserManuallyEditedSlug, setHasUserManuallyEditedSlug] =
    useState(false);
  useEffect(() => {
    if (!hasUserManuallyEditedSlug) {
      setJobSlugInput(makeUrlFriendlySlugFromText(jobTitleInput));
    }
  }, [jobTitleInput, hasUserManuallyEditedSlug]);

  /* -----------------------------
     FORM VALIDATION ERRORS STATE
  */
  const [formValidationErrors, setFormValidationErrors] = useState({});

  /* -----------------------------
     VALIDATION FUNCTION
     -----------------------------
     Checks required fields, numeric fields, salary consistency, and slug uniqueness.
  */
  function validateFormAndCollectErrors() {
    const nextErrors = {};

    if (!jobTitleInput.trim()) {
      nextErrors.title = "Title is required.";
    }

    const normalizedSlugCandidate = makeUrlFriendlySlugFromText(
      jobSlugInput || jobTitleInput
    );
    if (!normalizedSlugCandidate) nextErrors.slug = "Slug is required.";
    if (existingJobSlugSetLower.has(normalizedSlugCandidate)) {
      nextErrors.slug = "Slug must be unique.";
    }

    if (minimumSalaryInput && isNaN(Number(minimumSalaryInput))) {
      nextErrors.minSalary = "Enter a number.";
    }
    if (maximumSalaryInput && isNaN(Number(maximumSalaryInput))) {
      nextErrors.maxSalary = "Enter a number.";
    }
    if (
      minimumSalaryInput &&
      maximumSalaryInput &&
      Number(minimumSalaryInput) > Number(maximumSalaryInput)
    ) {
      nextErrors.maxSalary = "Max salary should be greater than min salary.";
    }

    setFormValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  /* -----------------------------
     CREATE JOB MUTATION
     -----------------------------
     Calls API, invalidates caches, shows toast, redirects after success.
  */
  const createJobMutation = useMutation({
    mutationFn: (payload) => createJob(payload),
    onSuccess: () => {
      // Invalidate relevant queries to refresh job lists
      reactQueryClientInstance.invalidateQueries({
        queryKey: ["all-jobs-for-slug-check"],
      });
      reactQueryClientInstance.invalidateQueries({ queryKey: ["jobs"] });
      reactQueryClientInstance.invalidateQueries({ queryKey: ["dash-jobs"] });

      // Show success toast and navigate after short delay
      setIsToastVisible(true);
      setTimeout(() => {
        navigate("/hr/jobs");
      }, 1200);
    },
  });

  /* -----------------------------
     FORM SUBMIT HANDLER
     -----------------------------
     Validates inputs, builds request payload, triggers mutation
  */
  function handleSubmitCreateJobForm(e) {
    e.preventDefault();
    const isValid = validateFormAndCollectErrors();
    if (!isValid) return;

    const finalSlugForSubmission = makeUrlFriendlySlugFromText(
      jobSlugInput || jobTitleInput
    );

    const requestPayload = {
      title: jobTitleInput.trim(),
      slug: finalSlugForSubmission,
      status: jobStatusSelectValue,
      tags: jobTagsCsvInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    createJobMutation.mutate(requestPayload);
  }

  /* -----------------------------
     RENDER PAGE
     -----------------------------
     Header, form fields, and toast feedback.
  */
  return (
    <div className="space-y-6">
      {/* SUCCESS TOAST */}
      {isToastVisible && (
        <Toast
          message="Your job has been created successfully!"
          onClose={() => setIsToastVisible(false)}
        />
      )}

      {/* PAGE HEADER */}
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <h2 className="text-xl font-semibold text-slate-800">
          Create a new job
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Fill in the details below. Title and unique slug are required.
        </p>
      </div>

      {/* CREATE JOB FORM */}
      <form
        onSubmit={handleSubmitCreateJobForm}
        className="rounded-2xl bg-white border shadow-sm p-5 space-y-5"
      >
        {/* JOB TITLE FIELD */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Job Title <span className="text-rose-600">*</span>
          </label>
          <input
            value={jobTitleInput}
            onChange={(e) => setJobTitleInput(e.target.value)}
            placeholder="e.g., Senior Frontend Developer"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
          {formValidationErrors.title && (
            <p className="text-xs text-rose-600 mt-1">
              {formValidationErrors.title}
            </p>
          )}
        </div>

        {/* DEPARTMENT SELECT */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Department
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          >
            {ALL_DEPARTMENTS_OPTIONS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* JOB DESCRIPTION */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Job Description
          </label>
          <textarea
            value={jobDescriptionInput}
            onChange={(e) => setJobDescriptionInput(e.target.value)}
            placeholder="Short description / responsibilities"
            rows={5}
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
        </div>

        {/* SLUG FIELD */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Slug <span className="text-rose-600">*</span>
          </label>
          <input
            value={jobSlugInput}
            onChange={(e) => {
              setHasUserManuallyEditedSlug(true);
              setJobSlugInput(e.target.value);
            }}
            onBlur={() =>
              setJobSlugInput(makeUrlFriendlySlugFromText(jobSlugInput))
            }
            placeholder="Auto-generated from Title"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
          {formValidationErrors.slug && (
            <p className="text-xs text-rose-600 mt-1">
              {formValidationErrors.slug}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Will be used in URLs, must be unique.
          </p>
        </div>

        {/* TYPE / LEVEL / STATUS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              value={selectedEmploymentType}
              onChange={(e) => setSelectedEmploymentType(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            >
              {ALL_EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Level
            </label>
            <select
              value={selectedSeniorityLevel}
              onChange={(e) => setSelectedSeniorityLevel(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            >
              {ALL_SENIORITY_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={jobStatusSelectValue}
              onChange={(e) => setJobStatusSelectValue(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* LOCATION / MIN / MAX SALARY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              value={jobLocationInput}
              onChange={(e) => setJobLocationInput(e.target.value)}
              placeholder="City, Country or Remote"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Min Salary
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={minimumSalaryInput}
              onChange={(e) => setMinimumSalaryInput(e.target.value)}
              placeholder="e.g., 60000"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
            {formValidationErrors.minSalary && (
              <p className="text-xs text-rose-600 mt-1">
                {formValidationErrors.minSalary}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Max Salary
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={maximumSalaryInput}
              onChange={(e) => setMaximumSalaryInput(e.target.value)}
              placeholder="e.g., 90000"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
            {formValidationErrors.maxSalary && (
              <p className="text-xs text-rose-600 mt-1">
                {formValidationErrors.maxSalary}
              </p>
            )}
          </div>
        </div>

        {/* TAGS */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Tags (comma separated)
          </label>
          <input
            value={jobTagsCsvInput}
            onChange={(e) => setJobTagsCsvInput(e.target.value)}
            placeholder="remote, full-time, senior"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
          <p className="text-xs text-slate-500 mt-1">
            Example: <code>Remote, Full-Time</code>
          </p>
        </div>

        {/* SUBMIT AND CANCEL BUTTONS */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createJobMutation.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 disabled:opacity-60"
          >
            {createJobMutation.isPending ? "Creating…" : "Create Job"}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
          >
            Cancel
          </button>

          {/* SHOW MUTATION ERROR IF PRESENT */}
          {createJobMutation.isError && (
            <span className="text-xs text-rose-600">
              {(createJobMutation.error &&
                (createJobMutation.error.message || "Failed to create job.")) ||
                "Failed to create job."}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
