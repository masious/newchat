import { Upload } from "lucide-react";

export function DragOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400 bg-white/70 text-center text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
      <Upload className="mb-2 h-10 w-10 text-indigo-500" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-indigo-600">
        Drop files to share
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Images, documents, or audio</p>
    </div>
  );
}
