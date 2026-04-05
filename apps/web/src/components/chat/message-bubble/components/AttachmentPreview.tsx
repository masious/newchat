import { cn } from "@/lib/cn";
import { isImageType, formatFileSize } from "@/lib/upload";
import type { Attachment } from "@/lib/trpc-types";
import Image from "next/image";
import { FileDown } from "lucide-react";

export type { Attachment };

export function AttachmentPreview({
  attachment,
  isMine,
}: {
  attachment: Attachment;
  isMine: boolean;
}) {
  if (isImageType(attachment.type)) {
    const { width, height } = attachment;
    const hasDimensions = width != null && height != null;

    // Calculate display dimensions with max constraints
    const maxHeight = 240; // 60 * 4 = 240px (max-h-60)
    let displayWidth: number | undefined;
    let displayHeight: number | undefined;

    if (hasDimensions) {
      if (height > maxHeight) {
        const aspectRatio = width / height;
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      } else {
        displayWidth = width;
        displayHeight = height;
      }
    }

    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
        <div
          className="max-h-60 max-w-full rounded-lg overflow-hidden"
          style={
            hasDimensions
              ? {
                  width: displayWidth,
                  height: displayHeight,
                  aspectRatio: `${width} / ${height}`,
                }
              : undefined
          }
        >
          <Image
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-full object-contain"
            loading="lazy"
            width={width}
            height={height}
          />
        </div>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        isMine
          ? "border-indigo-400 text-indigo-100 hover:bg-indigo-500"
          : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600",
      )}
    >
      <FileDown className="h-4 w-4 shrink-0" />
      <span className="truncate">{attachment.name}</span>
      <span className="shrink-0 opacity-70">{formatFileSize(attachment.size)}</span>
    </a>
  );
}
