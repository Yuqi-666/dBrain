import {
  router,
  publicProcedure,
  nodeSemanticAddedEmitter,
  nodeSemanticUpdatedEmitter,
  nodeSemanticDeletedEmitter,
} from "../server";
import { observable } from "@trpc/server/observable";
import type {
  NodeSemanticAddedEvent,
  NodeSemanticUpdatedEvent,
  NodeSemanticEventDeletedEvent,
} from "@workspace/interfaces";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const nodeSemanticRouter = router({
  add: publicProcedure.input(addSchema).mutation(({ ctx, input }) => {
    const timestamp = Date.now();
    const nodeSemantic = { ...input, createdAt: timestamp };

    nodeSemanticAddedEmitter.emit({
      nodeSemantic,
      userId: ctx.userId,
      timestamp,
    });

    return { success: true, data: nodeSemantic };
  }),
  update: publicProcedure.input(updateSchema).mutation(({ ctx, input }) => {
    const timestamp = Date.now();

    nodeSemanticUpdatedEmitter.emit({
      id: input.id,
      updates: input.updates,
      userId: ctx.userId,
      timestamp,
    });

    return { success: true, id: input.id };
  }),
  delete: publicProcedure.input(deleteSchema).mutation(({ ctx, input }) => {
    const timestamp = Date.now();

    nodeSemanticDeletedEmitter.emit({
      id: input.id,
      userId: ctx.userId,
      timestamp,
    });

    return { success: true, id: input.id };
  }),
  list: publicProcedure.query(() => {
    return { items: [] };
  }),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return null;
  }),
  sync: publicProcedure.query(() => {
    return [];
  }),
  onAdded: publicProcedure.subscription(({ ctx }) => {
    return observable<NodeSemanticAddedEvent>((emit) => {
      const handler = (data: NodeSemanticAddedEvent) => emit.next(data);
      const unsubscribe = nodeSemanticAddedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
  onUpdated: publicProcedure.subscription(({ ctx }) => {
    return observable<NodeSemanticUpdatedEvent>((emit) => {
      const handler = (data: NodeSemanticUpdatedEvent) => emit.next(data);
      const unsubscribe = nodeSemanticUpdatedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
  onDeleted: publicProcedure.subscription(({ ctx }) => {
    return observable<NodeSemanticEventDeletedEvent>((emit) => {
      const handler = (data: NodeSemanticEventDeletedEvent) => emit.next(data);
      const unsubscribe = nodeSemanticDeletedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
});