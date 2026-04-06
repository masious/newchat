import { Switch } from "@base-ui/react/switch";
import { Sun, Moon, VolumeX, Volume2 } from "lucide-react";

export function SettingsSection({
  isPublic,
  onIsPublicChange,
  isDark,
  onToggleDarkMode,
  muted,
  onToggleMute,
}: {
  isPublic: boolean;
  onIsPublicChange: (value: boolean) => void;
  isDark?: boolean;
  onToggleDarkMode?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Settings
      </legend>
      <div className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <Switch.Root
          checked={isPublic}
          onCheckedChange={onIsPublicChange}
          className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-checked:bg-indigo-600 dark:bg-slate-600 data-checked:dark:bg-indigo-600"
        >
          <Switch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
        </Switch.Root>
        <div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Public profile
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Allow other people to find and message you.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isDark ? "Light mode" : "Dark mode"}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch to {isDark ? "light" : "dark"} theme
              </p>
            </div>
          </button>
        )}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {muted ? "Sounds off" : "Sounds on"}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {muted
                  ? "Enable notification sounds"
                  : "Mute notification sounds"}
              </p>
            </div>
          </button>
        )}
      </div>
    </fieldset>
  );
}
