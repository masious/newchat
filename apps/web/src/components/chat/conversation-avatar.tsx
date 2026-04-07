import { cn } from "@/lib/cn";
import type { ConversationSummary } from "@/lib/trpc-types";

function Avatar({
  avatarUrl,
  name,
  size = "h-10 w-10",
  textSize = "text-sm",
}: {
  avatarUrl: string | null;
  name: string;
  size?: string;
  textSize?: string;
}) {
  if (avatarUrl) {
    return (
      <div
        className={cn(size, "shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700")}
      >
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(size, "flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400", textSize)}
    >
      {name.slice(0, 1)}
    </div>
  );
}

export function ConversationAvatar({
  conversation,
  currentUserId,
  containerSize = "h-10 w-10",
  avatarSize = "h-7 w-7",
  avatarTextSize = "text-xs",
  dmAvatarSize = "h-10 w-10",
  dmTextSize = "text-sm",
}: {
  conversation: ConversationSummary;
  currentUserId: number;
  containerSize?: string;
  avatarSize?: string;
  avatarTextSize?: string;
  dmAvatarSize?: string;
  dmTextSize?: string;
}) {
  if (conversation.type === "dm") {
    const other = conversation.members.find((m) => m.id !== currentUserId) ??
      conversation.members[0];
    if (!other) return <Avatar avatarUrl={null} name="?" size={dmAvatarSize} textSize={dmTextSize} />;
    return (
      <Avatar
        avatarUrl={other.avatarUrl}
        name={other.firstName}
        size={dmAvatarSize}
        textSize={dmTextSize}
      />
    );
  }

  // Group: show two stacked avatars
  const first = conversation.members[0];
  const second = conversation.members[1];
  if (!first) return <Avatar avatarUrl={null} name="#" size={dmAvatarSize} textSize={dmTextSize} />;
  if (!second) return <Avatar avatarUrl={first.avatarUrl} name={first.firstName} size={dmAvatarSize} textSize={dmTextSize} />;

  return (
    <div className={cn("relative shrink-0", containerSize)}>
      <div className="absolute bottom-0 left-0">
        <Avatar
          avatarUrl={first.avatarUrl}
          name={first.firstName}
          size={avatarSize}
          textSize={avatarTextSize}
        />
      </div>
      <div className="absolute top-0 right-0 ring-2 ring-white dark:ring-slate-800 rounded-full">
        <Avatar
          avatarUrl={second.avatarUrl}
          name={second.firstName}
          size={avatarSize}
          textSize={avatarTextSize}
        />
      </div>
    </div>
  );
}
