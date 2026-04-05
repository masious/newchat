"use client";

import { useSSE } from "../hooks/use-sse";

export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useSSE();
  return <>{children}</>;
}
