import { useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const SCROLL_THRESHOLD = 200;

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

  const prevMessageCountRef = useRef(flatMessages.length);

  const handleScrollNearTop = useCallback(
    (scrollTop: number) => {
      if (
        scrollTop < SCROLL_THRESHOLD &&
        messagesQuery.hasNextPage &&
        !messagesQuery.isFetchingNextPage
      ) {
        messagesQuery.fetchNextPage();
      }
    },
    [
      messagesQuery.hasNextPage,
      messagesQuery.isFetchingNextPage,
      messagesQuery.fetchNextPage,
    ],
  );

  return {
    messagesQuery,
    flatMessages,
    prevMessageCountRef,
    handleScrollNearTop,
  };
}
