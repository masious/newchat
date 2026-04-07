import { MessageCircle } from "lucide-react";
import { EmptyState as EmptyStateBase } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export function EmptyState({
  onOpenNewChat,
}: {
  onOpenNewChat: () => void;
}) {
  return (
    <EmptyStateBase
      icon={<MessageCircle className="h-12 w-12" strokeWidth={1} />}
      heading="No conversations yet"
      description="Search for people above or start a new chat."
      className="px-6 py-12"
      action={
        <Button size="sm" onClick={onOpenNewChat}>
          Start a new chat
        </Button>
      }
    />
  );
}
