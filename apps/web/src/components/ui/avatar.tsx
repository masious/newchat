import { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const avatarVariants = cva(
  "shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700",
  {
    variants: {
      size: {
        xs: "h-7 w-7",
        sm: "h-9 w-9",
        md: "h-10 w-10",
        lg: "h-20 w-20",
        xl: "h-24 w-24",
        "2xl": "h-30 w-30",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const fallbackTextSize: Record<NonNullable<VariantProps<typeof avatarVariants>["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-lg",
  "2xl": "text-lg",
};

type AvatarProps = {
  avatarUrl: string | null | undefined;
  name: string;
  status?: "online" | "offline";
  fallback?: ReactNode;
  className?: string;
} & VariantProps<typeof avatarVariants>;

export function Avatar({
  avatarUrl,
  name,
  size = "md",
  status,
  fallback,
  className,
}: AvatarProps) {
  const content = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={name}
      className="h-full w-full object-cover"
    />
  ) : (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center font-semibold text-slate-500 dark:text-slate-400",
        fallbackTextSize[size ?? "md"],
      )}
    >
      {fallback ?? name.slice(0, 1)}
    </div>
  );

  if (status) {
    return (
      <div className="relative shrink-0">
        <div className={cn(avatarVariants({ size }), className)}>
          {content}
        </div>
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-800",
            status === "online" ? "bg-emerald-500" : "bg-slate-400",
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn(avatarVariants({ size }), className)}>
      {content}
    </div>
  );
}
