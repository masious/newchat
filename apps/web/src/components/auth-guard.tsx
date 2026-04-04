"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const PUBLIC_ROUTES = ["/", "/auth"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}

function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (pathname === "/auth" && status === "authenticated") {
      const next = searchParams.get("next") ?? "/chat";
      router.replace(next);
    }
  }, [pathname, router, searchParams, status]);

  useEffect(() => {
    if (!isPublic && status === "unauthenticated") {
      const next = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [isPublic, pathname, router, searchParams, status]);

  if (!isPublic && status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        Checking your session…
      </main>
    );
  }

  return <>{children}</>;
}
