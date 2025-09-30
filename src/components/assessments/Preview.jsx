import React, { useMemo, useState } from "react";

/**
 * ResponseInputField
 * Renders the appropriate input control depending on the question type:
 * - short text
 * - long text
 * - numeric
 * - single-select (radio)
 * - multi-select (checkbox)
 * - file upload
 *
 * Calls `onResponseChange` whenever the user changes the answer.
 */
function ResponseInputField({
  questionDefinition,
  responseValue,
  onResponseChange,
}) {
  const sharedInputClasses =
    "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <div className="space-y-2">
      {/* QUESTION LABEL */}
      <div className="font-medium">
        {questionDefinition.label}{" "}
        {questionDefinition.required && <span className="text-red-600">*</span>}
      </div>

      {/* MULTI-SELECT CHECKBOXES */}
      {questionDefinition.type === "multi" && (
        <div className="flex flex-wrap gap-2">
          {(questionDefinition.options ?? []).map((optionLabel) => (
            <label
              key={optionLabel}
              className="text-sm flex items-center gap-1"
            >
              <input
                type="checkbox"
                checked={
                  Array.isArray(responseValue) &&
                  responseValue.includes(optionLabel)
                }
                onChange={(e) => {
                  const updatedSet = new Set(
                    Array.isArray(responseValue) ? responseValue : []
                  );
                  e.target.checked
                    ? updatedSet.add(optionLabel)
                    : updatedSet.delete(optionLabel);
                  onResponseChange([...updatedSet]);
                }}
              />
              {optionLabel}
            </label>
          ))}
        </div>
      )}

      {/* SINGLE-SELECT RADIO BUTTONS */}
      {questionDefinition.type === "single" && (
        <div className="flex flex-wrap gap-2">
          {(questionDefinition.options ?? []).map((optionLabel) => (
            <label
              key={optionLabel}
              className="text-sm flex items-center gap-1"
            >
              <input
                type="radio"
                name={questionDefinition.id}
                checked={responseValue === optionLabel}
                onChange={() => onResponseChange(optionLabel)}
              />
              {optionLabel}
            </label>
          ))}
        </div>
      )}

      {/* SHORT TEXT INPUT */}
      {questionDefinition.type === "short" && (
        <input
          className={sharedInputClasses}
          value={responseValue || ""}
          onChange={(e) => onResponseChange(e.target.value)}
          maxLength={questionDefinition.maxLength || 200}
        />
      )}

      {/* LONG TEXTAREA */}
      {questionDefinition.type === "long" && (
        <textarea
          className={sharedInputClasses}
          value={responseValue || ""}
          onChange={(e) => onResponseChange(e.target.value)}
          maxLength={questionDefinition.maxLength || 1000}
          rows={4}
        />
      )}

      {/* NUMERIC INPUT */}
      {questionDefinition.type === "numeric" && (
        <input
          type="number"
          className={sharedInputClasses}
          value={responseValue ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            onResponseChange(raw === "" ? undefined : Number(raw));
          }}
          min={questionDefinition.min}
          max={questionDefinition.max}
        />
      )}

      {/* FILE UPLOAD */}
      {questionDefinition.type === "file" && (
        <input
          type="file"
          accept={questionDefinition.accept}
          onChange={(e) => onResponseChange(e.target.files?.[0]?.name || "")}
        />
      )}
    </div>
  );
}

/**
 * Preview
 * Renders an assessment-like form from a document (doc).
 * Tracks answers in local state and validates them on submit.
 */
export default function Preview({ doc, onSubmit }) {
  // Stores all answers keyed by question ID
  const [answerMapByQuestionId, setAnswerMapByQuestionId] = useState({});

  /** Validate all answers and return a list of error messages */
  function validateAllAnswers() {
    const errors = [];

    for (const section of doc.sections || []) {
      for (const question of section.questions || []) {
        const userValue = answerMapByQuestionId[question.id];

        // REQUIRED FIELD CHECK
        if (
          question.required &&
          (userValue == null ||
            (Array.isArray(userValue) && userValue.length === 0) ||
            userValue === "")
        ) {
          errors.push(`${question.label} is required`);
        }

        // NUMERIC RANGE CHECK
        if (question.type === "numeric" && userValue != null) {
          if (question.min != null && userValue < question.min) {
            errors.push(`${question.label}: min ${question.min}`);
          }
          if (question.max != null && userValue > question.max) {
            errors.push(`${question.label}: max ${question.max}`);
          }
        }

        // TEXT LENGTH CHECK
        if (
          (question.type === "short" || question.type === "long") &&
          question.maxLength
        ) {
          if ((userValue || "").length > question.maxLength) {
            errors.push(`${question.label}: too long`);
          }
        }

        // SINGLE-CHOICE OPTION VALIDATION
        if (
          question.type === "single" &&
          userValue != null &&
          question.options?.length
        ) {
          if (!question.options.includes(userValue)) {
            errors.push(`${question.label}: invalid option`);
          }
        }

        // MULTI-CHOICE OPTION VALIDATION
        if (
          question.type === "multi" &&
          Array.isArray(userValue) &&
          question.options?.length
        ) {
          const hasInvalid = userValue.some(
            (val) => !question.options.includes(val)
          );
          if (hasInvalid)
            errors.push(`${question.label}: contains invalid option(s)`);
        }
      }
    }

    return errors;
  }

  // PRECOMPUTE TOTAL QUESTION COUNT
  const sectionList = doc.sections || [];
  const totalQuestionCount = useMemo(
    () => sectionList.reduce((acc, s) => acc + (s.questions?.length || 0), 0),
    [sectionList]
  );

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Assessment Preview</div>
        <div className="text-sm text-slate-600">
          {totalQuestionCount} question{totalQuestionCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* RENDER SECTIONS AND QUESTIONS */}
      {sectionList.map((section) => (
        <div key={section.id} className="space-y-3">
          <div className="font-semibold text-lg">{section.title}</div>

          {section.questions?.map((question) => (
            <ResponseInputField
              key={question.id}
              questionDefinition={question}
              responseValue={answerMapByQuestionId[question.id]}
              onResponseChange={(nextValue) =>
                setAnswerMapByQuestionId((prev) => ({
                  ...prev,
                  [question.id]: nextValue,
                }))
              }
            />
          ))}
        </div>
      ))}

      {/* SUBMIT BUTTON */}
      <div className="pt-2">
        <button
          className="px-3 py-2 rounded bg-slate-900 text-white"
          onClick={() => {
            const errors = validateAllAnswers();
            if (errors.length) {
              alert(errors.join("\n"));
              return;
            }
            onSubmit(answerMapByQuestionId);
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
