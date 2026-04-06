"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/providers/auth-context";

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "newchatauthbot";

type TokenInfo = { token: string; expiresAt: string } | null;

export type PollStatus = "idle" | "pending" | "confirmed" | "expired";

export function useAuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(null);
  const [pollStatus, setPollStatus] = useState<PollStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exchangeError, setExchangeError] = useState(false);

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

  const initiated = useRef(false);
  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;
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
          try {
            const exchanged = await exchangeToken.mutateAsync({
              token: tokenInfo.token,
            });
            login(exchanged.token);
            const next = searchParams.get("next");
            router.replace(next ?? "/chat");
          } catch (exchangeErr) {
            console.error("Token exchange failed:", exchangeErr);
            setExchangeError(true);
            clearInterval(interval);
          }
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

  const handleRetryExchange = async () => {
    if (!tokenInfo) return;
    setExchangeError(false);
    try {
      const exchanged = await exchangeToken.mutateAsync({
        token: tokenInfo.token,
      });
      login(exchanged.token);
      const next = searchParams.get("next");
      router.replace(next ?? "/chat");
    } catch (err) {
      console.error("Token exchange retry failed:", err);
      setExchangeError(true);
    }
  };

  const handleRegenerate = () => {
    setTokenInfo(null);
    setPollStatus("idle");
    createToken.mutate();
  };

  return {
    telegramLink,
    pollStatus,
    error,
    copied,
    exchangeError,
    isExchangePending: exchangeToken.isPending,
    handleCopy,
    handleRetryExchange,
    handleRegenerate,
    handleOpen: () => telegramLink && window.open(telegramLink, "_blank"),
  };
}
