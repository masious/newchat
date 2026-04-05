import { TRPCError } from "@trpc/server";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from "../errors";

export function mapDomainError(err: unknown): never {
  if (err instanceof ForbiddenError)
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  if (err instanceof NotFoundError)
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  if (err instanceof BadRequestError)
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  if (err instanceof UnauthorizedError)
    throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
  throw err;
}
