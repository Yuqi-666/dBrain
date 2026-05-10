import { router, publicProcedure } from "../server";
import { z } from "zod";

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
