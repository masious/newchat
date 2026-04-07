import { Field } from "@base-ui/react/field";
import { TextInput } from "@/components/ui/text-input";

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
            <TextInput
              type="text"
              required
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="mt-1"
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
            <TextInput
              type="text"
              required
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              className="mt-1"
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
