# Push Notifications

**Two delivery channels**: Web Push (browser) and Telegram (bot message). Each user picks their preferred channel via the `notificationChannel` enum. Notifications fire when a message is sent — never blocking the send itself.

## Notification Channel Enum

```sql
notification_channel: "web" | "telegram" | "both" | "none"
```

Stored on the `users` table as `notificationChannel`, defaults to `"both"`.

| Value      | Web Push | Telegram | Notes                    |
|------------|----------|----------|--------------------------|
| `web`      | Yes      | No       | Browser only             |
| `telegram` | No       | Yes      | Telegram DM only         |
| `both`     | Yes      | Yes      | Both channels fire       |
| `none`     | No       | No       | All notifications muted  |

Users update this via `users.updateNotificationPreferences({ channel })`.

## Trigger: Message Send

```
messages.send (apps/server/src/trpc/routers/messages.ts:70-150)
  1. Insert message, create read receipt, publish SSE event
  2. For each conversation member (excluding sender):
       notifyUserOfMessage(db, { recipientUserId, senderName, content, conversationId, conversationName? })
  3. All notification calls wrapped in Promise.allSettled() — fire-and-forget
```

Notifications never block the message send response. Errors are caught and logged silently.

## Notification Service Core

**File**: `apps/server/src/services/notification-service.ts`

```
notifyUserOfMessage(db, payload)
  1. SELECT notificationChannel, telegramId FROM users WHERE id = recipientUserId
  2. If channel === "none" → return early
  3. If channel === "web" or "both" → sendWebPushNotifications(db, payload)
  4. If channel === "telegram" or "both" → sendTelegramNotification(telegramId, payload)
  5. await Promise.allSettled([...promises])
```

---

## Web Push Path

### Server: VAPID & Delivery

**File**: `apps/server/src/lib/web-push.ts`

- Uses the `web-push` npm library
- Configured with VAPID keys on startup (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- If keys are missing, web push is silently disabled (warning logged)

```
sendWebPushNotifications(db, payload)
  1. SELECT * FROM push_subscriptions WHERE userId = recipientUserId
  2. If no subscriptions → return
  3. Build payload: { title, body, conversationId, url }
     - title: "SenderName" (DM) or "SenderName in GroupName" (group)
     - url: "{WEB_APP_URL}/?conversation={conversationId}"
  4. For each subscription → sendPushNotification(subscription, payload)
  5. If push service returns 410/404 → DELETE expired subscription from DB
```

Push payload TTL: **24 hours** (push service retries delivery for this duration).

### Database: push_subscriptions

```sql
push_subscriptions {
  id          serial PRIMARY KEY
  user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE
  endpoint    text NOT NULL         -- push service URL (unique per browser)
  p256dh      text NOT NULL         -- ECDH public key for encryption
  auth        text NOT NULL         -- auth secret for encryption
  created_at  timestamp NOT NULL
}
```

A user can have **multiple subscriptions** (one per browser/device).

### Client: Service Worker

**File**: `apps/web/public/sw.js`

Handles three events:

1. **`push`** — Display notification:
   - Parses JSON payload from server
   - Shows browser notification with title, body, vibration pattern
   - Tags by `conversation-{id}` (replaces previous notification for same conversation)

2. **`notificationclick`** — Open/focus app:
   - Closes the notification
   - Focuses existing window if URL matches, otherwise opens new window
   - URL comes from payload (`/?conversation={id}`)

3. **`pushsubscriptionchange`** — Auto-resubscribe:
   - If the browser rotates the subscription, re-subscribes with same options

### Client: Subscription Hook

**File**: `apps/web/src/lib/hooks/use-push-notifications.ts`

```typescript
usePushNotifications() → {
  permission: NotificationPermission,  // "default" | "granted" | "denied"
  isSupported: boolean,                // browser has Push API
  isSubscribed: boolean,               // active subscription exists
  requestPermission(): Promise<boolean>,
  unsubscribe(): Promise<void>,
}
```

**Subscribe flow** (`requestPermission()`):
```
1. Notification.requestPermission() → "granted"
2. Register /sw.js service worker (if not already registered)
3. navigator.serviceWorker.ready
4. pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })
5. trpc push.subscribe({ subscription: { endpoint, keys: { p256dh, auth } } })
```

**Unsubscribe flow** (`unsubscribe()`):
```
1. pushManager.getSubscription() → subscription.unsubscribe()
2. trpc push.unsubscribe() → DELETE all push_subscriptions for user
```

### tRPC Push Router

**File**: `apps/server/src/trpc/routers/push.ts`

| Procedure               | Input                                          | Behavior                                                     |
|--------------------------|-------------------------------------------------|--------------------------------------------------------------|
| `push.subscribe`         | `{ subscription: { endpoint, keys: { p256dh, auth } } }` | Upsert: if endpoint exists for user, update keys; otherwise insert |
| `push.unsubscribe`       | *(none)*                                        | Delete **all** subscriptions for the authenticated user       |
| `push.unsubscribeEndpoint` | `{ endpoint: string }`                        | Delete the specific subscription matching user + endpoint     |

All three are `protectedProcedure` (require JWT).

---

## Telegram Notification Path

**File**: `apps/server/src/lib/telegram-notifier.ts`

```
sendTelegramNotification(telegramId, { senderName, content, conversationId, conversationName? })
  1. If TELEGRAM_BOT_TOKEN not set → return { success: false }
  2. Truncate content to 100 chars (+ "..." if truncated)
  3. Escape Markdown special characters in senderName, conversationName, content
  4. Format message:
     DM:    "💬 *SenderName*:\nContent\n\n[Open in Kite](url)"
     Group: "💬 *SenderName* in *GroupName*:\nContent\n\n[Open in Kite](url)"
  5. POST to Telegram Bot API /sendMessage
     - parse_mode: "Markdown"
     - disable_web_page_preview: true
```

The Telegram message includes a deep link back to the conversation: `{WEB_APP_URL}/?conversation={id}`.

---

## Notification Sound (Client)

**File**: `apps/web/src/lib/hooks/use-notification-sound.ts`

Separate from push notifications — this plays an in-app sound when an SSE `new_message` event arrives:

- Audio: `/sounds/message.mp3` at 50% volume
- Mute preference: `localStorage("newchat.muted")`
- Listens for custom `newchat:new-message` window event (dispatched by SSE handler)
- Muted state toggled via `toggleMute()` in EditProfileDialog

## Environment Variables

| Variable                        | Used By | Purpose                        |
|----------------------------------|---------|--------------------------------|
| `VAPID_PUBLIC_KEY`               | Server  | Web Push server authentication |
| `VAPID_PRIVATE_KEY`              | Server  | Web Push server authentication |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`   | Client  | Browser push subscription      |
| `WEB_APP_URL`                    | Server  | Deep links in notifications    |
| `TELEGRAM_BOT_TOKEN`            | Server  | Telegram Bot API access        |
