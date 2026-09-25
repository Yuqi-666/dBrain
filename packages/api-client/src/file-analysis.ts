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

/**
 * The HLS package the backend built from an uploaded video, plus the parameters
 * it read off it: `{ hlsUrl, coverUrl, duration, width, height, videoCodec,
 * audioCodec, reencoded }`.
 */
export type VideoTranscode =
  inferRouterOutputs<AppRouter>["file"]["transcodeVideo"];

/**
 * Asks the backend to package the video at `fileUrl` as HLS.
 *
 * This is what makes an upload playable at all: a phone records HEVC, which
 * desktop browsers cannot decode, and the packaged playlist carries a codec they
 * can. `hlsUrl` is the playlist the node should store; the original `fileUrl`
 * stays the fallback. Rejects when the video cannot be read by the transcoder —
 * callers keep the plain upload in that case.
 */
export async function transcodeVideo(fileUrl: string): Promise<VideoTranscode> {
  return trpcClient.file.transcodeVideo.mutate({ fileUrl });
}
