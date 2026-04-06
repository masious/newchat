import { Field } from "@base-ui/react/field";

interface ProfileFieldsProps {
  username: string;
  onUsernameChange: (value: string) => void;
  usernameError: string | null;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
}

export function ProfileFields({
  username,
  onUsernameChange,
  usernameError,
  displayName,
  onDisplayNameChange,
}: ProfileFieldsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Field.Root className="flex flex-col">
        <Field.Label className="text-sm font-semibold text-slate-700 dark:text-slate-400">
          Username
        </Field.Label>
        <Field.Control
          render={
            <input
              type="text"
              required
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="username"
            />
          }
        />
        {usernameError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {usernameError}
          </p>
        ) : (
          <Field.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            3-32 characters, letters, numbers, and underscores.
          </Field.Description>
        )}
      </Field.Root>

      <Field.Root className="flex flex-col">
        <Field.Label className="text-sm font-semibold text-slate-700 dark:text-slate-400">
          Display name
        </Field.Label>
        <Field.Control
          render={
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Alex Example"
            />
          }
        />
        <Field.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          This is what your contacts will see.
        </Field.Description>
      </Field.Root>
    </div>
  );
}
