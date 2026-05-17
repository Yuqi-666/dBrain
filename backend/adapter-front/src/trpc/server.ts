import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { IDomainEvent } from "@workspace/domain/event-bus";

/**
 * tRPC Context - created for each request
 * Provides authentication context and data isolation
 */
export interface Context {
  userId: string;
  connectionId?: string;
}

/**
 * Context creation function
 * Extracts user info from JWT/connectionParams and creates context
 *
 * For HTTP: expects { userId, connectionId }
 * For WS: receives { req, connectionParams, socket, server } - extracts userId from connectionParams
 */
export function createContext(ctx: {
  userId?: string;
  connectionId?: string;
  connectionParams?: { userId?: string };
}): Context {
  // Support both direct userId and connectionParams.userId (for WebSocket)
  const userId = ctx.userId ?? ctx.connectionParams?.userId ?? "dev-user";

  return { userId, connectionId: ctx.connectionId };
}

export type createContextFn = typeof createContext;

/**
 * Initialize tRPC with superjson transformer
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

/**
 * Enforce user authentication middleware
 */
const enforceUserId = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({ ctx: { userId: ctx.userId } });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(enforceUserId);

/**
 * Export tRPC builders
 */
export const router = t.router;
export const procedure = t.procedure;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

/**
 * Create a typed event emitter for tRPC subscriptions
 * This pattern allows broadcasting events to connected clients
 */
export function createEmitter<T>() {
  const listeners = new Set<(data: T) => void>();

  return {
    subscribe: (listener: (data: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit: (data: T) => {
      listeners.forEach((listener) => listener(data));
    },
  };
}

/**
 * Single unified event emitter for all domain events
 * Replaces 14 individual emitters from the previous architecture
 */
export const eventEmitter = createEmitter<IDomainEvent>();
