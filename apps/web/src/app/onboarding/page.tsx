"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { uploadFile } from "@/lib/upload";
import { Check } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const utils = trpc.useUtils();

  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.firstName ?? "");
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatarUrl ?? undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? "");
    setDisplayName(user?.firstName ?? "");
    setIsPublic(user?.isPublic ?? true);
    setAvatarPreview(user?.avatarUrl ?? undefined);
  }, [user]);

  const updateProfile = trpc.users.update.useMutation({
    onSuccess: async () => {
      await refreshUser();
      router.replace("/chat");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setError(err.message ?? "Failed to save profile");
      } else {
        setError("Failed to save profile");
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

  const handleSubmit = async () => {
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

    updateProfile.mutate({
      username,
      displayName,
      avatar: avatarUrl,
      isPublic,
    });
  };

  const isBusy = isUploading || updateProfile.isPending;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <Form
        onFormSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800"
      >
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Onboarding</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Complete your profile</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Choose a username, upload an avatar, and decide if people can find you.
          </p>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="grid gap-6 md:grid-cols-2">
          <Field.Root className="flex flex-col">
            <Field.Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Username
            </Field.Label>
            <Field.Control
              render={
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="username"
                />
              }
            />
            <Field.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Displayed publicly, 3-32 characters.
            </Field.Description>
          </Field.Root>

          <Field.Root className="flex flex-col">
            <Field.Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </Field.Label>
            <Field.Control
              render={
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Avatar</span>
            <div className="mt-2 flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
                )}
              </div>
              <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <Checkbox.Root
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 data-checked:border-indigo-600 data-checked:bg-indigo-600 dark:border-slate-600"
            >
              <Checkbox.Indicator className="text-white">
                <Check className="h-3.5 w-3.5" />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Public profile</span>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                When enabled, other people can find you in search and start conversations.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : updateProfile.isPending ? "Saving..." : "Save and continue"}
          </button>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            Skip for now
          </button>
        </div>
      </Form>
    </main>
  );
}
