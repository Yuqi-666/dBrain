import { router, protectedProcedure } from "../server";
import { container } from "../../di/container";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  layout: z.enum(["dagre", "radial", "compactBox", "D3force", "fishbone", "mindmap"]),
  filter: z.any().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    layout: z.enum(["dagre", "radial", "compactBox", "D3force", "fishbone", "mindmap"]).optional(),
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
      userId: ctx.userId,
      sourceId: ctx.sourceId,
    });
    return result;
  }),

  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const result = await container().viewCommandService.updateView({
      id: input.id,
      ...input.updates,
      userId: ctx.userId,
      sourceId: ctx.sourceId,
    });
    return result;
  }),

  delete: protectedProcedure.input(deleteSchema).mutation(async ({ ctx, input }) => {
    await container().viewCommandService.deleteView({ id: input.id, userId: ctx.userId, sourceId: ctx.sourceId });
    return { success: true, id: input.id };
  }),

  list: protectedProcedure
    .input(z.object({
      isPinned: z.boolean().optional(),
      layout: z.enum(["dagre", "radial", "compactBox", "D3force", "fishbone", "mindmap"]).optional(),
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
});
