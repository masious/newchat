import Image from "next/image";
import { Progress } from "@base-ui/react/progress";
import { isImageType } from "@/lib/upload";
import { FileText, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { UploadEntryWithId } from "../hooks/useFileAttachments";

export function PendingAttachments({
  entries,
  onRemove,
}: {
  entries: UploadEntryWithId[];
  onRemove: (id: string) => void;
}) {
  if (!entries.length) return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-6 pt-3">
      {entries.map((entry) => {
        const showProgress =
          entry.status === "uploading" || entry.status === "pending";
        return (
          <div key={entry.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {isImageType(entry.file.type) ? (
                <Image
                  src={URL.createObjectURL(entry.file)}
                  alt={entry.file.name}
                  width={32}
                  height={32}
                  className="rounded object-cover"
                />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="max-w-30 truncate">{entry.file.name}</span>
              {entry.status === "error" && (
                <span className="text-red-500 text-[10px]">Failed</span>
              )}
              <IconButton
                type="button"
                size="xs"
                onClick={() => onRemove(entry.id)}
                className="ml-1"
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            {showProgress && entry.progress > 0 && (
              <Progress.Root value={entry.progress} className="w-full">
                <Progress.Track className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <Progress.Indicator className="h-full rounded-full bg-indigo-600 transition-all" />
                </Progress.Track>
              </Progress.Root>
            )}
          </div>
        );
      })}
    </div>
  );
}
