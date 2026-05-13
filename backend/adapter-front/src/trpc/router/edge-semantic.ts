import {
  router,
  protectedProcedure,
  edgeSemanticAddedEmitter,
  edgeSemanticUpdatedEmitter,
  edgeSemanticDeletedEmitter,
} from "../server";
import { container } from "../../di/container";
import { observable } from "@trpc/server/observable";
import type {
  EdgeSemanticAddedEvent,
  EdgeSemanticUpdatedEvent,
  EdgeSemanticEventDeletedEvent,
} from "@workspace/interfaces";
import type { EdgeType } from "@workspace/interfaces/models/edge/types";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string() as z.ZodType<EdgeType>,
  description: z.string().optional(),
  color: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    category: z.string().optional() as z.ZodType<EdgeType | undefined>,
    description: z.string().optional(),
    color: z.string().optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const edgeSemanticRouter = router({
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    const result = await container().semanticCommandService.createEdgeSemantic({
      id: input.id,
      name: input.name,
      category: input.category,
      description: input.description,
      color: input.color,
    });
    return result;
  }),
  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const result = await container().semanticCommandService.updateEdgeSemantic({
      id: input.id,
      name: input.updates.name,
      category: input.updates.category,
      description: input.updates.description,
      color: input.updates.color,
    });
    return result;
  }),
  delete: protectedProcedure.input(deleteSchema).mutation(async ({ ctx, input }) => {
    await container().semanticCommandService.deleteEdgeSemantic({
      id: input.id,
    });
    return { success: true, id: input.id };
  }),
  list: protectedProcedure.query(async () => {
    return container().semanticQueryService.listEdgeSemantics({});
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return container().semanticQueryService.getEdgeSemanticById({ id: input.id });
    }),
  sync: protectedProcedure.query(async () => {
    return container().semanticQueryService.listEdgeSemantics({});
  }),
  onAdded: protectedProcedure.subscription(({ ctx }) => {
    return observable<EdgeSemanticAddedEvent>((emit) => {
      const handler = (data: EdgeSemanticAddedEvent) => emit.next(data);
      const unsubscribe = edgeSemanticAddedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
  onUpdated: protectedProcedure.subscription(({ ctx }) => {
    return observable<EdgeSemanticUpdatedEvent>((emit) => {
      const handler = (data: EdgeSemanticUpdatedEvent) => emit.next(data);
      const unsubscribe = edgeSemanticUpdatedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
  onDeleted: protectedProcedure.subscription(({ ctx }) => {
    return observable<EdgeSemanticEventDeletedEvent>((emit) => {
      const handler = (data: EdgeSemanticEventDeletedEvent) => emit.next(data);
      const unsubscribe = edgeSemanticDeletedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
});