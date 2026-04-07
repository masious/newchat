import { cn } from "@/lib/cn";

type ErrorMessageProps = {
  children?: React.ReactNode;
  className?: string;
};

export function ErrorMessage({ children, className }: ErrorMessageProps) {
  if (!children) return null;
  return (
    <p className={cn("mt-1 text-xs text-red-600 dark:text-red-400", className)}>
      {children}
    </p>
  );
}
