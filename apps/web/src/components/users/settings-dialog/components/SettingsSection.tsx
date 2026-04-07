import { Sun, Moon, VolumeX, Volume2 } from "lucide-react";

export function SettingsSection({
  isDark,
  onToggleDarkMode,
  muted,
  onToggleMute,
}: {
  isDark?: boolean;
  onToggleDarkMode?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Appearance
      </legend>
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
