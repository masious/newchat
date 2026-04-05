import { cn } from "@/lib/cn";
import { Clock } from "lucide-react";
import { formatRelativeTime, formatAbsoluteTime } from "@/lib/formatting";
import { AttachmentPreview, type Attachment } from "./components/AttachmentPreview";
import CheckIcon from "./components/CheckIcon";
import DoubleCheckIcon from "./components/DoubleCheckIcon";

export function MessageBubble({
  content,
  createdAt,
  isMine,
  readByOthers,
  attachments,
  isPending = false,
  isFailed = false,
}: {
  content: string | null;
  createdAt: string | Date;
  isMine: boolean;
  readByOthers: boolean;
  attachments?: Attachment[] | null;
  isPending?: boolean;
  isFailed?: boolean;
}) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-md rounded-2xl px-4 py-2 text-sm shadow",
          isMine
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
          isPending && "opacity-85",
        )}
      >
        {attachments && attachments.length > 0 && (
          <div className="mb-1.5 flex flex-col gap-1.5 -mx-2">
            {attachments.map((att, i) => (
              <AttachmentPreview key={i} attachment={att} isMine={isMine} />
            ))}
          </div>
        )}
        {content && <p>{content}</p>}
        <span
          className={cn(
            "mt-1 flex justify-end items-center gap-1 text-[10px] opacity-80",
            isMine ? "text-white" : "text-slate-600 dark:text-slate-400",
          )}
          title={isPending ? "Sending..." : formatAbsoluteTime(createdAt)}
        >
          {isPending ? "Sending" : formatRelativeTime(createdAt)}
          {isMine && (
            <span className="text-[10px] font-bold">
              {isPending ? (
                <span className="animate-pending-clock">
                  <Clock size={12} strokeWidth={2} />
                </span>
              ) : isFailed ? (
                <span className="text-red-300">!</span>
              ) : readByOthers ? (
                <DoubleCheckIcon size={12} />
              ) : (
                <CheckIcon size={12} />
              )}
            </span>
          )}
        </span>
        {isFailed && (
          <p className="mt-1 text-[10px] text-red-300">Failed to send</p>
        )}
      </div>
    </div>
  );
}
