import React from "react";

/**
 * QuestionEditor
 * Renders a small form to edit a single question object.
 *
 * Props:
 * - q: the question object to edit
 * - onChange: callback to notify parent when the question changes
 * - onRemove: callback to remove this question
 */
export default function QuestionEditor({ q, onChange, onRemove }) {
  /**
   * applyPatch
   * Helper to merge partial updates into the current question
   * and notify the parent via onChange.
   */
  function applyPatch(partialUpdate) {
    onChange({ ...q, ...partialUpdate });
  }

  /**
   * parseCsvOptions
   * Converts a comma-separated string into an array of trimmed option labels.
   */
  function parseCsvOptions(value) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean); // remove empty strings
  }

  /**
   * parseNumericOrUndefined
   * Converts string input to a number or undefined for empty inputs.
   */
  function parseNumericOrUndefined(value) {
    return value === "" ? undefined : Number(value);
  }

  return (
    <div className="border rounded-xl p-3 bg-white space-y-2">
      {/* MAIN GRID: Organize controls into two columns on medium screens */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Question Label */}
        <label className="text-sm">
          Label
          <input
            className="w-full border rounded px-2 py-1"
            value={q.label || ""}
            onChange={(e) => applyPatch({ label: e.target.value })}
          />
        </label>

        {/* Question Type Selector */}
        <label className="text-sm">
          Type
          <select
            className="w-full border rounded px-2 py-1"
            value={q.type}
            onChange={(e) => applyPatch({ type: e.target.value })}
          >
            <option value="single">single</option>
            <option value="multi">multi</option>
            <option value="short">short</option>
            <option value="long">long</option>
            <option value="numeric">numeric</option>
            <option value="file">file</option>
          </select>
        </label>

        {/* Required Checkbox */}
        <label className="text-sm flex items-center gap-2">
          Required
          <input
            type="checkbox"
            checked={!!q.required}
            onChange={(e) => applyPatch({ required: e.target.checked })}
          />
        </label>

        {/* Options Input for Choice-Based Questions */}
        {(q.type === "single" || q.type === "multi") && (
          <label className="text-sm col-span-full">
            Options (comma separated)
            <input
              className="w-full border rounded px-2 py-1"
              value={(q.options || []).join(",")}
              onChange={(e) =>
                applyPatch({ options: parseCsvOptions(e.target.value) })
              }
            />
          </label>
        )}

        {/* Min/Max Inputs for Numeric Questions */}
        {q.type === "numeric" && (
          <div className="grid grid-cols-2 gap-2 col-span-full">
            <label className="text-sm">
              Min
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={q.min ?? ""}
                onChange={(e) =>
                  applyPatch({ min: parseNumericOrUndefined(e.target.value) })
                }
              />
            </label>
            <label className="text-sm">
              Max
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={q.max ?? ""}
                onChange={(e) =>
                  applyPatch({ max: parseNumericOrUndefined(e.target.value) })
                }
              />
            </label>
          </div>
        )}

        {/* Max Length Input for Text Questions */}
        {(q.type === "short" || q.type === "long") && (
          <label className="text-sm col-span-full">
            Max length
            <input
              type="number"
              className="w-full border rounded px-2 py-1"
              value={q.maxLength ?? ""}
              onChange={(e) =>
                applyPatch({
                  maxLength: parseNumericOrUndefined(e.target.value),
                })
              }
            />
          </label>
        )}
      </div>

      {/* Remove Button */}
      <div>
        <button className="text-red-600 text-sm" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
