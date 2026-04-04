import { VirtuosoContext } from "../types";
import { TypingBubble } from "./TypingBubble";

export default function TypingFooter({ context }: { context?: VirtuosoContext }) {
  if (!context?.isTyping) return null;
  return (
    <div className="px-4 md:px-6">
      <div className="mx-auto max-w-3xl py-1">
        <TypingBubble name={context.typingUserName ?? undefined} />
      </div>
    </div>
  );
}
