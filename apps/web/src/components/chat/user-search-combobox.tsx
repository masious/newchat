"use client";

import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Combobox } from "@base-ui/react/combobox";
import { Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { userDisplayName } from "@/lib/formatting";
import type { SearchUser } from "@/lib/trpc-types";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

type UserSearchComboboxProps =
  | {
      multiple?: false;
      value: SearchUser | null;
      onValueChange: (user: SearchUser | null) => void;
      placeholder?: string;
    }
  | {
      multiple: true;
      value: SearchUser[];
      onValueChange: (users: SearchUser[]) => void;
      placeholder?: string;
    };

export function UserSearchCombobox(props: UserSearchComboboxProps) {
  const { placeholder = "Search by name or username..." } = props;

  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [blockStartStatus, setBlockStartStatus] = useState(false);
  const [isPending, startTransition] = useTransition();

  const utils = trpc.useUtils();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<SearchUser[]>([]);

  const selectedArray = useMemo(
    () => (props.multiple ? props.value : props.value ? [props.value] : []),
    [props.multiple, props.value],
  );

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

  function getStatus() {
    if (isPending) {
      return (
        <Fragment>
          <span
            aria-hidden
            className="inline-block size-3 animate-spin rounded-full border border-current border-r-transparent"
          />
          Searching…
        </Fragment>
      );
    }
    if (trimmed.length < MIN_QUERY_LENGTH && !blockStartStatus) {
      return selectedArray.length > 0 ? null : "Type at least 2 characters to search…";
    }
    if (searchResults.length === 0 && !blockStartStatus) {
      return `No matches for "${trimmed}".`;
    }
    return null;
  }

  function getEmptyMessage() {
    if (trimmed === "" || isPending || searchResults.length > 0) return null;
    return "Try a different search term.";
  }

  function handleInputValueChange(
    nextValue: string,
    { reason }: Combobox.Root.ChangeEventDetails,
  ) {
    setInputValue(nextValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (nextValue === "") {
      setSearchResults(selectedRef.current);
      setBlockStartStatus(false);
      return;
    }

    if (reason === "item-press") return;

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

  const sharedPopup = (
    <Combobox.Portal>
      <Combobox.Positioner sideOffset={4} className="z-70 outline-none">
        <Combobox.Popup
          className="box-border max-h-60 w-(--anchor-width) overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          aria-busy={isPending || undefined}
        >
          <Combobox.Status className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 empty:hidden dark:text-slate-400">
            {getStatus()}
          </Combobox.Status>
          <Combobox.Empty className="px-3 py-2 text-xs text-slate-500 empty:hidden dark:text-slate-400">
            {getEmptyMessage()}
          </Combobox.Empty>
          <Combobox.List>
            {(user: SearchUser) => (
              <Combobox.Item
                key={user.id}
                value={user}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-slate-700 outline-none data-highlighted:bg-slate-100 dark:text-slate-300 dark:data-highlighted:bg-slate-700"
              >
                <Combobox.ItemIndicator className="w-4 shrink-0 text-indigo-600 dark:text-indigo-400">
                  <Check className="h-4 w-4" />
                </Combobox.ItemIndicator>
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {user.firstName.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {userDisplayName(user)}
                  </p>
                  {user.username && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      @{user.username}
                    </p>
                  )}
                </div>
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );

  if (props.multiple) {
    return (
      <Combobox.Root<SearchUser, true>
        items={items}
        itemToStringLabel={(user) => userDisplayName(user)}
        isItemEqualToValue={(a, b) => a.id === b.id}
        multiple
        filter={null}
        value={props.value}
        onValueChange={(nextValues) => {
          selectedRef.current = nextValues;
          props.onValueChange(nextValues);
          setInputValue("");
          if (nextValues.length === 0) {
            setSearchResults([]);
            setBlockStartStatus(false);
          } else {
            setBlockStartStatus(true);
          }
        }}
        onInputValueChange={handleInputValueChange}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setSearchResults(selectedRef.current);
            setBlockStartStatus(false);
          }
        }}
      >
        <Combobox.InputGroup className="flex min-h-10 w-full flex-wrap rounded-lg border border-slate-200 bg-white px-1.5 py-1 focus-within:border-indigo-500 focus-within:outline-none dark:border-slate-600 dark:bg-slate-700">
          <Combobox.Chips className="flex w-full flex-wrap items-center gap-1">
            <Combobox.Value>
              {(value: SearchUser[] | null) => {
                const users = value ?? [];
                return (
                <Fragment>
                  {users.map((user) => (
                    <Combobox.Chip
                      key={user.id}
                      className="flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      aria-label={userDisplayName(user)}
                    >
                      {user.firstName}
                      <Combobox.ChipRemove
                        className="inline-flex items-center justify-center rounded-full bg-transparent p-0.5 text-inherit hover:bg-indigo-100 dark:hover:bg-indigo-800/40"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    placeholder={users.length > 0 ? "" : placeholder}
                    className="h-8 min-w-24 flex-1 rounded-lg border-0 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </Fragment>
                );
              }}
            </Combobox.Value>
          </Combobox.Chips>
        </Combobox.InputGroup>
        {sharedPopup}
      </Combobox.Root>
    );
  }

  // Single-select (DM mode)
  return (
    <Combobox.Root<SearchUser, false>
      items={items}
      itemToStringLabel={(user) => userDisplayName(user)}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={null}
      value={props.value}
      onValueChange={(nextValue) => {
        selectedRef.current = nextValue ? [nextValue] : [];
        props.onValueChange(nextValue);
        if (!nextValue) {
          setSearchResults([]);
          setBlockStartStatus(false);
        } else {
          setBlockStartStatus(true);
        }
      }}
      onInputValueChange={handleInputValueChange}
      onOpenChangeComplete={(open) => {
        if (!open) {
          setSearchResults(selectedRef.current);
          setBlockStartStatus(false);
        }
      }}
    >
      <Combobox.InputGroup className="flex min-h-10 w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 focus-within:border-indigo-500 focus-within:outline-none dark:border-slate-600 dark:bg-slate-700">
        <Combobox.Input
          placeholder={placeholder}
          className="h-8 min-w-24 flex-1 rounded-lg border-0 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </Combobox.InputGroup>
      {sharedPopup}
    </Combobox.Root>
  );
}
