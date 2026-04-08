"use client";

import { Suspense } from "react";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { DeepLinkCard } from "./components/DeepLinkCard";
import { StatusBanner } from "./components/StatusBanner";
import { ExchangeError } from "./components/ExchangeError";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const flow = useAuthFlow();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">
            Telegram Login
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Sign in to Kite
          </h1>
          <p className="mt-2 text-slate-500">
            We&apos;ll open Telegram so you can confirm this login. This window
            will keep checking for your confirmation automatically.
          </p>
        </div>

        {flow.error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {flow.error}
          </div>
        )}

        <div className="space-y-4">
          <DeepLinkCard
            telegramLink={flow.telegramLink}
            isExpired={flow.pollStatus === "expired"}
            copied={flow.copied}
            onOpen={flow.handleOpen}
            onCopy={flow.handleCopy}
          />
          <StatusBanner status={flow.pollStatus} />
        </div>

        {flow.exchangeError && (
          <ExchangeError
            isPending={flow.isExchangePending}
            onRetry={flow.handleRetryExchange}
          />
        )}

        {flow.pollStatus === "expired" && (
          <div className="mt-6 text-center">
            <button
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={flow.handleRegenerate}
            >
              Generate new link
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
