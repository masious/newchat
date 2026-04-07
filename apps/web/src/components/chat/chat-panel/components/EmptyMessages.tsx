import { Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function EmptyMessages() {
  return (
    <EmptyState
      icon={<Mail className="h-12 w-12" strokeWidth={1} />}
      heading="No messages yet"
      description="Send the first message to start the conversation."
      className="py-16"
    />
  );
}
