// Reusable mock utilities for unit tests.
//
// Services import data-query modules and singletons (domainEvents, redisPublisher)
// at the module level. Use `mock.module()` in individual test files to replace
// these imports before the service under test is loaded. This file provides the
// mock objects those stubs return.

import { mock } from "bun:test";
import type { DomainEvents } from "@/events/types";

// ---------------------------------------------------------------------------
// Mock Redis
// ---------------------------------------------------------------------------
// In-memory Redis mock with TTL tracking. Covers get/set/del/incr/decr/publish
// and the "EX" TTL mode used by idempotency and presence.

type RedisStore = Map<string, { value: string; expiresAt?: number }>;

export function createMockRedis() {
  const store: RedisStore = new Map();

  function isExpired(key: string): boolean {
    const entry = store.get(key);
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      store.delete(key);
      return true;
    }
    return false;
  }

  const redis = {
    _store: store,

    get: mock((key: string) => {
      if (isExpired(key)) return Promise.resolve(null);
      return Promise.resolve(store.get(key)?.value);
    }),

    set: mock((...args: unknown[]) => {
      const key = args[0] as string;
      const value = args[1] as string;
      let expiresAt: number | undefined;

      // Handle: set(key, value, "EX", ttlSec)
      if (args[2] === "EX" && typeof args[3] === "number") {
        expiresAt = Date.now() + (args[3] as number) * 1000;
      }
      store.set(key, { value, expiresAt });
      return Promise.resolve("OK");
    }),

    del: mock((key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),

    getdel: mock((key: string) => {
      if (isExpired(key)) return Promise.resolve(null);
      const value = store.get(key)?.value;
      store.delete(key);
      return Promise.resolve(value);
    }),

    incr: mock((key: string) => {
      if (isExpired(key)) {
        store.set(key, { value: "1" });
        return Promise.resolve(1);
      }
      const entry = store.get(key)!;
      const next = parseInt(entry.value, 10) + 1;
      entry.value = String(next);
      return Promise.resolve(next);
    }),

    decr: mock((key: string) => {
      if (isExpired(key)) {
        store.set(key, { value: "-1" });
        return Promise.resolve(-1);
      }
      const entry = store.get(key)!;
      const next = parseInt(entry.value, 10) - 1;
      entry.value = String(next);
      return Promise.resolve(next);
    }),

    expire: mock((_key: string, _ttl: number) => {
      const entry = store.get(_key);
      if (!entry) return Promise.resolve(0);
      entry.expiresAt = Date.now() + _ttl * 1000;
      return Promise.resolve(1);
    }),

    ttl: mock((key: string) => {
      const entry = store.get(key);
      if (!entry) return Promise.resolve(-2);
      if (!entry.expiresAt) return Promise.resolve(-1);
      return Promise.resolve(Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000)));
    }),

    publish: mock((_channel: string, _message: string) => {
      return Promise.resolve(0);
    }),

    subscribe: mock((..._channels: string[]) => {
      return Promise.resolve();
    }),

    unsubscribe: mock((..._channels: string[]) => {
      return Promise.resolve();
    }),

    on: mock((_event: string, _callback: (...args: unknown[]) => void) => {
      return redis;
    }),

    disconnect: mock(() => Promise.resolve()),
    quit: mock(() => Promise.resolve()),
  };

  return redis;
}

export type MockRedis = ReturnType<typeof createMockRedis>;

// ---------------------------------------------------------------------------
// Mock Domain Events
// ---------------------------------------------------------------------------
// Captures emitted events for assertion. Use `emittedEvents` to inspect
// what was emitted during a test.

type EmittedEvent = {
  name: keyof DomainEvents;
  data: DomainEvents[keyof DomainEvents];
};

export function createMockDomainEvents() {
  const emittedEvents: EmittedEvent[] = [];
  const listeners = new Map<string, Array<(data: unknown) => void>>();

  return {
    emittedEvents,

    emit: mock(async (name: keyof DomainEvents, data: unknown) => {
      emittedEvents.push({ name, data } as EmittedEvent);
      const handlers = listeners.get(name as string);
      if (handlers) {
        for (const handler of handlers) {
          await handler(data);
        }
      }
    }),

    on: mock((name: keyof DomainEvents, callback: (data: unknown) => void | Promise<void>) => {
      const key = name as string;
      if (!listeners.has(key)) {
        listeners.set(key, []);
      }
      listeners.get(key)?.push(callback);
      return () => {
        const arr = listeners.get(key);
        if (arr) {
          const idx = arr.indexOf(callback);
          if (idx >= 0) arr.splice(idx, 1);
        }
      };
    }),

    clearAll() {
      emittedEvents.length = 0;
      listeners.clear();
    },
  };
}

export type MockDomainEvents = ReturnType<typeof createMockDomainEvents>;

// ---------------------------------------------------------------------------
// Mock Database
// ---------------------------------------------------------------------------
// Minimal mock for the Drizzle Database type. Only stubs the `query` property
// used by authorization.ts (db.query.conversationMembers.findFirst).
// Data-query functions are mocked at the module level via mock.module(),
// so most tests don't need this to be deeply realistic.

export function createMockDb() {
  const db = {
    query: {
      conversationMembers: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
      },
      conversations: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
      },
      users: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
      },
      messages: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
      },
      authTokens: {
        findFirst: mock(() => Promise.resolve(null)),
      },
      pushSubscriptions: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
      },
    },
    select: mock(() => {
      const chain = {
        from: mock(() => chain),
        where: mock(() => chain),
        leftJoin: mock(() => chain),
        innerJoin: mock(() => chain),
        orderBy: mock(() => chain),
        limit: mock(() => chain),
        offset: mock(() => chain),
        then: mock((resolve: (v: unknown[]) => void) => resolve([])),
      };
      return chain;
    }),
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([])),
        onConflictDoUpdate: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
        onConflictDoNothing: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => Promise.resolve()),
    })),
    execute: mock(() => Promise.resolve({ rows: [] })),
    transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  } as any;

  return db;
}

export type MockDb = ReturnType<typeof createMockDb>;
