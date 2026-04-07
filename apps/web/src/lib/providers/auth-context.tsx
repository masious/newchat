"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../trpc-types";
import { trpc } from "../trpc";
import { getAuthToken, setAuthToken, subscribeToAuthToken } from "../auth-storage";

type AuthContextValue = {
  status: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  token: string | null;
  user: CurrentUser | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    return subscribeToAuthToken((nextToken) => {
      setTokenState(nextToken);
    });
  }, []);

  const meQuery = trpc.users.me.useQuery(undefined, {
    enabled: Boolean(token),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry auth errors, but retry transient ones
      if (error.data?.httpStatus === 401) return false;
      return failureCount < 3;
    },
  });

  useEffect(() => {
    if (meQuery.error) {
      const status = meQuery.error.data?.httpStatus;
      if ([401, 403].includes(status!)) {
        setAuthToken(null);
        setTokenState(null);
        window.dispatchEvent(new CustomEvent("newchat:auth-expired"));
      }
    }
  }, [meQuery.error]);

  const login = useCallback((newToken: string) => {
    setAuthToken(newToken);
    setTokenState(newToken);
  }, []);

  const { mutateAsync: unsubscribeEndpoint } =
    trpc.push.unsubscribeEndpoint.useMutation();

  const logout = useCallback(async () => {
    // Best-effort push notification cleanup before clearing auth
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription =
          await registration?.pushManager?.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          unsubscribeEndpoint({ endpoint }).catch(() => {});
        }
      }
    } catch {
      // Push cleanup is best-effort, never block logout
    }
    setAuthToken(null);
    setTokenState(null);
  }, [unsubscribeEndpoint]);

  const refreshUser = useCallback(async () => {
    await meQuery.refetch();
  }, [meQuery]);

  const value = useMemo<AuthContextValue>(() => {
    if (!hydrated) {
      return {
        status: "loading",
        isAuthenticated: false,
        token: null,
        user: null,
        login,
        logout,
        refreshUser,
      };
    }

    if (!token) {
      return {
        status: "unauthenticated",
        isAuthenticated: false,
        token: null,
        user: null,
        login,
        logout,
        refreshUser,
      };
    }

    if (meQuery.isLoading) {
      return {
        status: "loading",
        isAuthenticated: false,
        token,
        user: null,
        login,
        logout,
        refreshUser,
      };
    }

    if (meQuery.data?.user) {
      return {
        status: "authenticated",
        isAuthenticated: true,
        token,
        user: meQuery.data.user,
        login,
        logout,
        refreshUser,
      };
    }

    return {
      status: "unauthenticated",
      isAuthenticated: false,
      token: null,
      user: null,
      login,
      logout,
      refreshUser,
    };
  }, [hydrated, token, meQuery.data?.user, meQuery.isLoading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
