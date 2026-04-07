import { ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TextInput } from "@/components/ui/text-input";
import { FormField } from "@/components/ui/form-field";

export function ProfileSection({
  avatarPreview,
  onAvatarChange,
  displayName,
  onDisplayNameChange,
  username,
  onUsernameChange,
  usernameError,
}: {
  avatarPreview: string | undefined;
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  username: string;
  onUsernameChange: (value: string) => void;
  usernameError: string | null;
}) {
  return (
    <fieldset className="mt-6">
      <div className="flex flex-col items-center">
        <label className="group relative cursor-pointer">
          <Avatar
            avatarUrl={avatarPreview ?? null}
            name="Avatar"
            size="2xl"
            fallback="No image"
            className="border border-slate-200 dark:border-slate-600"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Click to change photo
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <FormField label="Display name">
          <TextInput
            type="text"
            required
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
        </FormField>
        <FormField label="Username" error={usernameError}>
          <TextInput
            type="text"
            required
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
        </FormField>
      </div>
    </fieldset>
  );
}
