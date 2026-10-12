import { router, protectedProcedure } from "../server";
import { container } from "../../di/container";
import { z } from "zod";

const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
});

const memberSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(["owner", "editor", "viewer"]),
});

export const workspaceRouter = router({
  add: protectedProcedure.input(workspaceSchema).mutation(async ({ ctx, input }) => {
    return container().workspaceCommandService.createWorkspace({
      id: input.id,
      name: input.name,
      ownerId: input.ownerId,
      userId: ctx.userId,
      sourceId: ctx.sourceId,
    });
  }),

  provisionDefault: protectedProcedure.mutation(async ({ ctx }) => {
    return container().workspaceCommandService.provisionDefaultWorkspace(
      ctx.userId,
    );
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ name: z.string().optional() }) }))
    .mutation(async ({ ctx, input }) => {
      return container().workspaceCommandService.updateWorkspace({
        id: input.id,
        name: input.updates.name,
        userId: ctx.userId,
        sourceId: ctx.sourceId,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await container().workspaceCommandService.deleteWorkspace({
        id: input.id,
        userId: ctx.userId,
        sourceId: ctx.sourceId,
      });
      return { success: true, id: input.id };
    }),

  list: protectedProcedure.query(async () => {
    return container().workspaceQueryService.list({});
  }),

  listByUser: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.userId;
      return container().workspaceQueryService.listByUser({ userId });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return container().workspaceQueryService.getById({ id: input.id });
    }),

  getMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input }) => {
      return container().workspaceQueryService.getMembers({ workspaceId: input.workspaceId });
    }),

  addMember: protectedProcedure.input(memberSchema).mutation(async ({ ctx, input }) => {
    return container().workspaceCommandService.addMember({
      id: input.id,
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
      actorUserId: ctx.userId,
      sourceId: ctx.sourceId,
    });
  }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.string(), workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await container().workspaceCommandService.removeMember({
        id: input.id,
        workspaceId: input.workspaceId,
        userId: input.userId,
        actorUserId: ctx.userId,
        sourceId: ctx.sourceId,
      });
      return { success: true };
    }),
});
