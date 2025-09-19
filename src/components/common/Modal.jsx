import React from "react";

/*  MODAL
 * THIS COMPONENT RENDERS A CENTERED DIALOG WHEN `open` IS TRUE AND REMOVES
 * IT FROM THE DOM WHEN `open` IS FALSE. CLICKING THE BACKDROP OR THE CLOSE
 * BUTTON INVOKES `onClose`. CONTENT IS PASSED VIA `children`. */
export default function Modal({ open, onClose, title, children }) {
  // GUARD CLAUSE: DO NOT RENDER ANYTHING IF THE MODAL IS NOT OPEN
  if (!open) return null;

  // HANDLER: INVOKE THE PROVIDED CLOSE CALLBACK (NO-OP IF UNDEFINED)
  const handleRequestClose = () => {
    if (typeof onClose === "function") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* CLICKING THE BACKDROP DISMISSES THE MODAL */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleRequestClose}
      />

      {/* DIALOG CONTAINER: KEEPS CONTENT FOCUSED AND CENTERED */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
        {/* HEADER: TITLE + DISMISS BUTTON */}
        <div className="flex items-center justify-between border-b pb-2">
          <h3 id="modal-title" className="font-semibold text-slate-900">
            {title}
          </h3>

          {/* CLOSE BUTTON: TRIGGERS THE SAME DISMISS FLOW AS BACKDROP */}
          <button
            type="button"
            onClick={handleRequestClose}
            className="rounded px-2 py-1 transition hover:bg-slate-100"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* BODY: RENDERS WHATEVER IS PASSED AS CHILD CONTENT */}
        <div className="pt-3">{children}</div>
      </div>
    </div>
  );
}
