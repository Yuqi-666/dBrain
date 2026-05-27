import { router, protectedProcedure } from "../server";
import { container } from "../../di/container";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  direction: z.enum(["forward", "reverse", "bidirectional", "undirected"]),
  semanticId: z.string(),
  edgeType: z.enum(["hierarchy", "flow", "association", "interaction"]),
  weight: z.number().min(1).max(5).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    direction: z.enum(["forward", "reverse", "bidirectional", "undirected"]).optional(),
    semanticId: z.string().optional(),
    edgeType: z.enum(["hierarchy", "flow", "association", "interaction"]).optional(),
    weight: z.number().min(1).max(5).optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const edgeRouter = router({
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    try {
      const result = await container().edgeCommandService.createEdge({
        id: input.id,
        from: input.from,
        to: input.to,
        direction: input.direction,
        semanticId: input.semanticId,
        edgeType: input.edgeType,
        weight: input.weight !== undefined ? { value: input.weight } : undefined,
        userId: ctx.userId,
        sourceId: ctx.sourceId,
      });
      return result;
    } catch (error) {
      if (error instanceof Error && (error.message.includes("from === to") || error.message.includes("self-loop"))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Edge cannot connect a node to itself",
        });
      }
      throw error;
    }
  }),

  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const result = await container().edgeCommandService.updateEdge({
      id: input.id,
      direction: input.updates.direction,
      semanticId: input.updates.semanticId,
      edgeType: input.updates.edgeType,
      weight: input.updates.weight !== undefined ? { value: input.updates.weight } : undefined,
      userId: ctx.userId,
      sourceId: ctx.sourceId,
    });
    return result;
  }),

  delete: protectedProcedure.input(deleteSchema).mutation(async ({ ctx, input }) => {
    await container().edgeCommandService.deleteEdge({ id: input.id, userId: ctx.userId, sourceId: ctx.sourceId });
    return { success: true, id: input.id };
  }),

  list: protectedProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      semanticId: z.string().optional(),
      edgeType: z.enum(["hierarchy", "flow", "association", "interaction"]).optional(),
    }))
    .query(async ({ input }) => {
      return container().edgeQueryService.list(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return container().edgeQueryService.getById({ id: input.id });
    }),
});
