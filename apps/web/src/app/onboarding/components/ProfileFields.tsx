import { TextInput } from "@/components/ui/text-input";
import { FormField } from "@/components/ui/form-field";

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
      <FormField
        label="Username"
        error={usernameError}
        description="3-32 characters, letters, numbers, and underscores."
      >
        <TextInput
          type="text"
          required
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="username"
        />
      </FormField>

      <FormField
        label="Display name"
        description="This is what your contacts will see."
      >
        <TextInput
          type="text"
          required
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Alex Example"
        />
      </FormField>
    </div>
  );
}
