import { Separator } from "@base-ui/react/separator";

export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <Separator className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <Separator className="flex-1 border-t border-slate-200 dark:border-slate-700" />
    </div>
  );
}
