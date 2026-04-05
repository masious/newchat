"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { trpc } from "@/lib/trpc";
import type { SearchUser } from "@/lib/trpc-types";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function useUserSearch() {
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isPending, startTransition] = useTransition();

  const utils = trpc.useUtils();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();

      const trimmed = query.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setResults([]);
        return;
      }

      timerRef.current = setTimeout(() => {
        const controller = new AbortController();
        abortRef.current = controller;

        startTransition(async () => {
          try {
            const data = await utils.users.search.fetch({
              query: trimmed,
              limit: 10,
            });
            if (!controller.signal.aborted) {
              setResults(data.users);
            }
          } catch {
            // Aborted or network error — silently ignore
          }
        });
      }, DEBOUNCE_MS);
    },
    [utils, startTransition],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
  }, []);

  return { results, isPending, search, reset };
}
