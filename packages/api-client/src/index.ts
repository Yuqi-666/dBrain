export { trpcClient, createClient } from "./trpc/client";
export { TRPCReactProvider, trpc } from "./trpc/provider";
export * from "./trpc/hooks/useGraph";
export { useGraphSubscriptions } from "./trpc/subscriptions";
export * from "./handler/graph-handler";
export {
  DIRECT_UPLOAD_MAX_BYTES,
  FILES_COLLECTION,
  FILES_FIELD,
  MAX_UPLOAD_BYTES,
  PDF_ANALYZE_MAX_BYTES,
  matchesAccept,
  resolveFileUrl,
  uploadAttachment,
  uploadFile,
  useFileUpload,
} from "./upload";
export type { FileItem, UploadOptions } from "./upload";
export { analyzePdf, transcodeVideo } from "./file-analysis";
export type { PdfAnalysis, VideoTranscode } from "./file-analysis";
export {
  createPocketbaseClient,
  getPocketbaseClient,
  resetPocketbaseClient,
} from "./pocketbase-client";
export { resolveBackendUrls } from "./backend-urls";
export type { BackendUrls } from "./backend-urls";
export * from "./auth";

export { initializeDesktopBackend, getDesktopBackend, refreshDesktopSession } from "./desktop-backend";
export type { DesktopBackend } from "./desktop-backend";
