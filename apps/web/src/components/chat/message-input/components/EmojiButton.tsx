"use client";

import { EmojiPicker } from "@ferrucc-io/emoji-picker";
import { Popover } from "@base-ui/react/popover";
import { Smile } from "lucide-react";

export function EmojiButton({
  onEmojiSelect,
}: {
  onEmojiSelect: (emoji: string) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className="flex items-center justify-center text-slate-500 dark:text-slate-400"
      >
        <Smile className="h-5 w-5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={12}>
          <Popover.Popup className="floating-popup z-50 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="floating-content">
              <EmojiPicker
                className="border-none"
                emojisPerRow={9}
                emojiSize={32}
                onEmojiSelect={onEmojiSelect}
              >
                <EmojiPicker.Header>
                  <EmojiPicker.Input placeholder="Search emoji..." autoFocus />
                </EmojiPicker.Header>
                <EmojiPicker.Group>
                  <EmojiPicker.List containerHeight={350} />
                </EmojiPicker.Group>
              </EmojiPicker>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
