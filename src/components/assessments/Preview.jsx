import React, { useMemo, useState } from "react";

/** RESPONSEINPUTFIELD
 * RENDERS THE CORRECT CONTROL FOR A GIVEN QUESTION TYPE AND REPORTS CHANGES UP */
function ResponseInputField({ questionDefinition, responseValue, onResponseChange }) {
  const sharedInputClasses =
    "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <div className="space-y-2">
      {/* SHOW THE QUESTION LABEL AND A REQUIRED MARKER WHEN APPLICABLE */}
      <div className="font-medium">
        {questionDefinition.label}{" "}
        {questionDefinition.required ? <span className="text-red-600">*</span> : null}
      </div>

      {/* RENDER A MULTI-SELECT (CHECKBOX GROUP) WHEN TYPE === 'multi' */}
      {questionDefinition.type === "multi" && (
        <div className="flex flex-wrap gap-2">
          {(questionDefinition.options ?? []).map((optionLabel) => (
            <label key={optionLabel} className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                checked={Array.isArray(responseValue) && responseValue.includes(optionLabel)}
                onChange={(event) => {
                  const workingSet = new Set(Array.isArray(responseValue) ? responseValue : []);
                  event.target.checked ? workingSet.add(optionLabel) : workingSet.delete(optionLabel);
                  onResponseChange([...workingSet]);
                }}
              />{" "}
              {optionLabel}
            </label>
          ))}
        </div>
      )}

      {/* RENDER A SINGLE-SELECT (RADIO GROUP) WHEN TYPE === 'single' */}
      {questionDefinition.type === "single" && (
        <div className="flex flex-wrap gap-2">
          {(questionDefinition.options ?? []).map((optionLabel) => (
            <label key={optionLabel} className="text-sm flex items-center gap-1">
              <input
                type="radio"
                name={questionDefinition.id}
                checked={responseValue === optionLabel}
                onChange={() => onResponseChange(optionLabel)}
              />{" "}
              {optionLabel}
            </label>
          ))}
        </div>
      )}

      {/* RENDER A SHORT TEXT INPUT WHEN TYPE === 'short' */}
      {questionDefinition.type === "short" && (
        <input
          className={sharedInputClasses}
          value={responseValue || ""}
          onChange={(e) => onResponseChange(e.target.value)}
          maxLength={questionDefinition.maxLength || 200}
        />
      )}

      {/* RENDER A LONG TEXTAREA WHEN TYPE === 'long' */}
      {questionDefinition.type === "long" && (
        <textarea
          className={sharedInputClasses}
          value={responseValue || ""}
          onChange={(e) => onResponseChange(e.target.value)}
          maxLength={questionDefinition.maxLength || 1000}
          rows={4}
        />
      )}

      {/* RENDER A NUMERIC INPUT WHEN TYPE === 'numeric' */}
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

      {/* RENDER A FILE PICKER WHEN TYPE === 'file' (STORE FILE NAME BY DEFAULT) */}
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

/** PREVIEW
 * DISPLAYS AN ASSESSMENT-LIKE FORM AND RETURNS ANSWERS AFTER VALIDATION */
export default function Preview({ doc, onSubmit }) {
  const [answerMapByQuestionId, setAnswerMapByQuestionId] = useState({});

  // VALIDATE ALL ANSWERS AGAINST QUESTION DEFINITIONS AND RETURN A LIST OF ERRORS
  function validateAllAnswers() {
    const validationErrors = [];

    for (const section of doc.sections || []) {
      for (const question of section.questions || []) {
        const userValue = answerMapByQuestionId[question.id];

        // ENFORCE REQUIRED FIELDS
        if (
          question.required &&
          (userValue == null || (Array.isArray(userValue) && userValue.length === 0) || userValue === "")
        ) {
          validationErrors.push(`${question.label} is required`);
        }

        // ENFORCE NUMERIC RANGE WHEN PRESENT
        if (question.type === "numeric" && userValue != null) {
          if (question.min != null && userValue < question.min) {
            validationErrors.push(`${question.label}: min ${question.min}`);
          }
          if (question.max != null && userValue > question.max) {
            validationErrors.push(`${question.label}: max ${question.max}`);
          }
        }

        // ENFORCE LENGTH LIMITS FOR TEXT INPUTS
        if ((question.type === "short" || question.type === "long") && question.maxLength) {
          if ((userValue || "").length > question.maxLength) {
            validationErrors.push(`${question.label}: too long`);
          }
        }

        // VALIDATE SINGLE-CHOICE OPTION INTEGRITY WHEN OPTIONS ARE PROVIDED
        if (question.type === "single" && userValue != null && question.options?.length) {
          if (!question.options.includes(userValue)) {
            validationErrors.push(`${question.label}: invalid option`);
          }
        }

        // VALIDATE MULTI-CHOICE OPTION INTEGRITY WHEN OPTIONS ARE PROVIDED
        if (question.type === "multi" && Array.isArray(userValue) && question.options?.length) {
          const hasInvalid = userValue.some((val) => !question.options.includes(val));
          if (hasInvalid) validationErrors.push(`${question.label}: contains invalid option(s)`);
        }
      }
    }

    return validationErrors;
  }

  // PRECOMPUTE SECTION ARRAY AND QUESTION COUNT FOR HEADER
  const sectionList = doc.sections || [];
  const totalQuestionCount = useMemo(
    () => sectionList.reduce((acc, s) => acc + (s.questions?.length || 0), 0),
    [sectionList]
  );

  return (
    <div className="space-y-4">
      {/* DISPLAY A LIGHTWEIGHT HEADER WITH QUESTION COUNT */}
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Assessment Preview</div>
        <div className="text-sm text-slate-600">
          {totalQuestionCount} question{totalQuestionCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* RENDER EACH SECTION FOLLOWED BY ITS QUESTIONS */}
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

      {/* VALIDATE INPUTS AND FORWARD ANSWERS WHEN SUBMIT IS CLICKED */}
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
