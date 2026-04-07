import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: React.ReactNode;
  heading: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  heading,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {heading}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
