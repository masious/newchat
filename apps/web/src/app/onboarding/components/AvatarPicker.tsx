import { ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

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
        <Avatar
          avatarUrl={avatarPreview ?? null}
          name="Avatar"
          size="lg"
          fallback={
            isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              "No image"
            )
          }
          className="border border-slate-200 dark:border-slate-600"
        />
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
