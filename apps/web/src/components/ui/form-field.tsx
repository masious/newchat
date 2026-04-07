import { Field } from "@base-ui/react/field";
import { cn } from "@/lib/cn";

type FormFieldProps = {
  label: React.ReactNode;
  error?: string | null;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  error,
  description,
  className,
  children,
}: FormFieldProps) {
  return (
    <Field.Root
      className={cn("flex flex-col text-sm", className)}
      invalid={!!error}
    >
      <Field.Label className="text-slate-600 dark:text-slate-400">
        {label}
      </Field.Label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : description ? (
        <Field.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </Field.Description>
      ) : null}
    </Field.Root>
  );
}
