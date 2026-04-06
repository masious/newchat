import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import type { NotificationChannel } from "../types";

const radioOptions = [
  {
    value: "both",
    label: "Web & Telegram",
    description:
      "Get notifications via browser and Telegram bot (recommended)",
  },
  {
    value: "web",
    label: "Web only",
    description: "Only receive browser notifications when app is running",
  },
  {
    value: "telegram",
    label: "Telegram only",
    description: "Only receive notifications via Telegram bot",
  },
  {
    value: "none",
    label: "Disable notifications",
    description: "Don't send any notifications",
  },
] as const;

export function NotificationSection({
  value,
  onChange,
}: {
  value: NotificationChannel;
  onChange: (value: NotificationChannel) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Notifications
      </legend>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Choose how you want to receive message notifications
      </p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as NotificationChannel)}
        className="mt-3 grid gap-3"
      >
        {radioOptions.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
          >
            <Radio.Root
              value={option.value}
              className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 data-checked:border-indigo-600 data-checked:bg-indigo-600 dark:border-slate-600"
            >
              <Radio.Indicator className="h-1.5 w-1.5 rounded-full bg-white" />
            </Radio.Root>
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {option.label}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
