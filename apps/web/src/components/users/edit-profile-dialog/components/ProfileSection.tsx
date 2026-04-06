import { ChangeEvent } from "react";
import { Field } from "@base-ui/react/field";
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
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Profile
      </legend>
      <div className="mt-3 flex gap-5">
        <div className="flex shrink-0 flex-col items-center justify-between">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
            {avatarPreview ? (
              <Image
                width={80}
                height={80}
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
          <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </label>
        </div>
        <div className="flex flex-1 flex-col gap-4">
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
      </div>
    </fieldset>
  );
}
