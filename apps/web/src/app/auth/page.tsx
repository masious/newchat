"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "newchatauthbot";

type TokenInfo = { token: string; expiresAt: string } | null;

type PollStatus = "idle" | "pending" | "confirmed" | "expired";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(null);
  const [pollStatus, setPollStatus] = useState<PollStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createToken = trpc.auth.createToken.useMutation({
    onSuccess: (data: { token: string; expiresAt: string }) => {
      setTokenInfo(data);
      setPollStatus("pending");
      setError(null);
    },
    onError: () => {
      setError("Failed to create a login link. Please try again.");
    },
  });
  const pollToken = trpc.auth.pollToken.useQuery(
    { token: tokenInfo?.token ?? "" },
    { enabled: false, retry: false },
  );
  const exchangeToken = trpc.auth.exchange.useMutation();

  const telegramLink = useMemo(() => {
    if (!tokenInfo) return null;
    return `https://t.me/${BOT_USERNAME}?start=${tokenInfo.token}`;
  }, [tokenInfo]);

  useEffect(() => {
    createToken.mutate();
  }, []);

  useEffect(() => {
    if (!tokenInfo || pollStatus !== "pending") return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const result = await pollToken.refetch();
        if (!active) return;
        const status = result.data?.status;
        if (!status) {
          return;
        }
        setPollStatus(status);
        if (status === "confirmed") {
          const exchanged = await exchangeToken.mutateAsync({ token: tokenInfo.token });
          login(exchanged.token);
          const next = searchParams.get("next");
          router.replace(next ?? "/onboarding");
        } else if (status === "expired") {
          clearInterval(interval);
        }
      } catch (pollError) {
        console.error(pollError);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [tokenInfo, pollStatus, pollToken, exchangeToken, login, router, searchParams]);

  const handleCopy = async () => {
    if (!telegramLink) return;
    await navigator.clipboard.writeText(telegramLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setTokenInfo(null);
    setPollStatus("idle");
    createToken.mutate();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Telegram Login</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in to NewChat</h1>
          <p className="mt-2 text-slate-500">
            We&apos;ll open Telegram so you can confirm this login. This window will
            keep checking for your confirmation automatically.
          </p>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase text-slate-500">Deep link</p>
            <p className="truncate text-base font-mono text-slate-900">
              {telegramLink ?? "Generating link..."}
            </p>
            <div className="mt-3 flex gap-3">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => telegramLink && window.open(telegramLink, "_blank")}
                disabled={!telegramLink || pollStatus === "expired"}
              >
                Open in Telegram
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                onClick={handleCopy}
                disabled={!telegramLink}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            <p className="font-semibold">Status: {pollStatus}</p>
            <p className="text-indigo-700">
              {pollStatus === "pending" && "Waiting for confirmation in Telegram..."}
              {pollStatus === "confirmed" && "Confirmed! Finalizing sign-in..."}
              {pollStatus === "expired" && "Link expired. Generate a new one below."}
              {pollStatus === "idle" && "Preparing login link..."}
            </p>
          </div>
        </div>

        {pollStatus === "expired" && (
          <div className="mt-6 text-center">
            <button
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleRegenerate}
            >
              Generate new link
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
