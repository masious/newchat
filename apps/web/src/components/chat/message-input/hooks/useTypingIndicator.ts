import { useRef } from "react";
import { trpc } from "@/lib/trpc";

export function useTypingIndicator(conversationId: number) {
  const lastTypingRef = useRef(0);
  const typingMutation = trpc.messages.typing.useMutation();

  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      typingMutation.mutate({ conversationId });
      lastTypingRef.current = now;
    }
  };

  const resetTypingThrottle = () => {
    lastTypingRef.current = 0;
  };

  return { notifyTyping, resetTypingThrottle };
}
