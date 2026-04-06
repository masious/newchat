"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { addToast } from "./toast-context";
import { useState } from "react";
import { trpc } from "../trpc";
import { getAuthToken } from "../auth-storage";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Skip if the mutation has its own onError (handled locally)
        if (mutation.options.onError) return;

        if (error instanceof TRPCClientError) {
          const httpStatus = error.data?.httpStatus;
          // 401/403 handled by AuthProvider
          if (httpStatus === 401 || httpStatus === 403) return;
          if (httpStatus && httpStatus >= 500) {
            addToast("Server error. Please try again later.");
            return;
          }
          if (!error.data) {
            addToast("Network error. Check your connection.");
            return;
          }
        }

        addToast("Something went wrong. Please try again.");
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

const defaultServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${defaultServerUrl.replace(/\/$/, "")}/trpc`,
          headers() {
            const token = getAuthToken();
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
