import { router, protectedProcedure } from "../server";
import { z } from "zod";
import { AppContainer } from "../../di/container";

const getContainer = () => AppContainer.getInstance();

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
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    const result = await getContainer().semanticCommandService.createNodeSemantic({
      ...input,
      userId: ctx.userId,
    });
    return { success: true, data: result };
  }),
  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const result = await getContainer().semanticCommandService.updateNodeSemantic({
      id: input.id,
      ...input.updates,
      userId: ctx.userId,
    });
    return { success: true, data: result };
  }),
  delete: protectedProcedure.input(deleteSchema).mutation(async ({ ctx, input }) => {
    await getContainer().semanticCommandService.deleteNodeSemantic({
      id: input.id,
      userId: ctx.userId,
    });
    return { success: true, id: input.id };
  }),
  list: protectedProcedure.query(async () => {
    return getContainer().semanticQueryService.listNodeSemantics({});
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return getContainer().semanticQueryService.getNodeSemanticById({ id: input.id });
    }),
});
