import { MessageCircle } from "lucide-react";

export function EmptyState({
  onOpenNewChat,
}: {
  onOpenNewChat: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <MessageCircle className="h-12 w-12 text-slate-300 dark:text-slate-600" strokeWidth={1} />
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No conversations yet</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Search for people above or start a new chat.</p>
      <button
        onClick={onOpenNewChat}
        className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
      >
        Start a new chat
      </button>
    </div>
  );
}
