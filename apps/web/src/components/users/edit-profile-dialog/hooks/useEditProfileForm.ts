"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/providers/auth-context";
import { uploadFile } from "@/lib/upload";

export function useEditProfileForm(open: boolean, onClose: () => void) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.firstName ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user?.avatarUrl ?? undefined,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsername(user?.username ?? "");
    setDisplayName(user?.firstName ?? "");
    setAvatarPreview(user?.avatarUrl ?? undefined);
    setAvatarFile(null);
    setUsernameError(null);
    setError(null);
    setIsUploading(false);
  }, [open, user?.avatarUrl, user?.firstName, user?.username]);

  const updateProfile = trpc.users.update.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate();
    },
    onError: (err) => {
      const msg = err.message ?? "Failed to update profile";
      if (msg.toLowerCase().includes("username")) {
        setUsernameError(msg);
      } else {
        setError(msg);
      }
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setUsernameError(null);

    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      setUsernameError("Username must be between 3 and 32 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

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

    await updateProfile.mutateAsync({
      username,
      displayName,
      avatar: avatarUrl,
    });

    onClose();
  };

  const isBusy = isUploading || updateProfile.isPending;

  const submitLabel = isUploading
    ? "Uploading..."
    : updateProfile.isPending
      ? "Saving..."
      : "Save changes";

  return {
    username,
    setUsername,
    displayName,
    setDisplayName,
    avatarPreview,
    handleAvatarChange,
    handleSubmit,
    isBusy,
    error,
    usernameError,
    clearUsernameError: () => setUsernameError(null),
    submitLabel,
  };
}
