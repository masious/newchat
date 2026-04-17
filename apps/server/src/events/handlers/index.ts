import type { Database } from "@newchat/db";
import { registerRealtimeHandlers } from "./realtime";
import { registerNotificationHandlers } from "./notifications";

export function registerEventHandlers(db: Database): void {
  registerRealtimeHandlers(db);
  registerNotificationHandlers(db);
}
