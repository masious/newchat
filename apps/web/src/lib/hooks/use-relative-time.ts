"use client";

import { useEffect, useState } from "react";

/**
 * Returns a counter that increments every `intervalMs` to trigger
 * re-renders so relative times stay fresh.
 */
export function useTimeTick(intervalMs = 60_000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((prev) => prev + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
