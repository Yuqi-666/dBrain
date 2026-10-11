import {
  getPocketBaseClient,
  runWithFileWorkspace,
  toFileEndpointPath,
} from "@workspace/infrastructure";
import { z } from "zod";
import { router, protectedProcedure } from "../server";
import { container } from "../../di/container";

/**
 * File analysis procedures.
 *
 * The client uploads blobs straight to the file store (that is what gives it a
 * progress bar); these procedures then hand the backend the address of the
 * freshly uploaded blob so it can process it server-side. No bytes travel over
 * tRPC.
 */
async function withFileScope<T>(
  url: string,
  work: () => Promise<T>,
): Promise<T> {
  const path = toFileEndpointPath(url);
  const [, , , collection, id] = path.split("/");
  const file = await getPocketBaseClient().collection("files").getOne(id!);
  if (collection !== "files" && collection !== file.collectionId)
    throw new Error("Invalid file collection");
  return runWithFileWorkspace(String(file.workspaceId ?? ""), work);
}
export const fileRouter = router({
  /**
   * Parses an uploaded PDF and stores a first-page cover.
   *
   * Returns the document parameters (`pageCount`, `fileSize`, page size, Info
   * dictionary) plus the cover URL; the caller patches them onto its node.
   */
  analyzePdf: protectedProcedure
    .input(z.object({ fileUrl: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return withFileScope(input.fileUrl, () =>
        container().fileCommandService.analyzePdf({
          fileUrl: input.fileUrl,
        }),
      );
    }),

  /**
   * Packages an uploaded video as HLS and stores the playlist, its segments and
   * a poster frame.
   *
   * Returns the playlist and cover URLs plus the video's parameters; the caller
   * patches them onto its node. A stream browsers already decode is copied, so
   * this is quick for H.264 and only slow when the source needs re-encoding —
   * which is exactly the case the browser cannot play on its own.
   */
  transcodeVideo: protectedProcedure
    .input(z.object({ fileUrl: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return withFileScope(input.fileUrl, () =>
        container().fileCommandService.transcodeVideo({
          fileUrl: input.fileUrl,
        }),
      );
    }),
});
