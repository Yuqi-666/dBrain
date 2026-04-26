import {
  router,
  publicProcedure,
} from "../server";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  direction: z.enum(["forward", "reverse", "bidirectional"]),
  semanticId: z.string(),
  edgeType: z.enum(["hierarchy", "flow", "association", "interaction"]),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    direction: z.enum(["forward", "reverse", "bidirectional"]).optional(),
    semanticId: z.string().optional(),
    edgeType: z.enum(["hierarchy", "flow", "association", "interaction"]).optional(),
    weight: z.number().min(1).max(5).optional(),
    stateData: z.record(z.any()).optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const edgeRouter = router({
  add: publicProcedure.input(addSchema).mutation(({ input }) => {
    return { success: true, data: input };
  }),
  update: publicProcedure.input(updateSchema).mutation(({ input }) => {
    return { success: true, id: input.id };
  }),
  delete: publicProcedure.input(deleteSchema).mutation(({ input }) => {
    return { success: true, id: input.id };
  }),
  list: publicProcedure.query(() => {
    return { items: [] };
  }),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return null;
  }),
});
