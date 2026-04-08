"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Radio,
  Zap,
  Server,
  ShieldCheck,
  Layers,
  ExternalLink,
  FileText,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTilt } from "@/lib/hooks";
import { SectionLabel } from "@/components/ui/section-label";

const HIGHLIGHTS = [
  { icon: Radio, text: "Real-time messaging via SSE and Redis pub/sub" },
  {
    icon: Zap,
    text: "Optimistic UI — updates appear instantly, sync in background",
  },
  {
    icon: Server,
    text: "Stateless API layer (Hono + tRPC) — scales horizontally",
  },
  { icon: ShieldCheck, text: "Telegram-based auth with JWT access control" },
  { icon: Layers, text: "Next.js, Neon Postgres, Redis, Cloudflare R2" },
] as const;

const LINKS = [
  {
    icon: ExternalLink,
    label: "GitHub",
    href: "https://github.com/masious/newchat",
  },
  {
    icon: FileText,
    label: "README",
    href: "https://github.com/masious/newchat#readme",
  },
  {
    icon: BookOpen,
    label: "Architecture",
    href: "https://github.com/masious/newchat/tree/main/docs#readme",
  },
] as const;

export default function LandingPage() {
  const { ref, style, isHovered } = useTilt({ maxTilt: 8 });

  return (
    <main className="flex min-h-dvh flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Kite
        </span>
        <Link
          href="/auth"
          className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500"
        >
          Open App
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-12 px-6 py-12 lg:flex-row lg:items-start lg:gap-16 lg:py-20">
        {/* Left — text content */}
        <div className="flex max-w-lg flex-1 flex-col">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kite
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Real-time messaging, built for the details that matter.
          </p>

          {/* Architecture highlights */}
          <div className="mt-8">
            <SectionLabel as="h2">Built for performance</SectionLabel>
            <ul className="mt-3 space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why this exists */}
          <div className="mt-8">
            <SectionLabel as="h2">Why this exists</SectionLabel>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Most chat demos skip the hard parts&mdash;consistency under
              concurrent writes, graceful reconnection, delivery guarantees,
              presence that actually expires. Kite is a focused exercise in
              building those things properly: real infrastructure, real
              trade-offs, no shortcuts.
            </p>
          </div>

          {/* Links */}
          <div className="mt-8 flex flex-wrap gap-3">
            {LINKS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Right — screenshot with tilt */}
        <div className="flex w-full max-w-md flex-1 items-start justify-center lg:pt-6">
          <Link href="/auth" className="group block w-full">
            <div
              ref={ref}
              style={style}
              className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <Image
                src="/screenshot.png"
                alt="Kite app screenshot"
                fill
                className="object-cover"
              />

              {/* Hover overlay */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-2xl bg-indigo-600/60 transition-opacity duration-300",
                  isHovered ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  Sign in to Kite
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Built with Next.js, Hono, tRPC, Postgres, Redis, and Cloudflare R2
      </footer>
    </main>
  );
}
