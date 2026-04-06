"use client";

import {
  createElement,
  Fragment,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ReactNode } from "react";
import type { Combobox } from "@base-ui/react/combobox";
import { trpc } from "@/lib/trpc";
import type { SearchUser } from "@/lib/trpc-types";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function useComboboxSearch(selectedArray: SearchUser[]) {
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [blockStartStatus, setBlockStartStatus] = useState(false);
  const [isPending, startTransition] = useTransition();

  const utils = trpc.useUtils();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<SearchUser[]>([]);

  const items = useMemo(() => {
    if (selectedArray.length === 0) return searchResults;
    const merged = [...searchResults];
    for (const user of selectedArray) {
      if (!searchResults.some((r) => r.id === user.id)) {
        merged.push(user);
      }
    }
    return merged;
  }, [searchResults, selectedArray]);

  const trimmed = inputValue.trim();

  function getStatus(): ReactNode {
    if (isPending) {
      return createElement(
        Fragment,
        null,
        createElement("span", {
          "aria-hidden": true,
          className:
            "inline-block size-3 animate-spin rounded-full border border-current border-r-transparent",
        }),
        "Searching\u2026",
      );
    }
    if (trimmed.length < MIN_QUERY_LENGTH && !blockStartStatus) {
      return selectedArray.length > 0
        ? null
        : "Type at least 2 characters to search\u2026";
    }
    if (searchResults.length === 0 && !blockStartStatus) {
      return `No matches for \u201c${trimmed}\u201d.`;
    }
    return null;
  }

  function getEmptyMessage(): string | null {
    if (trimmed === "" || isPending || searchResults.length > 0) return null;
    return "Try a different search term.";
  }

  function handleInputValueChange(
    nextValue: string,
    details: Combobox.Root.ChangeEventDetails,
  ) {
    setInputValue(nextValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (nextValue === "") {
      setSearchResults(selectedRef.current);
      setBlockStartStatus(false);
      return;
    }

    if (details.reason === "item-press") return;

    const query = nextValue.trim();
    if (query.length < MIN_QUERY_LENGTH) return;

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      startTransition(async () => {
        try {
          const data = await utils.users.search.fetch({
            query,
            limit: 10,
          });
          if (!controller.signal.aborted) {
            startTransition(() => setSearchResults(data.users));
          }
        } catch {
          // aborted or network error
        }
      });
    }, DEBOUNCE_MS);
  }

  function resetAfterSelection(nextSelected: SearchUser[]) {
    selectedRef.current = nextSelected;
    setInputValue("");
    if (nextSelected.length === 0) {
      setSearchResults([]);
      setBlockStartStatus(false);
    } else {
      setBlockStartStatus(true);
    }
  }

  function handleOpenChangeComplete(open: boolean) {
    if (!open) {
      setSearchResults(selectedRef.current);
      setBlockStartStatus(false);
    }
  }

  return {
    items,
    isPending,
    getStatus,
    getEmptyMessage,
    handleInputValueChange,
    resetAfterSelection,
    handleOpenChangeComplete,
  };
}
