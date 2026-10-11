import { useWorkspaceStore } from "@workspace/store";
import { useState } from "react";

import type { IAttachment } from "@workspace/interfaces";
import { getPocketbaseClient } from "./pocketbase-client";

/**
 * PocketBase collection that every uploaded blob lands in.
 * Created by the `files` block in `pb/pb_migrations/1700000000_initial_schema.js`.
 */
export const FILES_COLLECTION = "files";

/** Field name of the binary inside {@link FILES_COLLECTION}. */
export const FILES_FIELD = "file";

export interface FileItem {
  /**
   * Unique identifier for the file item
   */
  id: string;
  /**
   * The actual File object being uploaded
   */
  file: File;
  /**
   * Current upload progress as a percentage (0-100)
   */
  progress: number;
  /**
   * Current status of the file upload process
   * @default "uploading"
   */
  status: "uploading" | "success" | "error";

  /**
   * URL to the uploaded file, available after successful upload
   * @optional
   */
  url?: string;
  /**
   * Controller that can be used to abort the upload process
   * @optional
   */
  abortController?: AbortController;
}

export interface UploadOptions {
  /**
   * Maximum allowed file size in bytes
   */
  maxSize: number;
  /**
   * Maximum number of files that can be uploaded
   */
  limit: number;
  /**
   * String specifying acceptable file types (MIME types or extensions)
   * @example ".jpg,.png,image/jpeg" or "image/*"
   */
  accept: string;
  /**
   * Function that handles the actual file upload process
   * @param {File} file - The file to be uploaded
   * @param {Function} onProgress - Callback function to report upload progress
   * @param {AbortSignal} signal - Signal that can be used to abort the upload
   * @returns {Promise<string>} Promise resolving to the URL of the uploaded file
   */
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal,
  ) => Promise<string>;
  /**
   * Callback triggered when a file is uploaded successfully
   * @param {string} url - URL of the successfully uploaded file
   * @param {File} file - The file that was uploaded (handy for per-file metadata)
   * @optional
   */
  onSuccess?: (url: string, file: File) => void;
  /**
   * Callback triggered when an error occurs during upload
   * @param {Error} error - The error that occurred
   * @optional
   */
  onError?: (error: Error) => void;
}

/**
 * Checks a file against an `<input accept>`-style pattern list.
 *
 * Supports the three syntaxes the browser accepts: extensions (`.png`),
 * wildcards (`image/*`) and concrete MIME types (`application/pdf`). Files whose
 * MIME type the browser could not determine fall back to extension matching;
 * when the caller only supplied MIME patterns we accept the file rather than
 * rejecting something we cannot classify.
 */
export function matchesAccept(file: File, accept?: string): boolean {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);

  if (patterns.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  const matches = (pattern: string): boolean => {
    if (pattern === "*" || pattern === "*/*") return true;
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  };

  if (patterns.some(matches)) return true;

  if (!type) {
    // No usable MIME type: only extension patterns can give a verdict.
    const extensions = patterns.filter((pattern) => pattern.startsWith("."));
    return (
      extensions.length === 0 ||
      extensions.some((pattern) => name.endsWith(pattern))
    );
  }

  return false;
}

/** Only object URLs own their blob; PocketBase URLs must never be revoked. */
function revokeIfObjectUrl(url?: string): void {
  if (!url) return;
  if (!url.startsWith("blob:")) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function")
    return;
  URL.revokeObjectURL(url);
}

/**
 * Resolves a possibly-relative file path against the configured PocketBase
 * origin, so relative `/api/files/...` values written into node content keep
 * working even if the PocketBase port changes.
 *
 * Absolute URLs (`http:`, `https:`, `data:`, `blob:`) are returned untouched,
 * as is any path when the PocketBase client has not been initialised yet.
 */
export function resolveFileUrl(src?: string | null): string {
  if (!src) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//")) return src;

  let base = "";
  try {
    base = getPocketbaseClient().baseUrl;
  } catch {
    return src;
  }
  if (!base) return src;

  return `${base.replace(/\/+$/, "")}${src.startsWith("/") ? "" : "/"}${src}`;
}

function buildUploadUrl(
  record: Record<string, unknown>,
  storedName: string,
): string {
  const pb = getPocketbaseClient();
  if (process.env.NEXT_PUBLIC_DBRAIN_PLATFORM === "desktop" || process.env.NEXT_PUBLIC_DBRAIN_BACKEND_MODE === "same-origin") {
    return `/api/files/${record.collectionId || FILES_COLLECTION}/${record.id}/${storedName}`;
  }
  try {
    return pb.files.getUrl(record, storedName);
  } catch {
    const collection =
      (record.collectionId as string) ||
      (record.collectionName as string) ||
      FILES_COLLECTION;
    const id = String(record.id ?? "");
    if (!id || !storedName) return "";
    return `${pb.baseUrl.replace(/\/+$/, "")}/api/files/${collection}/${id}/${storedName}`;
  }
}

/**
 * Uploads a file to the PocketBase {@link FILES_COLLECTION} collection and
 * returns the created record as an {@link IAttachment}.
 *
 * Implemented with `XMLHttpRequest` (instead of `pb.collection().create()`)
 * purely to get `upload.progress` events for the progress bar.
 */
export const uploadAttachment = (
  file: File,
  onProgress: (event: { progress: number }) => void = () => {},
  signal?: AbortSignal,
): Promise<IAttachment> => {
  const pb = getPocketbaseClient();

  return new Promise<IAttachment>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Upload aborted"));
      return;
    }

    const xhr = new XMLHttpRequest();

    const onAbort = () => {
      xhr.abort();
      reject(new Error("Upload aborted"));
    };
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress({
          progress: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      cleanup();

      if (xhr.status < 200 || xhr.status >= 300) {
        let detail = "";
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string };
          if (body?.message) detail = `: ${body.message}`;
        } catch {
          // non-JSON error body — status code alone is enough
        }
        reject(new Error(`Upload failed with status ${xhr.status}${detail}`));
        return;
      }

      let record: Record<string, unknown>;
      try {
        record = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        reject(new Error("Upload failed: server returned an invalid response"));
        return;
      }

      const storedName =
        typeof record[FILES_FIELD] === "string"
          ? (record[FILES_FIELD] as string)
          : "";

      if (!storedName) {
        reject(new Error("Upload failed: server response contained no file"));
        return;
      }

      resolve({
        id: String(record.id ?? ""),
        // PocketBase renames on disk (`name_ab12cd34.png`); the local File keeps
        // the name the user actually picked.
        fileName: file.name || storedName,
        fileSize: file.size,
        updatedAt: String(record.updated ?? new Date().toISOString()),
        url: buildUploadUrl(record, storedName),
      });
    });

    xhr.addEventListener("error", () => {
      cleanup();
      reject(new Error("Upload failed: network error"));
    });

    xhr.addEventListener("abort", () => {
      cleanup();
      reject(new Error("Upload aborted"));
    });

    const formData = new FormData();
    formData.append(FILES_FIELD, file);
    const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
    if (workspaceId) formData.append("workspaceId", workspaceId);

    xhr.open(
      "POST",
      pb.buildUrl(`/api/collections/${FILES_COLLECTION}/records`).toString(),
    );

    // PocketBase accepts the raw token in the `Authorization` header. The
    // The files collection requires authentication and records ownership.
    const token = pb.authStore?.token;
    if (token) xhr.setRequestHeader("Authorization", token);

    xhr.send(formData);
  });
};

/**
 * Upload a file to PocketBase using the configured collection.
 * This function matches the UploadOptions.upload signature.
 *
 * @param file - The file to upload
 * @param onProgress - Callback to report upload progress (0-100)
 * @param signal - AbortSignal for cancellation
 * @returns Promise resolving to the URL of the uploaded file
 */
export const uploadFile: UploadOptions["upload"] = async (
  file: File,
  onProgress: (event: { progress: number }) => void,
  signal: AbortSignal,
): Promise<string> => {
  const attachment = await uploadAttachment(file, onProgress, signal);
  return attachment.url;
};

/**
 * Custom hook for managing multiple file uploads with progress tracking and cancellation
 */
export function useFileUpload(options: UploadOptions) {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!matchesAccept(file, options.accept)) {
      options.onError?.(
        new Error(
          `Unsupported file type: ${file.name}${options.accept ? ` (expected ${options.accept})` : ""}`,
        ),
      );
      return null;
    }

    if (file.size > options.maxSize) {
      const error = new Error(
        `File size exceeds maximum allowed (${options.maxSize / 1024 / 1024}MB)`,
      );
      options.onError?.(error);
      return null;
    }

    const abortController = new AbortController();
    const fileId = crypto.randomUUID();

    const newFileItem: FileItem = {
      id: fileId,
      file,
      progress: 0,
      status: "uploading",
      abortController,
    };

    setFileItems((prev) => [...prev, newFileItem]);

    try {
      if (!options.upload) {
        throw new Error("Upload function is not defined");
      }

      const url = await options.upload(
        file,
        (event: { progress: number }) => {
          setFileItems((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progress: event.progress } : item,
            ),
          );
        },
        abortController.signal,
      );

      if (!url) throw new Error("Upload failed: No URL returned");

      if (!abortController.signal.aborted) {
        setFileItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "success", url, progress: 100 }
              : item,
          ),
        );
        options.onSuccess?.(url, file);
        return url;
      }

      return null;
    } catch (error) {
      if (!abortController.signal.aborted) {
        setFileItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "error", progress: 0 }
              : item,
          ),
        );
        options.onError?.(
          error instanceof Error ? error : new Error("Upload failed"),
        );
      }
      return null;
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) {
      options.onError?.(new Error("No files to upload"));
      return [];
    }

    if (options.limit && files.length > options.limit) {
      options.onError?.(
        new Error(
          `Maximum ${options.limit} file${options.limit === 1 ? "" : "s"} allowed`,
        ),
      );
      return [];
    }

    // Upload all files concurrently
    const uploadPromises = files.map((file) => uploadFile(file));
    const results = await Promise.all(uploadPromises);

    // Filter out null results (failed uploads)
    return results.filter((url): url is string => url !== null);
  };

  const removeFileItem = (fileId: string) => {
    setFileItems((prev) => {
      const fileToRemove = prev.find((item) => item.id === fileId);
      fileToRemove?.abortController?.abort();
      revokeIfObjectUrl(fileToRemove?.url);
      return prev.filter((item) => item.id !== fileId);
    });
  };

  const clearAllFiles = () => {
    fileItems.forEach((item) => {
      item.abortController?.abort();
      revokeIfObjectUrl(item.url);
    });
    setFileItems([]);
  };

  return {
    fileItems,
    uploadFiles,
    removeFileItem,
    clearAllFiles,
  };
}
