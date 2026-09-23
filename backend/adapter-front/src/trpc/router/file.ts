import { z } from "zod";
import { router, protectedProcedure } from "../server";
import { container } from "../../di/container";

/**
 * File analysis procedures.
 *
 * The client uploads blobs straight to the file store (that is what gives it a
 * progress bar); these procedures then hand the backend the address of the
 * freshly uploaded blob so it can parse it server-side. No bytes travel over
 * tRPC.
 */
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
      return container().fileCommandService.analyzePdf({
        fileUrl: input.fileUrl,
      });
    }),
});
