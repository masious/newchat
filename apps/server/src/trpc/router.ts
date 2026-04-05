import { router } from "./init";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { conversationsRouter } from "./routers/conversations";
import { messagesRouter } from "./routers/messages";
import { uploadsRouter } from "./routers/uploads";
import { pushRouter } from "./routers/push";
import { sseRouter } from "./routers/sse";

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
