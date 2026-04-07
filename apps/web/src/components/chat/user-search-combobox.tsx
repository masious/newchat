"use client";

import { Fragment, useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { userDisplayName } from "@/lib/formatting";
import type { SearchUser } from "@/lib/trpc-types";
import { useComboboxSearch } from "./use-combobox-search";

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

  const selectedArray = useMemo(
    () => (props.multiple ? props.value : props.value ? [props.value] : []),
    [props.multiple, props.value],
  );

  const {
    items,
    isPending,
    getStatus,
    getEmptyMessage,
    handleInputValueChange,
    resetAfterSelection,
    handleOpenChangeComplete,
  } = useComboboxSearch(selectedArray);

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
                <Avatar avatarUrl={user.avatarUrl} name={user.firstName} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
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
          resetAfterSelection(nextValues);
          props.onValueChange(nextValues);
        }}
        onInputValueChange={handleInputValueChange}
        onOpenChangeComplete={handleOpenChangeComplete}
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
        resetAfterSelection(nextValue ? [nextValue] : []);
        props.onValueChange(nextValue);
      }}
      onInputValueChange={handleInputValueChange}
      onOpenChangeComplete={handleOpenChangeComplete}
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
