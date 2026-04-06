import { ChangeEvent } from "react";
import { Loader2 } from "lucide-react";

interface AvatarPickerProps {
  avatarPreview: string | undefined;
  isLoading: boolean;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function AvatarPicker({
  avatarPreview,
  isLoading,
  onAvatarChange,
}: AvatarPickerProps) {
  return (
    <div className="mt-6">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-400">
        Avatar
      </span>
      <div className="mt-2 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              No image
            </div>
          )}
        </div>
        <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </label>
      </div>
    </div>
  );
}
