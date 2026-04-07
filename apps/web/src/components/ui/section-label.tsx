import { cn } from "@/lib/cn";

type SectionLabelProps<T extends React.ElementType = "span"> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function SectionLabel<T extends React.ElementType = "span">({
  as,
  className,
  children,
  ...props
}: SectionLabelProps<T>) {
  const Component = as ?? "span";
  return (
    <Component
      className={cn(
        "text-xs font-semibold uppercase text-slate-500 dark:text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
