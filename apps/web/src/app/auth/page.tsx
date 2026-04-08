"use client";

import { Suspense } from "react";
import { Send } from "lucide-react";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { DeepLinkCard } from "./components/DeepLinkCard";
import { StatusBanner } from "./components/StatusBanner";
import { ExchangeError } from "./components/ExchangeError";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

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
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
            <Send className="h-5 w-5 text-white" />
          </div>
          <SectionLabel className="mt-4">Telegram Login</SectionLabel>
          <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            Sign in to Kite
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            We&apos;ll open Telegram so you can confirm this login. This window
            will keep checking for your confirmation automatically.
          </p>
        </div>

        {flow.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {flow.error}
          </div>
        )}

        <div className="mt-6 space-y-4">
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
            <Button onClick={flow.handleRegenerate}>
              Generate new link
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
