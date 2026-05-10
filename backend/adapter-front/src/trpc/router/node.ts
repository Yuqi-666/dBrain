import { router, publicProcedure } from "../server";
import { z } from "zod";

const addSchema = z.object({
  id: z.string(),
  nodeSemanticId: z.string(),
  nodeType: z.string(),
  data: z.any(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    nodeSemanticId: z.string().optional(),
    data: z.any().optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const nodeRouter = router({
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
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return null;
    }),
});
