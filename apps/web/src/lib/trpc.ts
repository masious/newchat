import type { AppRouter } from "@newchat/server/trpc";
import { type CreateTRPCReact, createTRPCReact } from "@trpc/react-query";

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
