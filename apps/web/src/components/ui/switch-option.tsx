import { Switch } from "@base-ui/react/switch";

type SwitchOptionProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
};

export function SwitchOption({
  checked,
  onCheckedChange,
  icon,
  label,
  description,
}: SwitchOptionProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-checked:bg-indigo-600 dark:bg-slate-600 data-checked:dark:bg-indigo-600"
      >
        <Switch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
      </Switch.Root>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 dark:text-slate-400">{icon}</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {label}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
