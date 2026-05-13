import { router, protectedProcedure, viewAddedEmitter, viewUpdatedEmitter, viewDeletedEmitter } from "../server";
import { container } from "../../di/container";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import type { ViewAddedEvent, ViewUpdatedEvent, ViewDeletedEvent } from "@workspace/interfaces";

const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  layout: z.enum(["force", "circular", "concentric", "grid"]),
  filter: z.any().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    layout: z.enum(["force", "circular", "concentric", "grid"]).optional(),
    filter: z.any().optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const viewRouter = router({
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    const result = await container().viewCommandService.createView({
      id: input.id,
      name: input.name,
      layout: input.layout,
      filterConfig: input.filter,
      isPinned: false,
    });
    return result;
  }),

  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const result = await container().viewCommandService.updateView({
      id: input.id,
      ...input.updates,
    });
    return result;
  }),

  delete: protectedProcedure.input(deleteSchema).mutation(async ({ ctx, input }) => {
    await container().viewCommandService.deleteView({ id: input.id });
    return { success: true, id: input.id };
  }),

  list: protectedProcedure
    .input(z.object({
      isPinned: z.boolean().optional(),
      layout: z.enum(["force", "circular", "concentric", "grid"]).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return container().viewQueryService.list(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return container().viewQueryService.getById({ id: input.id });
    }),

  getPinned: protectedProcedure.query(async () => {
    return container().viewQueryService.getPinned();
  }),

  onAdded: protectedProcedure.subscription(({ ctx }) => {
    return observable<ViewAddedEvent>((emit) => {
      const handler = (data: ViewAddedEvent) => emit.next(data);
      const unsubscribe = viewAddedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),

  onUpdated: protectedProcedure.subscription(({ ctx }) => {
    return observable<ViewUpdatedEvent>((emit) => {
      const handler = (data: ViewUpdatedEvent) => emit.next(data);
      const unsubscribe = viewUpdatedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),

  onDeleted: protectedProcedure.subscription(({ ctx }) => {
    return observable<ViewDeletedEvent>((emit) => {
      const handler = (data: ViewDeletedEvent) => emit.next(data);
      const unsubscribe = viewDeletedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
});