import { router, protectedProcedure } from "../server";
import { container } from "../../di/container";
import { z } from "zod";

const baseNodeFields = {
  id: z.string(),
  title: z.string().optional(),
  abstract: z.string().optional(),
  permission: z.enum(["private", "public", "restricted"]).optional(),
  semanticId: z.string(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  stateData: z.any().optional(),
  workspaceId: z.string().optional(),
};

const textContentSchema = z.object({
  docs: z.record(z.any()),
});

const imageContentSchema = z.object({
  url: z.string(),
});

const pdfContentSchema = z.object({
  url: z.string(),
  coverUrl: z.string(),
});

const videoContentSchema = z.object({
  url: z.string(),
  coverUrl: z.string(),
  // Written by the upload flow once the backend has packaged the video as HLS;
  // absent until then, and on every record created by an older build.
  hlsUrl: z.string().optional(),
});

const audioContentSchema = z.object({
  url: z.string(),
});

/**
 * Webpage source — the node's only representation, so there is no mode to
 * branch on: `code` plus the language it is highlighted as.
 *
 * `html` is accepted as a legacy alias for `code` so payloads built before the
 * node stored a single `code` field still round-trip instead of being silently
 * stripped. The retired `mode` / `url` / `screenshotUrl` keys are unknown to
 * this schema and simply drop out.
 */
const webpageContentSchema = z
  .object({
    code: z.string().optional(),
    language: z.string().optional(),
    html: z.string().optional(),
  })
  .transform((content) => ({
    code: content.code ?? content.html ?? "",
    language: content.language ?? "html",
  }));

const websiteContentSchema = z.object({
  url: z.string(),
  faviconUrl: z.string().optional(),
});

const collectionContentSchema = z.object({
  filterConfig: z.any().optional(),
});

const richTextContentSchema = z.object({
  referencedNodes: z.array(z.string()),
  docs: z.record(z.any()),
});

const addSchema = z.discriminatedUnion("nodeType", [
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("text"),
    content: textContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("image"),
    width: z.number(),
    height: z.number(),
    fileSize: z.number(),
    location: z.string().optional(),
    shootingTime: z.string().optional(),
    content: imageContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("pdf"),
    pageCount: z.number(),
    fileSize: z.number(),
    content: pdfContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("video"),
    duration: z.number(),
    source: z.enum(["local", "online"]),
    sourceUrl: z.string().optional(),
    fileSize: z.number().optional(),
    location: z.string().optional(),
    shootingTime: z.string().optional(),
    content: videoContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("audio"),
    duration: z.number(),
    fileSize: z.number(),
    content: audioContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("webpage"),
    content: webpageContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("website"),
    content: websiteContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("collection"),
    content: collectionContentSchema,
  }),
  z.object({
    ...baseNodeFields,
    nodeType: z.literal("rich-text"),
    content: richTextContentSchema,
  }),
]);

/**
 * File metadata patched onto an already-created node by the upload flow. Zod
 * strips keys it does not know, so every field the client actually writes has
 * to be declared here or it is silently dropped before reaching the service.
 */
const fileMetaSchema = {
  fileSize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  pageCount: z.number().optional(),
  source: z.enum(["local", "online"]).optional(),
  sourceUrl: z.string().optional(),
  location: z.string().optional(),
  shootingTime: z.string().optional(),
};

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    title: z.string().optional(),
    abstract: z.string().optional(),
    tags: z.array(z.string()).optional(),
    permission: z.enum(["private", "public", "restricted"]).optional(),
    semanticId: z.string().optional(),
    isPinned: z.boolean().optional(),
    content: z.any().optional(),
    stateData: z.any().optional(),
    workspaceId: z.string().optional(),
    ...fileMetaSchema,
  }),
});

const deleteSchema = z.object({
  id: z.string(),
});

export const nodeRouter = router({
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    const result = await container().nodeCommandService.createNode({
      ...input,
      userId: ctx.userId,
      sourceId: ctx.sourceId,
    } as any);
    return result;
  }),

  update: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await container().nodeCommandService.updateNode({
        id: input.id,
        title: input.updates.title,
        abstract: input.updates.abstract,
          tags: input.updates.tags,
        permission: input.updates.permission,
        semanticId: input.updates.semanticId,
        isPinned: input.updates.isPinned,
        content: input.updates.content,
        stateData: input.updates.stateData,
        workspaceId: input.updates.workspaceId,
        fileSize: input.updates.fileSize,
        width: input.updates.width,
        height: input.updates.height,
        duration: input.updates.duration,
        pageCount: input.updates.pageCount,
        source: input.updates.source,
        sourceUrl: input.updates.sourceUrl,
        location: input.updates.location,
        shootingTime: input.updates.shootingTime,
        userId: ctx.userId,
        sourceId: ctx.sourceId,
      });
      return result;
    }),

  delete: protectedProcedure
    .input(deleteSchema)
    .mutation(async ({ ctx, input }) => {
      await container().nodeCommandService.deleteNode({ id: input.id, userId: ctx.userId, sourceId: ctx.sourceId });
      return { success: true, id: input.id };
    }),

  list: protectedProcedure
    .input(
      z.object({
        nodeType: z.string().optional(),
        semanticId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return container().nodeQueryService.list({
        nodeType: input.nodeType,
        semanticId: input.semanticId,
      });
    }),

  listByWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input }) => {
      return container().nodeQueryService.listByWorkspace(input.workspaceId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return container().nodeQueryService.getById({ id: input.id });
    }),

  getPinned: protectedProcedure.query(async () => {
    return container().nodeQueryService.getPinned();
  }),

  getRecentlyUpdated: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return container().nodeQueryService.getRecentlyUpdated({
        limit: input.limit,
      });
    }),
});
