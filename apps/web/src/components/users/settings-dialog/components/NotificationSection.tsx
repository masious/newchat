import { Switch } from "@base-ui/react/switch";
import { Bell, Send } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";

export function NotificationSection({
  telegramEnabled,
  onTelegramToggle,
  webEnabled,
  onWebToggle,
}: {
  telegramEnabled: boolean;
  onTelegramToggle: (value: boolean) => void;
  webEnabled: boolean;
  onWebToggle: (value: boolean) => void;
}) {
  return (
    <fieldset className="mt-6">
      <SectionLabel as="legend">
        Notifications
      </SectionLabel>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Choose how you want to receive message notifications
      </p>
      <div className="mt-3 space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <Switch.Root
            checked={telegramEnabled}
            onCheckedChange={onTelegramToggle}
            className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-checked:bg-indigo-600 dark:bg-slate-600 data-checked:dark:bg-indigo-600"
          >
            <Switch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
          </Switch.Root>
          <div>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Telegram notifications
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receive notifications via the Telegram bot
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <Switch.Root
            checked={webEnabled}
            onCheckedChange={onWebToggle}
            className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-checked:bg-indigo-600 dark:bg-slate-600 data-checked:dark:bg-indigo-600"
          >
            <Switch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
          </Switch.Root>
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Browser notifications
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get notified about new messages even when the tab is in the
              background
            </p>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
