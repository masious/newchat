import Image from "next/image";
import { Progress } from "@base-ui/react/progress";
import { isImageType } from "@/lib/upload";
import { FileText, X } from "lucide-react";

export function PendingAttachments({
  files,
  onRemove,
  uploadProgress,
}: {
  files: File[];
  onRemove: (index: number) => void;
  uploadProgress?: Map<number, number>;
}) {
  if (!files.length) return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-6 pt-3">
      {files.map((file, i) => {
        const progress = uploadProgress?.get(i);
        return (
          <div
            key={`${file.name}-${i}`}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {isImageType(file.type) ? (
                <Image
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  width={32}
                  height={32}
                  className="rounded object-cover"
                />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="max-w-30 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {progress != null && (
              <Progress.Root value={progress} className="w-full">
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
