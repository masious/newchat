import Emittery, { type UnsubscribeFunction } from "emittery";
import type { DomainEvents } from "./types";
import { logger } from "../lib/logger";

type EventName = keyof DomainEvents

type CallbackFn<K extends EventName> = (data: DomainEvents[K]) => void | Promise<void>

function safe<K extends EventName>(event: K | readonly K[], callback: CallbackFn<K>) {
    return async (payload: { name: K; data: DomainEvents[K] }) => {
        try {
            await callback(payload.data)
        } catch(err) {
            logger.error({ err, event }, "Event handler failed");
        }
    }
}

// Redeclare .on() so consumers see CallbackFn (raw data) instead of Emittery's envelope
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface SafeEmitter {
    on<K extends EventName>(eventName: K | readonly K[], callback: CallbackFn<K>): UnsubscribeFunction;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class SafeEmitter extends Emittery<DomainEvents> {
    override on<K extends EventName>(eventName: K | readonly K[], callback: CallbackFn<K>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return super.on(eventName, safe(eventName, callback) as any);
    }
}

export const domainEvents = new SafeEmitter();
