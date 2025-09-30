import { useToastStore } from "../../store/index.js";
export default function Toasts() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-3 py-2 shadow bg-white border ${
            t.type === "error" ? "border-red-300" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                t.type === "error" ? "bg-red-500" : "bg-emerald-500"
              }`}
            />
            <span className="text-sm">{t.msg}</span>
            <button
              onClick={() => remove(t.id)}
              className="ml-2 text-xs text-slate-500"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
