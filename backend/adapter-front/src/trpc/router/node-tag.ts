import {
  router,
  protectedProcedure,
  nodeTagAddedEmitter,
} from "../server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { AppContainer } from "../../di/container";

const getContainer = () => AppContainer.getInstance();

const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    color: z.string().optional(),
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const nodeTagRouter = router({
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    const result = await getContainer().semanticCommandService.createNodeTag({
      ...input,
    });
    return { success: true, data: result };
  }),
  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const result = await getContainer().semanticCommandService.updateNodeTag({
      id: input.id,
      ...input.updates,
    });
    return { success: true, data: result };
  }),
  delete: protectedProcedure.input(deleteSchema).mutation(async ({ ctx, input }) => {
    await getContainer().semanticCommandService.deleteNodeTag({
      id: input.id,
    });
    return { success: true, id: input.id };
  }),
  list: protectedProcedure.query(async () => {
    return getContainer().semanticQueryService.listNodeTags({});
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return getContainer().semanticQueryService.getNodeTagById({ id: input.id });
    }),
  sync: protectedProcedure.query(async () => {
    return getContainer().semanticQueryService.listNodeTags({});
  }),
  onAdded: protectedProcedure.subscription(({ ctx }) => {
    return observable<{ nodeTag: any; userId: string; timestamp: number }>((emit) => {
      const handler = (data: { nodeTag: any; userId: string; timestamp: number }) =>
        emit.next(data);
      const unsubscribe = nodeTagAddedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
});
