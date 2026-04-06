"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-context";
import { trpc } from "@/lib/trpc";
import { uploadFile } from "@/lib/upload";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";

export function useOnboardingForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const utils = trpc.useUtils();

  // Redirect if already onboarded
  useEffect(() => {
    if (user?.hasCompletedOnboarding) {
      router.replace("/chat");
    }
  }, [user, router]);

  // Profile fields
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.firstName ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user?.avatarUrl ?? undefined,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Notification preference
  const [enableWebNotifications, setEnableWebNotifications] = useState(false);
  const pushNotifications = usePushNotifications();

  // Fetch Telegram avatar on mount (only if user has no existing avatar)
  const telegramAvatarQuery = trpc.users.fetchTelegramAvatar.useQuery(
    undefined,
    {
      enabled: Boolean(user && !user.avatarUrl),
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  // Pre-populate fields when user data loads
  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setDisplayName(user.firstName ?? "");
      setAvatarPreview(user.avatarUrl ?? undefined);
    }
  }, [user]);

  // Set Telegram avatar as default preview when it loads
  useEffect(() => {
    if (telegramAvatarQuery.data?.avatarUrl && !avatarFile && !user?.avatarUrl) {
      setAvatarPreview(telegramAvatarQuery.data.avatarUrl);
    }
  }, [telegramAvatarQuery.data, avatarFile, user?.avatarUrl]);

  const updateProfile = trpc.users.update.useMutation({
    onError: (err) => {
      const msg = err.message ?? "Failed to save profile";
      if (msg.toLowerCase().includes("username")) {
        setUsernameError(msg);
      } else {
        setError(msg);
      }
    },
  });

  const updateNotificationPrefs =
    trpc.users.updateNotificationPreferences.useMutation();

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(user?.avatarUrl ?? telegramAvatarQuery.data?.avatarUrl ?? undefined);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError(null);
    setUsernameError(null);

    // Validate username
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 32) {
      setUsernameError("Username must be between 3 and 32 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    // Validate display name
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setError("Display name is required");
      return;
    }

    // Upload avatar if user selected a new file
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

    // Save profile with completeOnboarding flag
    try {
      await updateProfile.mutateAsync({
        username: trimmedUsername,
        displayName: trimmedDisplayName,
        avatar: avatarUrl,
        completeOnboarding: true,
      });
    } catch {
      // Error handled by onError callback
      return;
    }

    // Handle notification permission (non-blocking)
    if (enableWebNotifications && pushNotifications.isSupported) {
      try {
        const granted = await pushNotifications.requestPermission();
        if (granted) {
          await updateNotificationPrefs.mutateAsync({ channel: "both" });
        }
      } catch {
        // Non-fatal: notification setup failure shouldn't block onboarding
      }
    }

    await refreshUser();
    router.replace("/chat");
  };

  const isBusy = isUploading || updateProfile.isPending;
  const isAvatarLoading = telegramAvatarQuery.isLoading && !user?.avatarUrl;

  return {
    // Profile fields
    username,
    setUsername,
    displayName,
    setDisplayName,
    avatarPreview,
    isAvatarLoading,
    handleAvatarChange,

    // Errors
    error,
    usernameError,
    setUsernameError,

    // Notifications
    enableWebNotifications,
    setEnableWebNotifications,
    isNotificationsSupported: pushNotifications.isSupported,

    // Form
    handleSubmit,
    isBusy,
    isUploading,
    isProfileSaving: updateProfile.isPending,
  };
}
