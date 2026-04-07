import { ChangeEvent } from "react";
import { Field } from "@base-ui/react/field";
import { Camera } from "lucide-react";
import Image from "next/image";

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
          <div className="h-30 w-30 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
            {avatarPreview ? (
              <Image
                width={120}
                height={120}
                src={avatarPreview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-400">
                No image
              </div>
            )}
          </div>
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
        <Field.Root className="flex flex-col text-sm">
          <Field.Label className="text-slate-600 dark:text-slate-400">
            Display name
          </Field.Label>
          <Field.Control
            render={
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            }
          />
        </Field.Root>
        <Field.Root
          className="flex flex-col text-sm"
          invalid={!!usernameError}
        >
          <Field.Label className="text-slate-600 dark:text-slate-400">
            Username
          </Field.Label>
          <Field.Control
            render={
              <input
                type="text"
                required
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 aria-invalid:border-red-500"
              />
            }
          />
          {usernameError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {usernameError}
            </p>
          )}
        </Field.Root>
      </div>
    </fieldset>
  );
}
