import React from "react";

/**  QUESTIONEDITOR
 * RENDERS A SMALL FORM TO EDIT A SINGLE QUESTION OBJECT AND NOTIFIES PARENT
 * ABOUT CHANGES OR REMOVAL. ALL INPUTS ARE FULLY CONTROLLED BY PROPS. */
export default function QuestionEditor({ q, onChange, onRemove }) {
  /** APPLYPATCH
   * MERGES A PARTIAL UPDATE INTO THE CURRENT QUESTION AND EMITS ONCHANGE*/
  function applyPatch(partialUpdate) {
    onChange({ ...q, ...partialUpdate });
  }

  /** PARSECSVOPTIONS
   * TURNS A COMMA-SEPARATED STRING INTO A CLEAN ARRAY OF OPTION LABELS */
  function parseCsvOptions(value) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** PARSENUMERICORUNDEFINED
   * CONVERTS STRING INPUTS TO NUMBERS; EMITS UNDEFINED FOR EMPTY STRINGS */
  function parseNumericOrUndefined(value) {
    return value === "" ? undefined : Number(value);
  }

  return (
    <div className="border rounded-xl p-3 bg-white">
      {/* MAIN GRID: GROUP RELATED CONTROLS FOR BETTER SCANNABILITY */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* EDIT QUESTION LABEL TEXT */}
        <label className="text-sm">
          Label
          <input
            value={q.label || ""}
            onChange={(e) => applyPatch({ label: e.target.value })}
            className="w-full border rounded px-2 py-1"
          />
        </label>

        {/* SELECT QUESTION TYPE FROM SUPPORTED VARIANTS */}
        <label className="text-sm">
          Type
          <select
            value={q.type}
            onChange={(e) => applyPatch({ type: e.target.value })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="single">single</option>
            <option value="multi">multi</option>
            <option value="short">short</option>
            <option value="long">long</option>
            <option value="numeric">numeric</option>
            <option value="file">file</option>
          </select>
        </label>

        {/* TOGGLE REQUIRED FLAG FOR VALIDATION ENFORCEMENT */}
        <label className="text-sm">
          Required
          <input
            type="checkbox"
            checked={!!q.required}
            onChange={(e) => applyPatch({ required: e.target.checked })}
            className="ml-2"
          />
        </label>

        {/* WHEN QUESTION IS CHOICE-BASED, CAPTURE OPTIONS AS CSV */}
        {(q.type === "single" || q.type === "multi") && (
          <label className="text-sm col-span-full">
            Options (comma separated)
            <input
              value={(q.options || []).join(",")}
              onChange={(e) => applyPatch({ options: parseCsvOptions(e.target.value) })}
              className="w-full border rounded px-2 py-1"
            />
          </label>
        )}

        {/* WHEN QUESTION IS NUMERIC, OFFER MIN/MAX BOUNDS */}
        {q.type === "numeric" && (
          <div className="grid grid-cols-2 gap-2 col-span-full">
            <label className="text-sm">
              Min
              <input
                type="number"
                value={q.min ?? ""}
                onChange={(e) => applyPatch({ min: parseNumericOrUndefined(e.target.value) })}
                className="w-full border rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Max
              <input
                type="number"
                value={q.max ?? ""}
                onChange={(e) => applyPatch({ max: parseNumericOrUndefined(e.target.value) })}
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </div>
        )}

        {/* WHEN QUESTION IS TEXT-BASED, ALLOW MAXIMUM LENGTH LIMIT */}
        {(q.type === "short" || q.type === "long") && (
          <label className="text-sm col-span-full">
            Max length
            <input
              type="number"
              value={q.maxLength ?? ""}
              onChange={(e) =>
                applyPatch({ maxLength: parseNumericOrUndefined(e.target.value) })
              }
              className="w-full border rounded px-2 py-1"
            />
          </label>
        )}
      </div>

      {/* DANGEROUS ACTION: ALLOW REMOVAL OF THIS QUESTION */}
      <div className="pt-2">
        <button className="text-red-600 text-sm" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
