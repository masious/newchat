"use client";

import { FormEvent, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/providers/auth-context";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";

export function useSettingsForm(open: boolean, onClose: () => void) {
  const { user, refreshUser } = useAuth();
  const utils = trpc.useUtils();

  const initTelegram =
    user?.notificationChannel === "telegram" ||
    user?.notificationChannel === "both";
  const initWeb =
    user?.notificationChannel === "web" ||
    user?.notificationChannel === "both";
  const [enableTelegram, setEnableTelegram] = useState(initTelegram ?? true);
  const [enableWeb, setEnableWeb] = useState(initWeb ?? false);
  const [error, setError] = useState<string | null>(null);

  const pushNotifications = usePushNotifications();

  useEffect(() => {
    if (!open) return;
    setEnableTelegram(
      user?.notificationChannel === "telegram" ||
        user?.notificationChannel === "both",
    );
    setEnableWeb(
      user?.notificationChannel === "web" ||
        user?.notificationChannel === "both",
    );
    setError(null);
  }, [open, user?.notificationChannel]);

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    let channel: "both" | "web" | "telegram" | "none";
    if (enableWeb && enableTelegram) channel = "both";
    else if (enableWeb) channel = "web";
    else if (enableTelegram) channel = "telegram";
    else channel = "none";

    await updateNotificationPrefs.mutateAsync({ channel });

    if (enableWeb) {
      if (pushNotifications.isSupported) {
        try {
          await pushNotifications.requestPermission();
        } catch (err) {
          console.error("Failed to setup push notifications:", err);
        }
      }
    } else {
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

  const isBusy = updateNotificationPrefs.isPending;
  const submitLabel = isBusy ? "Saving..." : "Save changes";

  return {
    enableTelegram,
    setEnableTelegram,
    enableWeb,
    setEnableWeb,
    handleSubmit,
    isBusy,
    error,
    submitLabel,
  };
}
