// src/pages/NewJobPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listJobs, createJob } from "../api/services/jobs.js";

/* LIGHTWEIGHT TOAST COMPONENT FOR SUCCESS FEEDBACK
   RESPONSIBILITY: AUTO-HIDE AFTER A SHORT DURATION */
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

/* STATIC SELECT OPTIONS FOR FORM CONTROLS */
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

/* SLUG GENERATOR
   RESPONSIBILITY: PRODUCE A URL-FRIENDLY, CONSISTENT SLUG FROM FREE TEXT */
function makeUrlFriendlySlugFromText(textInput) {
  return String(textInput || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/* NEW JOB PAGE (DEFAULT EXPORT)
   RESPONSIBILITY: RENDER CREATE-FORM, VALIDATE INPUTS, CREATE JOB VIA API,
                   AND INVALIDATE RELEVANT QUERIES AFTER SUCCESS*/
export default function NewJobPage() {
  /*  REACT-QUERY CLIENT AND NAVIGATION HANDLES */
  const reactQueryClientInstance = useQueryClient();
  const navigate = useNavigate();

  /* TOAST VISIBILITY STATE */
  const [isToastVisible, setIsToastVisible] = useState(false);

  /*PREFETCH JOBS TO ENFORCE CLIENT-SIDE SLUG UNIQUENESS
     QUERY KEY IS KEPT COMPATIBLE WITH EXISTING CACHE INVALIDATIONS */
  const { data: existingJobsQueryData } = useQuery({
    queryKey: ["all-jobs-for-slug-check"],
    queryFn: () => listJobs({ page: 1, pageSize: 2000 }),
  });

  /*  BUILD A LOWERCASED SET OF EXISTING SLUGS FOR O(1) LOOKUPS */
  const existingJobSlugSetLower = useMemo(
    () =>
      new Set(
        (existingJobsQueryData?.items ?? []).map((job) =>
          String(job.slug || "").toLowerCase()
        )
      ),
    [existingJobsQueryData]
  );

  /* FORM STATE: EACH FIELD STORED EXPLICITLY FOR TRACEABILITY */
  const [jobTitleInput, setJobTitleInput] = useState("");
  const [jobSlugInput, setJobSlugInput] = useState("");
  const [jobStatusSelectValue, setJobStatusSelectValue] = useState("active");
  const [selectedDepartment, setSelectedDepartment] = useState(ALL_DEPARTMENTS_OPTIONS[0]);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState(ALL_EMPLOYMENT_TYPES[0]);
  const [selectedSeniorityLevel, setSelectedSeniorityLevel] = useState(ALL_SENIORITY_LEVELS[1]); // MID
  const [jobLocationInput, setJobLocationInput] = useState("");
  const [minimumSalaryInput, setMinimumSalaryInput] = useState("");
  const [maximumSalaryInput, setMaximumSalaryInput] = useState("");
  const [jobDescriptionInput, setJobDescriptionInput] = useState("");
  const [jobTagsCsvInput, setJobTagsCsvInput] = useState("remote, full-time");

  /*SLUG AUTO-SYNC WITH TITLE UNTIL USER OVERRIDES MANUALLY */
  const [hasUserManuallyEditedSlug, setHasUserManuallyEditedSlug] = useState(false);
  useEffect(() => {
    if (!hasUserManuallyEditedSlug) {
      setJobSlugInput(makeUrlFriendlySlugFromText(jobTitleInput));
    }
  }, [jobTitleInput, hasUserManuallyEditedSlug]);

  /* FORM VALIDATION ERRORS STATE */
  const [formValidationErrors, setFormValidationErrors] = useState({});

  /*VALIDATION FUNCTION
     RESPONSIBILITY: POPULATE ERROR OBJECT AND RETURN BOOLEAN STATUS */
  function validateFormAndCollectErrors() {
    const nextErrors = {};

    if (!jobTitleInput.trim()) {
      nextErrors.title = "Title is required.";
    }

    const normalizedSlugCandidate = makeUrlFriendlySlugFromText(jobSlugInput || jobTitleInput);
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

  /* CREATE JOB MUTATION
     RESPONSIBILITY: CALL API, INVALIDATE RELEVANT QUERIES, SHOW TOAST, NAVIGATE*/
  const createJobMutation = useMutation({
    mutationFn: (payload) => createJob(payload),
    onSuccess: () => {
      // INVALIDATE CACHES THAT MAY DISPLAY JOB LISTS
      reactQueryClientInstance.invalidateQueries({ queryKey: ["all-jobs-for-slug-check"] });
      reactQueryClientInstance.invalidateQueries({ queryKey: ["jobs"] });
      reactQueryClientInstance.invalidateQueries({ queryKey: ["dash-jobs"] });

      // SHOW SUCCESS TOAST AND REDIRECT AFTER A SHORT DELAY
      setIsToastVisible(true);
      setTimeout(() => {
        navigate("/hr/jobs");
      }, 1200);
    },
  });

  /* FORM SUBMIT HANDLER
     RESPONSIBILITY: VALIDATE INPUTS, BUILD PAYLOAD, TRIGGER MUTATION
     SERVER CONTRACT: PERSISTS { title, slug, status, tags } (+order)*/
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

  /* RENDER PAGE WITH HEADER, FORM, AND FEEDBACK ELEMENTS */
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
        <h2 className="text-xl font-semibold text-slate-800">Create a new job</h2>
        <p className="text-sm text-slate-500 mt-1">
          Fill in the details below. Title and unique slug are required.
        </p>
      </div>

      {/* CREATE JOB FORM */}
      <form
        onSubmit={handleSubmitCreateJobForm}
        className="rounded-2xl bg-white border shadow-sm p-5 space-y-5"
      >
        {/* TITLE FIELD */}
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
            <p className="text-xs text-rose-600 mt-1">{formValidationErrors.title}</p>
          )}
        </div>

        {/* DEPARTMENT SELECT */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Department</label>
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

        {/* DESCRIPTION TEXTAREA */}
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

        {/* SLUG FIELD WITH AUTO-GENERATION AND NORMALIZATION */}
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
            onBlur={() => setJobSlugInput(makeUrlFriendlySlugFromText(jobSlugInput))}
            placeholder="Auto-generated from Title"
            className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
          />
          {formValidationErrors.slug && (
            <p className="text-xs text-rose-600 mt-1">{formValidationErrors.slug}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Will be used in URLs, must be unique.
          </p>
        </div>

        {/* ROW: TYPE / LEVEL / STATUS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
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

          <div>
            <label className="block text-sm font-medium text-slate-700">Level</label>
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

          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
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

        {/* ROW: LOCATION / MIN / MAX SALARY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Location</label>
            <input
              value={jobLocationInput}
              onChange={(e) => setJobLocationInput(e.target.value)}
              placeholder="City, Country or Remote"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Min Salary</label>
            <input
              type="number"
              inputMode="numeric"
              value={minimumSalaryInput}
              onChange={(e) => setMinimumSalaryInput(e.target.value)}
              placeholder="e.g., 60000"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
            {formValidationErrors.minSalary && (
              <p className="text-xs text-rose-600 mt-1">{formValidationErrors.minSalary}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Max Salary</label>
            <input
              type="number"
              inputMode="numeric"
              value={maximumSalaryInput}
              onChange={(e) => setMaximumSalaryInput(e.target.value)}
              placeholder="e.g., 90000"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            />
            {formValidationErrors.maxSalary && (
              <p className="text-xs text-rose-600 mt-1">{formValidationErrors.maxSalary}</p>
            )}
          </div>
        </div>

        {/* TAGS CSV INPUT */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Tags (comma separated)
          </label>
        </div>
        <input
          value={jobTagsCsvInput}
          onChange={(e) => setJobTagsCsvInput(e.target.value)}
          placeholder="remote, full-time, senior"
          className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
        />
        <p className="text-xs text-slate-500 mt-1">
          Example: <code>Remote, Full-Time</code>
        </p>

        {/* SUBMIT AND CANCEL CONTROLS */}
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
