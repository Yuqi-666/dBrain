import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { NodeData, NodeId, EdgeData, EdgeId } from "@workspace/interfaces";

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
 * Extracts user info from JWT and creates context
 */
export function createContext({ userId, connectionId }: Context): Context {
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User ID is required",
    });
  }

  return { userId, connectionId };
}

export type createContextFn = typeof createContext;

/**
 * Initialize tRPC with superjson transformer
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

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
 * Broadcast emitters for all 14 graph events
 * These emit to all connected subscribers when changes occur
 */

// Node Semantic events (3)
export const nodeSemanticAddedEmitter = createEmitter<{
  nodeSemantic: any;
  userId: string;
  timestamp: number;
}>();

export const nodeSemanticUpdatedEmitter = createEmitter<{
  id: string;
  updates: any;
  userId: string;
  timestamp: number;
}>();

export const nodeSemanticDeletedEmitter = createEmitter<{
  id: string;
  userId: string;
  timestamp: number;
}>();

// Edge Semantic events (3)
export const edgeSemanticAddedEmitter = createEmitter<{
  edgeSemantic: any;
  userId: string;
  timestamp: number;
}>();

export const edgeSemanticUpdatedEmitter = createEmitter<{
  id: string;
  updates: any;
  userId: string;
  timestamp: number;
}>();

export const edgeSemanticDeletedEmitter = createEmitter<{
  id: string;
  userId: string;
  timestamp: number;
}>();

// Node events (3)
export const nodeAddedEmitter = createEmitter<{
  node: NodeData;
  userId: string;
  timestamp: number;
}>();

export const nodeUpdatedEmitter = createEmitter<{
  id: NodeId;
  updates: Partial<NodeData>;
  userId: string;
  timestamp: number;
}>();

export const nodeDeletedEmitter = createEmitter<{
  id: NodeId;
  userId: string;
  timestamp: number;
}>();

// Edge events (3)
export const edgeAddedEmitter = createEmitter<{
  edge: EdgeData;
  userId: string;
  timestamp: number;
}>();

export const edgeUpdatedEmitter = createEmitter<{
  id: EdgeId;
  updates: Partial<EdgeData>;
  userId: string;
  timestamp: number;
}>();

export const edgeDeletedEmitter = createEmitter<{
  id: EdgeId;
  userId: string;
  timestamp: number;
}>();

// View events (3)
export const viewAddedEmitter = createEmitter<{
  view: any;
  userId: string;
  timestamp: number;
}>();

export const viewUpdatedEmitter = createEmitter<{
  id: string;
  updates: any;
  userId: string;
  timestamp: number;
}>();

export const viewDeletedEmitter = createEmitter<{
  id: string;
  userId: string;
  timestamp: number;
}>();

/**
 * Helper to emit all events in one object
 * Useful for internal event dispatching
 */
export const emitters = {
  nodeSemanticAdded: nodeSemanticAddedEmitter,
  nodeSemanticUpdated: nodeSemanticUpdatedEmitter,
  nodeSemanticDeleted: nodeSemanticDeletedEmitter,
  edgeSemanticAdded: edgeSemanticAddedEmitter,
  edgeSemanticUpdated: edgeSemanticUpdatedEmitter,
  edgeSemanticDeleted: edgeSemanticDeletedEmitter,
  nodeAdded: nodeAddedEmitter,
  nodeUpdated: nodeUpdatedEmitter,
  nodeDeleted: nodeDeletedEmitter,
  edgeAdded: edgeAddedEmitter,
  edgeUpdated: edgeUpdatedEmitter,
  edgeDeleted: edgeDeletedEmitter,
  viewAdded: viewAddedEmitter,
  viewUpdated: viewUpdatedEmitter,
  viewDeleted: viewDeletedEmitter,
} as const;
