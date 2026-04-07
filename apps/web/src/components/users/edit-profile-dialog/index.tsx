"use client";

import { useAuth } from "@/lib/providers/auth-context";
import { BaseDialog } from "@/components/ui/base-dialog";
import { userDisplayName } from "@/lib/formatting";
import { useEditProfileForm } from "./hooks/useEditProfileForm";
import { ProfileSection } from "./components/ProfileSection";
import { DialogFooter } from "./components/DialogFooter";

export function EditProfileDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const form = useEditProfileForm(open, onClose);

  if (!user) return null;

  const displayNameLabel = userDisplayName(user);

  return (
    <BaseDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="Edit your profile"
      subtitle={displayNameLabel}
      size="md"
    >
      <form onSubmit={form.handleSubmit}>
        {form.error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {form.error}
          </div>
        )}

        <ProfileSection
          avatarPreview={form.avatarPreview}
          onAvatarChange={form.handleAvatarChange}
          displayName={form.displayName}
          onDisplayNameChange={form.setDisplayName}
          username={form.username}
          onUsernameChange={(value) => {
            form.setUsername(value);
            form.clearUsernameError();
          }}
          usernameError={form.usernameError}
        />

        <DialogFooter
          isBusy={form.isBusy}
          submitLabel={form.submitLabel}
        />
      </form>
    </BaseDialog>
  );
}
