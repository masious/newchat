"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ScrollArea } from "@base-ui/react";
import { useAuth } from "@/lib/providers/auth-context";
import { userDisplayName } from "@/lib/formatting";
import { useEditProfileForm } from "./hooks/useEditProfileForm";
import { ProfileSection } from "./components/ProfileSection";
import { SettingsSection } from "./components/SettingsSection";
import { NotificationSection } from "./components/NotificationSection";
import { DialogFooter } from "./components/DialogFooter";

export function EditProfileDialog({
  open,
  onClose,
  isDark,
  onToggleDarkMode,
  muted,
  onToggleMute,
}: {
  open: boolean;
  onClose: () => void;
  isDark?: boolean;
  onToggleDarkMode?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
}) {
  const { user } = useAuth();
  const form = useEditProfileForm(open, onClose);

  if (!user) return null;

  const displayNameLabel = userDisplayName(user);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/30" />
        <Dialog.Viewport className="fixed inset-0 flex items-center justify-center px-4">
          <ScrollArea.Root
            style={{ position: undefined }}
            className="box-border h-full overscroll-contain in-data-ending-style:pointer-events-none"
          >
            <ScrollArea.Viewport className="box-border h-full overscroll-contain in-data-ending-style:pointer-events-none">
              <ScrollArea.Content className="flex min-h-full items-center justify-center">
                <Dialog.Popup className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <form onSubmit={form.handleSubmit}>
                    <div className="flex items-start justify-between">
                      <div>
                        <Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                          Settings
                        </Dialog.Description>
                        <Dialog.Title className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          Edit your profile
                        </Dialog.Title>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {displayNameLabel}
                        </p>
                      </div>
                      <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        Close
                      </Dialog.Close>
                    </div>

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

                    <SettingsSection
                      isPublic={form.isPublic}
                      onIsPublicChange={form.setIsPublic}
                      isDark={isDark}
                      onToggleDarkMode={onToggleDarkMode}
                      muted={muted}
                      onToggleMute={onToggleMute}
                    />

                    <NotificationSection
                      value={form.notificationChannel}
                      onChange={form.setNotificationChannel}
                    />

                    <DialogFooter
                      isBusy={form.isBusy}
                      submitLabel={form.submitLabel}
                    />
                  </form>
                </Dialog.Popup>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
