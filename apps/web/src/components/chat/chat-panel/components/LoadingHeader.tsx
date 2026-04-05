import { ChatListContext } from "../types";

export default function LoadingHeader({ context }: { context?: ChatListContext }) {
  if (!context) return null;
  if (context.isFetchingOlder) {
    return (
      <div className="flex justify-center py-3">
        <span className="text-xs text-slate-400">Loading older messages…</span>
      </div>
    );
  }
  if (!context.hasOlderMessages) {
    return (
      <div className="flex justify-center py-3">
        <span className="text-xs text-slate-400">Start of conversation</span>
      </div>
    );
  }
  return null;
}
