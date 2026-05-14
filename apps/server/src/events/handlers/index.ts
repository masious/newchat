import type { Database } from "@newchat/db";
import { registerNotificationHandlers } from "./notifications";
import { registerRealtimeHandlers } from "./realtime";

export function registerEventHandlers(db: Database): void {
  registerRealtimeHandlers(db);
  registerNotificationHandlers(db);
}
