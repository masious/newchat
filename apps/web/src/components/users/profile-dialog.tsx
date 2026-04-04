"use client";

import { ChangeEvent, SubmitEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Field } from "@base-ui/react/field";
import { Sun, Moon, VolumeX, Volume2 } from "lucide-react";
import type { SearchUser, ProfileUser, PresenceSummary } from "@/lib/trpc-types";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { uploadFile } from "@/lib/upload";
import { formatPresence, userDisplayName } from "@/lib/formatting";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import Image from "next/image";
import { Button, ScrollArea } from "@base-ui/react";

type DisplayUser = (SearchUser | ProfileUser) & {
  presence?: PresenceSummary;
};

export function ProfileDialog({
  userId,
  initialUser,
  open,
  onClose,
}: {
  userId: number | null;
  initialUser?: SearchUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const profileQuery = trpc.users.profile.useQuery(
    { userId: userId ?? 0 },
    { enabled: Boolean(open && userId), staleTime: 0, retry: false },
  );
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: async (data) => {
      await utils.conversations.list.invalidate();
      onClose();
      router.replace(`/chat?conversationId=${data.conversation.id}`);
    },
  });

  const user: DisplayUser | null =
    profileQuery.data?.user ?? initialUser ?? null;

  const displayName = useMemo(() => userDisplayName(user), [user]);

  const presenceText = formatPresence(user?.presence);
  const errorMessage = profileQuery.error?.message;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-60 bg-black/30" />
        <Dialog.Viewport className="fixed inset-0 z-70 flex items-center justify-center px-4 py-8">
          <Dialog.Popup className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  User Profile
                </Dialog.Description>
                <Dialog.Title className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {displayName}
                </Dialog.Title>
                {user?.username && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    @{user.username}
                  </p>
                )}
              </div>
              <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Close
              </Dialog.Close>
            </div>

            {!user && profileQuery.isLoading && (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                Loading profile…
              </p>
            )}
            {!user && errorMessage && (
              <p className="mt-6 text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}

            {user && (
              <div className="mt-6 flex gap-6">
                <div className="h-24 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-400">
                      {user.firstName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Presence
                    </p>
                    <p>{presenceText}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      About
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {user.isPublic
                        ? "This user is discoverable."
                        : "Private profile"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
                Cancel
              </Dialog.Close>
              <button
                onClick={() =>
                  user &&
                  createConversation.mutate({
                    type: "dm",
                    memberUserIds: [user.id],
                  })
                }
                disabled={!user || createConversation.isPending}
                className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {createConversation.isPending ? "Inviting…" : "Send message"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const radioOptions = [
  {
    value: "both",
    label: "Web & Telegram",
    description: "Get notifications via browser and Telegram bot (recommended)",
  },
  {
    value: "web",
    label: "Web only",
    description: "Only receive browser notifications when app is running",
  },
  {
    value: "telegram",
    label: "Telegram only",
    description: "Only receive notifications via Telegram bot",
  },
  {
    value: "none",
    label: "Disable notifications",
    description: "Don't send any notifications",
  },
] as const;

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
  const { user, refreshUser } = useAuth();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.firstName ?? "");
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);
  const [notificationChannel, setNotificationChannel] = useState<
    "web" | "telegram" | "both" | "none"
  >(user?.notificationChannel ?? "both");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user?.avatarUrl ?? undefined,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pushNotifications = usePushNotifications();

  useEffect(() => {
    if (!open) return;
    setUsername(user?.username ?? "");
    setDisplayName(user?.firstName ?? "");
    setIsPublic(user?.isPublic ?? true);
    setNotificationChannel(user?.notificationChannel ?? "both");
    setAvatarPreview(user?.avatarUrl ?? undefined);
    setAvatarFile(null);
    setError(null);
    setIsUploading(false);
  }, [
    open,
    user?.avatarUrl,
    user?.firstName,
    user?.isPublic,
    user?.notificationChannel,
    user?.username,
  ]);

  const updateProfile = trpc.users.update.useMutation({
    onSuccess: async () => {
      await refreshUser();
      await utils.users.me.invalidate();
    },
    onError: (err) => {
      setError(err.message ?? "Failed to update profile");
    },
  });

  const updateNotificationPrefs =
    trpc.users.updateNotificationPreferences.useMutation({
      onSuccess: async () => {
        await refreshUser();
        await utils.users.me.invalidate();
      },
      onError: (err) => {
        setError(err.message ?? "Failed to update notification preferences");
      },
    });

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(user?.avatarUrl ?? undefined);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    let avatarUrl = avatarPreview;
    if (avatarFile) {
      try {
        setIsUploading(true);
        const uploaded = await uploadFile(avatarFile, utils);
        avatarUrl = uploaded.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Avatar upload failed");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Update profile
    await updateProfile.mutateAsync({
      username,
      displayName,
      avatar: avatarUrl,
      isPublic,
    });

    // Update notification preferences
    await updateNotificationPrefs.mutateAsync({
      channel: notificationChannel,
    });

    // Handle web push subscription
    if (notificationChannel === "web" || notificationChannel === "both") {
      if (pushNotifications.isSupported) {
        try {
          await pushNotifications.requestPermission();
        } catch (err) {
          console.error("Failed to setup push notifications:", err);
        }
      }
    } else if (
      notificationChannel === "telegram" ||
      notificationChannel === "none"
    ) {
      if (pushNotifications.isSubscribed) {
        try {
          await pushNotifications.unsubscribe();
        } catch (err) {
          console.error("Failed to unsubscribe from push:", err);
        }
      }
    }

    onClose();
  };

  if (!user) return null;

  const isBusy = isUploading || updateProfile.isPending;
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
              <ScrollArea.Content className="flex items-center justify-center min-h-full">
                <Dialog.Popup
                  className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
                >
                  <form onSubmit={handleSubmit}>
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

                  {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {/* ── Profile ── */}
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
                        <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
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
                                onChange={(event) =>
                                  setDisplayName(event.target.value)
                                }
                                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              />
                            }
                          />
                        </Field.Root>
                        <Field.Root className="flex flex-col text-sm">
                          <Field.Label className="text-slate-600 dark:text-slate-400">
                            Username
                          </Field.Label>
                          <Field.Control
                            render={
                              <input
                                type="text"
                                required
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              />
                            }
                          />
                        </Field.Root>
                      </div>
                    </div>
                  </fieldset>

                  {/* ── Settings ── */}
                  <fieldset className="mt-6">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Settings
                    </legend>
                    <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <Switch.Root
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                        className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-checked:bg-indigo-600 dark:bg-slate-600 data-checked:dark:bg-indigo-600"
                      >
                        <Switch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5" />
                      </Switch.Root>
                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Public profile
                        </span>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Allow other people to find and message you.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {onToggleDarkMode && (
                        <button
                          type="button"
                          onClick={onToggleDarkMode}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {isDark ? "Light mode" : "Dark mode"}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Switch to {isDark ? "light" : "dark"} theme
                            </p>
                          </div>
                        </button>
                      )}
                      {onToggleMute && (
                        <button
                          type="button"
                          onClick={onToggleMute}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {muted ? "Sounds off" : "Sounds on"}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {muted ? "Enable notification sounds" : "Mute notification sounds"}
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  </fieldset>

                  {/* ── Notifications ── */}
                  <fieldset className="mt-6">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Notifications
                    </legend>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Choose how you want to receive message notifications
                    </p>
                    <RadioGroup
                      value={notificationChannel}
                      onValueChange={(value) =>
                        setNotificationChannel(
                          value as "web" | "telegram" | "both" | "none",
                        )
                      }
                      className="mt-3 grid gap-3"
                    >
                      {radioOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                        >
                          <Radio.Root
                            value={option.value}
                            className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 data-checked:border-indigo-600 data-checked:bg-indigo-600 dark:border-slate-600"
                          >
                            <Radio.Indicator className="h-1.5 w-1.5 rounded-full bg-white" />
                          </Radio.Root>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {option.label}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {option.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>

                  <div className="mt-8 flex justify-end gap-3">
                    <Dialog.Close className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
                      Cancel
                    </Dialog.Close>
                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isUploading
                        ? "Uploading..."
                        : updateProfile.isPending
                          ? "Saving..."
                          : "Save changes"}
                    </Button>
                  </div>
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
