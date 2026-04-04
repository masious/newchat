import { Mail } from "lucide-react";

export function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Mail className="h-12 w-12 text-slate-300 dark:text-slate-600" strokeWidth={1} />
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No messages yet</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Send the first message to start the conversation.</p>
    </div>
  );
}
