"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const MESSAGES = [
  "hey there.",
  "i'm masoud.",
  "a full-stack engineer who got here by leading frontend teams — and realizing i wanted to build the whole thing, not just the UI.",
  "this app you're looking at? i built it end to end. real-time messaging, telegram-based auth, file sharing, presence — the works.",
  "next.js, react, hono, trpc, postgres, redis, cloudflare r2 — pick a layer, i've been deep in it.",
  "i don't just ship features. i think about architecture, developer experience, and the kind of code that doesn't fall apart at scale.",
  "anyway — feel free to look around. or reach out. i like building things that matter.",
];

const DELAY_BETWEEN_MESSAGES = 1400;
const TYPING_DURATION = 600;

export default function LandingPage() {
  const [visibleMessages, setVisibleMessages] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const showNext = useCallback(() => {
    if (indexRef.current >= MESSAGES.length) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    timeoutRef.current = setTimeout(() => {
      const msg = MESSAGES[indexRef.current];
      indexRef.current++;
      setIsTyping(false);
      setVisibleMessages((prev) => [...prev, msg]);

      timeoutRef.current = setTimeout(showNext, DELAY_BETWEEN_MESSAGES);
    }, TYPING_DURATION);
  }, []);

  // Start sequence on mount
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    timeoutRef.current = setTimeout(showNext, 600);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showNext]);

  // Restart on tab focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && indexRef.current >= MESSAGES.length) {
        indexRef.current = 0;
        setVisibleMessages([]);
        setIsTyping(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(showNext, 600);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [showNext]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isTyping]);

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-white">newchat</span>
        <Link
          href="/chat"
          className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Open App
        </Link>
      </header>

      {/* Chat area */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8">
        <div className="flex flex-1 flex-col justify-end gap-3 py-8">
          {visibleMessages.map((msg, i) => (
            <div
              key={i}
              className="animate-fade-in-up max-w-[85%] rounded-2xl rounded-bl-md bg-indigo-600 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-lg"
            >
              {msg}
            </div>
          ))}

          {isTyping && (
            <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-bl-md bg-slate-800 px-4 py-3">
              <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
              <span className="typing-dot animation-delay-200 h-2 w-2 rounded-full bg-slate-400" />
              <span className="typing-dot animation-delay-400 h-2 w-2 rounded-full bg-slate-400" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-500">
        built with next.js, hono, trpc, postgres, redis & a lot of coffee
      </footer>
    </main>
  );
}
