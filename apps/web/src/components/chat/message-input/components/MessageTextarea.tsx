import { ChangeEvent, KeyboardEvent, RefObject } from "react";

export function MessageTextarea({
  value,
  onChange,
  onKeyDown,
  textareaRef,
  placeholder = "Write a message",
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
}) {
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className="flex-1 resize-none px-4 py-2 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      style={{ maxHeight: "7.5rem" }}
    />
  );
}
