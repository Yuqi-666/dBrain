import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@workspace/adapter-front";
import { trpcClient } from "./trpc/client";

/**
 * Server-side file analysis.
 *
 * Uploading is a direct browser → PocketBase transfer (see `./upload`), so once
 * the blob is stored the client only has to hand its address to the backend.
 * Parsing — and, for PDFs, rasterizing a cover — happens there.
 */

/** Parameters the backend reads out of an uploaded PDF. */
export type PdfAnalysis = inferRouterOutputs<AppRouter>["file"]["analyzePdf"];

/**
 * Asks the backend to parse the PDF at `fileUrl` and to store a cover of its
 * first page, resolving to `{ pageCount, fileSize, pageWidth, pageHeight,
 * coverUrl, info }`.
 *
 * Rejects when the document cannot be fetched or parsed (e.g. a
 * password-protected file); callers that can live without the metadata should
 * fall back rather than fail the upload.
 */
export async function analyzePdf(fileUrl: string): Promise<PdfAnalysis> {
  return trpcClient.file.analyzePdf.mutate({ fileUrl });
}
