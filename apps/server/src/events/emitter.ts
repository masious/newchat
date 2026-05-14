import Emittery, { type UnsubscribeFunction } from "emittery";
import { logger } from "../lib/logger";
import type { DomainEvents } from "./types";

type EventName = keyof DomainEvents;

type CallbackFn<K extends EventName> = (data: DomainEvents[K]) => void | Promise<void>;

function safe<K extends EventName>(event: K | readonly K[], callback: CallbackFn<K>) {
  return async (payload: { name: K; data: DomainEvents[K] }) => {
    try {
      await callback(payload.data);
    } catch (err) {
      logger.error({ err, event }, "Event handler failed");
    }
  };
}

// Redeclare .on() so consumers see CallbackFn (raw data) instead of Emittery's envelope
// biome-ignore lint/correctness/noUnusedVariables: declaration merging is intentional
interface SafeEmitter {
  on<K extends EventName>(
    eventName: K | readonly K[],
    callback: CallbackFn<K>,
  ): UnsubscribeFunction;
}

class SafeEmitter extends Emittery<DomainEvents> {
  override on<K extends EventName>(eventName: K | readonly K[], callback: CallbackFn<K>) {
    // biome-ignore lint/suspicious/noExplicitAny: Emittery's internal types require this cast
    return super.on(eventName, safe(eventName, callback) as any);
  }
}

export const domainEvents = new SafeEmitter();
