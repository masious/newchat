import { ChangeEvent, RefObject } from "react";
import { Paperclip } from "lucide-react";
import { IconTooltip } from "@/components/ui/icon-tooltip";

export function AttachButton({
  fileInputRef,
  onFileSelect,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <IconTooltip label="Attach file">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center text-slate-500 dark:text-slate-400"
        >
          <Paperclip className="h-5 w-5" />
        </button>
      </IconTooltip>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
    </>
  );
}
