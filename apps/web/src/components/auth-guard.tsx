"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-context";

const PUBLIC_ROUTES = ["/", "/auth"];
const ONBOARDING_ROUTE = "/onboarding";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}

function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isOnboarding = pathname === ONBOARDING_ROUTE;

  // If on auth page and already authenticated, go to chat
  useEffect(() => {
    if (pathname === "/auth" && status === "authenticated") {
      const next = searchParams.get("next") ?? "/chat";
      router.replace(next);
    }
  }, [pathname, router, searchParams, status]);

  // If on a protected page and not authenticated, redirect to auth
  useEffect(() => {
    if (!isPublicRoute && status === "unauthenticated") {
      const next = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [isPublicRoute, pathname, router, searchParams, status]);

  // Authenticated but not onboarded → redirect to /onboarding
  useEffect(() => {
    if (
      status === "authenticated" &&
      user &&
      !user.hasCompletedOnboarding &&
      !isOnboarding &&
      !isPublicRoute
    ) {
      router.replace(ONBOARDING_ROUTE);
    }
  }, [status, user, isOnboarding, isPublicRoute, router]);

  // Already onboarded but visiting /onboarding → redirect to /chat
  useEffect(() => {
    if (status === "authenticated" && user?.hasCompletedOnboarding && isOnboarding) {
      router.replace("/chat");
    }
  }, [status, user, isOnboarding, router]);

  if (!isPublicRoute && status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        Checking your session…
      </main>
    );
  }

  return <>{children}</>;
}
