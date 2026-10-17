/**
 * The media resource library, as the client sees it.
 *
 * Blobs live in the PocketBase `files` collection, so this module reads that
 * collection directly: the same transport the uploads already use, and the only
 * one both the browser app and the desktop local mode share. It reads the
 * record metadata (`size`, `mimeType`, `displayName`) that the PocketBase hook
 * writes server-side; it never trusts a client-supplied size for accounting.
 *
 * The storage *limits* are deployment configuration, not collection data, so
 * they come from the API (`storage.limits`) through the typed tRPC client. Both
 * halves live here so a component has one import for the whole resource model.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthStore } from "@workspace/store";
import type { IAttachment } from "@workspace/interfaces";
import {
  DEFAULT_STORAGE_LIMITS,
  STORAGE_CATEGORIES,
  fileExtension,
  maxFileBytesFor,
  storageCategoryFor,
  type StorageCategory,
  type StorageLimits,
} from "@workspace/utils/storage-limits";
import { readAuthSessionToken, decodeJwtPayload } from "./auth/session";
import { getPocketbaseClient } from "./pocketbase-client";
import { trpc } from "./trpc/provider";
import { buildUploadUrl, resolveFileUrl, uploadAttachment } from "./upload";

/** PocketBase collection every stored blob lands in. Re-exported for clarity. */
const COLLECTION = "files";

/** Which records a resource query lists. */
export type ResourceScope =
  /** Records this user owns; this is what the per-user quota counts. */
  | "mine"
  /** Every record the access rules expose, including workspace teammates'. */
  | "visible";

/** One stored blob, mapped to what the library and the selector render. */
export interface ResourceRecord {
  id: string;
  /** Name PocketBase stores on disk (with its random suffix). */
  fileName: string;
  /** User-editable label; empty on a record that was never renamed. */
  displayName: string;
  /** `displayName` when set, otherwise a readable form of {@link fileName}. */
  name: string;
  /** Byte length recorded by the server when the blob was stored. */
  fileSize: number;
  /** MIME type derived from the stored file name by the PocketBase hook. */
  mimeType: string;
  category: StorageCategory;
  /** Address to write into node content (root-relative in desktop mode). */
  storedUrl: string;
  /** Address ready for `src`, resolved against the active PocketBase origin. */
  url: string;
  ownerId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

/** One user's storage occupation, split by category. */
export interface StorageUsage {
  /** Bytes across every category. */
  total: number;
  /** Bytes per category, always carrying all five keys. */
  byCategory: Record<StorageCategory, number>;
  /** Number of records counted. */
  count: number;
}

/** Why a picked file would be rejected before it is uploaded. */
export interface ResourceLimitViolation {
  kind: "category";
  category: StorageCategory;
  fileSize: number;
  limitBytes: number;
}

/** Empty per-category totals, spread so callers cannot mutate the shared object. */
function emptyUsage(): StorageUsage {
  return {
    total: 0,
    byCategory: { image: 0, video: 0, audio: 0, pdf: 0, other: 0 },
    count: 0,
  };
}

/**
 * Removes the random suffix PocketBase appends to a stored name, so a record
 * that was never renamed still reads like the file the user picked.
 *
 * The suffix is exactly ten lower-case alphanumerics before the final extension
 * (`report_ab12cd34ef.pdf`). Only a name shaped that way is rewritten; anything
 * else is returned verbatim, because guessing could mangle a real file name.
 */
export function prettyStoredFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const extension = dot > 0 ? fileName.slice(dot) : "";
  if (fileExtension(fileName) === "") return fileName;
  return base.replace(/_[a-z0-9]{10}$/, "") + extension;
}

/** The label a resource should show: the rename, else a readable stored name. */
export function resourceDisplayName(resource: {
  displayName: string;
  fileName: string;
}): string {
  const renamed = resource.displayName.trim();
  return renamed || prettyStoredFileName(resource.fileName);
}

/**
 * The id of the PocketBase user that owns files written by this browser.
 *
 * Exported for the selector's "shared" badge: the graph user id and the
 * PocketBase user id are the same in the browser app, but not in the desktop
 * local mode, where the graph user is the fixed local identity. Reading the
 * token claim is the one source that is correct in both.
 */
export function currentResourceOwnerId(): string {
  return currentOwnerId();
}

/** The id of the PocketBase user that owns files written by this browser. */
function currentOwnerId(): string {
  const token =
    process.env.NEXT_PUBLIC_DBRAIN_PLATFORM === "desktop"
      ? getPocketbaseClient().authStore?.token
      : readAuthSessionToken();
  if (token) {
    const id = decodeJwtPayload(token).id;
    if (typeof id === "string" && id) return id;
  }
  // No token (a test or a pre-session render): fall back to the graph user.
  return useAuthStore.getState().user?.id ?? "";
}

/** Maps one PocketBase record onto {@link ResourceRecord}. */
function toResourceRecord(raw: Record<string, unknown>): ResourceRecord {
  const fileName = typeof raw.file === "string" ? raw.file : "";
  const mimeType = typeof raw.mimeType === "string" ? raw.mimeType : "";
  const displayName =
    typeof raw.displayName === "string" ? raw.displayName : "";
  const storedUrl = fileName ? buildUploadUrl(raw, fileName) : "";
  const size = Number(raw.size);
  const record: ResourceRecord = {
    id: String(raw.id ?? ""),
    fileName,
    displayName,
    name: "",
    fileSize: Number.isFinite(size) && size > 0 ? size : 0,
    mimeType,
    category: storageCategoryFor(fileName, mimeType),
    storedUrl,
    url: storedUrl ? resolveFileUrl(storedUrl) : "",
    ownerId: typeof raw.ownerId === "string" ? raw.ownerId : "",
    workspaceId: typeof raw.workspaceId === "string" ? raw.workspaceId : "",
    createdAt: typeof raw.created === "string" ? raw.created : "",
    updatedAt: typeof raw.updated === "string" ? raw.updated : "",
  };
  record.name = resourceDisplayName(record);
  return record;
}

/**
 * Lists stored resources, newest first.
 *
 * `mine` filters on `ownerId` because that is the set the quota charges; it is
 * also the scope the management page shows. `visible` leaves the filter off and
 * lets the collection rules decide, so a workspace member can reference a
 * teammate's upload without gaining ownership of it.
 */
export async function listResources(options?: {
  scope?: ResourceScope;
}): Promise<ResourceRecord[]> {
  const scope = options?.scope ?? "mine";
  const pb = getPocketbaseClient();
  const filter = scope === "mine" ? "ownerId = {:owner}" : "";
  const records = await pb.collection(COLLECTION).getFullList({
    filter: filter
      ? pb.filter(filter, { owner: currentOwnerId() })
      : undefined,
    sort: "-created",
    fields:
      "id,collectionId,collectionName,file,size,mimeType,displayName,ownerId,workspaceId,created,updated",
  });
  return records.map((record) =>
    toResourceRecord(record as unknown as Record<string, unknown>),
  );
}

/** Renames a resource's label. The stored blob and its URL do not change. */
export async function renameResource(
  id: string,
  displayName: string,
): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error("A resource name is required");
  await getPocketbaseClient().collection(COLLECTION).update(id, {
    displayName: trimmed,
  });
}

/**
 * Deletes a resource record, which also deletes the stored bytes. Nodes that
 * still point at the record keep their URL and start failing to load it.
 */
export async function deleteResource(id: string): Promise<void> {
  await getPocketbaseClient().collection(COLLECTION).delete(id);
}

/** Uploads one file into the library, with the same transports as a node upload. */
export async function uploadResource(
  file: File,
  onProgress?: (event: { progress: number }) => void,
  signal?: AbortSignal,
): Promise<IAttachment> {
  return uploadAttachment(file, onProgress, signal);
}

/**
 * Sums a resource list into the storage view.
 *
 * `records` may be the whole library; a record without a usable `size` cannot
 * be counted and is skipped — the metadata field is written by the server hook,
 * so a zero here means a record that predates the field.
 */
export function storageUsageOf(resources: ResourceRecord[]): StorageUsage {
  const usage = emptyUsage();
  for (const resource of resources) {
    usage.total += resource.fileSize;
    usage.byCategory[resource.category] += resource.fileSize;
    usage.count += 1;
  }
  return usage;
}

/**
 * Checks one file against the per-category ceiling before any byte is sent.
 *
 * The server enforces the same rule authoritatively; this only spares the user
 * a failed upload of a file that cannot be accepted.
 */
export function checkResourceLimit(
  file: Pick<File, "name" | "size" | "type">,
  limits: StorageLimits,
): ResourceLimitViolation | null {
  const category = storageCategoryFor(file.name, file.type);
  const limitBytes = maxFileBytesFor(limits, file.name, file.type);
  if (file.size <= limitBytes) return null;
  return { kind: "category", category, fileSize: file.size, limitBytes };
}

/** What one resource query is currently doing. */
export interface UseResourcesResult {
  resources: ResourceRecord[];
  loading: boolean;
  /** Human-readable failure of the last load; `null` when it succeeded. */
  error: string | null;
  /** Re-reads the list, e.g. after an upload, a rename or a delete. */
  reload: () => void;
}

/**
 * Reads a resource list for a component.
 *
 * A counter guards against an out-of-order response replacing a newer list —
 * `reload` may be triggered by a delete while the previous read is still in
 * flight.
 */
export function useResources(options?: {
  scope?: ResourceScope;
  enabled?: boolean;
}): UseResourcesResult {
  const scope = options?.scope ?? "mine";
  const enabled = options?.enabled ?? true;

  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const ticket = ++generation.current;
    setLoading(true);
    void listResources({ scope })
      .then((next) => {
        if (generation.current !== ticket) return;
        setResources(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (generation.current !== ticket) return;
        setResources([]);
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "Could not read the resource library",
        );
      })
      .finally(() => {
        if (generation.current !== ticket) return;
        setLoading(false);
      });
  }, [enabled, scope, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { resources, loading, error, reload };
}

/**
 * The storage limits the server enforces.
 *
 * In the browser this is a query against the API; in the desktop local mode the
 * local engine answers with the same built-in defaults. Until the answer (or if
 * it fails), the built-in defaults are displayed so the page never renders an
 * empty quota bar.
 */
export function useStorageLimits(): StorageLimits {
  const { data } = trpc.storage.limits.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });
  return data ?? DEFAULT_STORAGE_LIMITS;
}

export { STORAGE_CATEGORIES };
export type { StorageCategory, StorageLimits };
