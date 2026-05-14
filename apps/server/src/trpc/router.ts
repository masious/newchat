import { router } from "./init";
import { authRouter } from "./routers/auth";
import { conversationsRouter } from "./routers/conversations";
import { messagesRouter } from "./routers/messages";
import { pushRouter } from "./routers/push";
import { sseRouter } from "./routers/sse";
import { uploadsRouter } from "./routers/uploads";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  conversations: conversationsRouter,
  messages: messagesRouter,
  uploads: uploadsRouter,
  push: pushRouter,
  sse: sseRouter,
});

export type AppRouter = typeof appRouter;
