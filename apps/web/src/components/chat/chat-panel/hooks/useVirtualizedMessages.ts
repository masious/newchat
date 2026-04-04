import { useMemo, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const START_INDEX = 100_000;

export function useVirtualizedMessages(conversationId: number) {
  const messagesQuery = trpc.messages.list.useInfiniteQuery(
    { conversationId },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    },
  );

  const flatMessages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const all = pages.flatMap((page) => page.messages);
    return all.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return aDate - bDate;
    });
  }, [messagesQuery.data]);

  const firstItemIndex = useMemo(
    () => START_INDEX - flatMessages.length,
    [flatMessages.length],
  );

  const [atBottom, setAtBottom] = useState(true);

  const handleStartReached = useCallback(() => {
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      messagesQuery.fetchNextPage();
    }
  }, [
    messagesQuery.hasNextPage,
    messagesQuery.isFetchingNextPage,
    messagesQuery.fetchNextPage,
  ]);

  return {
    messagesQuery,
    flatMessages,
    firstItemIndex,
    atBottom,
    setAtBottom,
    handleStartReached,
  };
}
