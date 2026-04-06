"use client";

import { Form } from "@base-ui/react/form";
import { useOnboardingForm } from "./hooks/useOnboardingForm";
import { ProfileFields } from "./components/ProfileFields";
import { AvatarPicker } from "./components/AvatarPicker";
import { NotificationToggle } from "./components/NotificationToggle";

export default function OnboardingPage() {
  const form = useOnboardingForm();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <Form
        onFormSubmit={form.handleSubmit}
        className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800"
      >
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
            Onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Complete your profile
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Choose a username, upload an avatar, and set up notifications.
          </p>
        </div>

        {form.error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {form.error}
          </div>
        )}

        <ProfileFields
          username={form.username}
          onUsernameChange={(value) => {
            form.setUsername(value);
            form.setUsernameError(null);
          }}
          usernameError={form.usernameError}
          displayName={form.displayName}
          onDisplayNameChange={form.setDisplayName}
        />

        <AvatarPicker
          avatarPreview={form.avatarPreview}
          isLoading={form.isAvatarLoading}
          onAvatarChange={form.handleAvatarChange}
        />

        {form.isNotificationsSupported && (
          <NotificationToggle
            enabled={form.enableWebNotifications}
            onToggle={form.setEnableWebNotifications}
          />
        )}

        <div className="mt-8">
          <button
            type="submit"
            disabled={form.isBusy}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {form.isUploading
              ? "Uploading..."
              : form.isProfileSaving
                ? "Saving..."
                : "Complete setup"}
          </button>
        </div>
      </Form>
    </main>
  );
}
