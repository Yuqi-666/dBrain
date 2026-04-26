import {
  router,
  publicProcedure,
  edgeSemanticAddedEmitter,
  edgeSemanticUpdatedEmitter,
  edgeSemanticDeletedEmitter,
} from "../server";
import { observable } from "@trpc/server/observable";
import type {
  EdgeSemanticAddedEvent,
  EdgeSemanticUpdatedEvent,
  EdgeSemanticEventDeletedEvent,
} from "@workspace/interfaces";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const edgeSemanticRouter = router({
  add: publicProcedure.input(addSchema).mutation(({ ctx, input }) => {
    const timestamp = Date.now();
    const edgeSemantic = { ...input, createdAt: timestamp };

    edgeSemanticAddedEmitter.emit({
      edgeSemantic,
      userId: ctx.userId,
      timestamp,
    });

    return { success: true, data: edgeSemantic };
  }),
  update: publicProcedure.input(updateSchema).mutation(({ ctx, input }) => {
    const timestamp = Date.now();

    edgeSemanticUpdatedEmitter.emit({
      id: input.id,
      updates: input.updates,
      userId: ctx.userId,
      timestamp,
    });

    return { success: true, id: input.id };
  }),
  delete: publicProcedure.input(deleteSchema).mutation(({ ctx, input }) => {
    const timestamp = Date.now();

    edgeSemanticDeletedEmitter.emit({
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
    return observable<EdgeSemanticAddedEvent>((emit) => {
      const handler = (data: EdgeSemanticAddedEvent) => emit.next(data);
      const unsubscribe = edgeSemanticAddedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
  onUpdated: publicProcedure.subscription(({ ctx }) => {
    return observable<EdgeSemanticUpdatedEvent>((emit) => {
      const handler = (data: EdgeSemanticUpdatedEvent) => emit.next(data);
      const unsubscribe = edgeSemanticUpdatedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
  onDeleted: publicProcedure.subscription(({ ctx }) => {
    return observable<EdgeSemanticEventDeletedEvent>((emit) => {
      const handler = (data: EdgeSemanticEventDeletedEvent) => emit.next(data);
      const unsubscribe = edgeSemanticDeletedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
});