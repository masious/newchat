import { ChangeEvent, RefObject } from "react";
import { Paperclip } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

export function AttachButton({
  fileInputRef,
  onFileSelect,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <IconButton
        type="button"
        onClick={() => fileInputRef.current?.click()}
        label="Attach file"
      >
        <Paperclip className="h-5 w-5" />
      </IconButton>
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
