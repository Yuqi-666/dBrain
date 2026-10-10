import type { IFileStore, StoredBlob } from "@workspace/domain";
import type { PocketBaseClient } from "../database/pocketbase-client";

/**
 * PocketBase-backed file store.
 *
 * The client uploads the original blob itself (so it keeps its progress bar and
 * never proxies a 100 MB body through tRPC); the backend then only needs the
 * address of that blob. {@link download} therefore accepts a URL but never
 * fetches it as given: the path is validated and re-resolved against this
 * server's own PocketBase origin, so a caller cannot turn the endpoint into a
 * proxy for arbitrary addresses.
 */

/** `/api/files/<collection>/<record>/<filename>` — nothing else is allowed. */
const FILE_PATH_PATTERN = /^\/api\/files\/[A-Za-z0-9_]+\/[A-Za-z0-9]+\/[^/]+$/;

export function toFileEndpointPath(fileUrl: string): string {
  let pathname: string;
  try {
    pathname = new URL(fileUrl, "http://pocketbase.invalid").pathname;
  } catch {
    throw new Error(`Not a usable file address: ${fileUrl}`);
  }

  if (!FILE_PATH_PATTERN.test(pathname)) {
    throw new Error(`Refusing to fetch a non file-store address: ${fileUrl}`);
  }
  return pathname;
}

/**
 * Copies the bytes into a plain `ArrayBuffer` before wrapping them in a `Blob`:
 * `BlobPart` only accepts views over `ArrayBuffer`, while `Uint8Array` in
 * general is typed over `ArrayBufferLike` (which includes `SharedArrayBuffer`).
 * Covers are tens of kilobytes, so the copy is not worth avoiding.
 */
function toBlob(blob: StoredBlob): Blob {
  const buffer = new ArrayBuffer(blob.bytes.byteLength);
  new Uint8Array(buffer).set(blob.bytes);
  return new Blob([buffer], { type: blob.contentType });
}

export class PocketBaseFileStore implements IFileStore {
  constructor(
    private readonly pb: PocketBaseClient,
    private readonly collection = "files",
    private readonly field = "file",
  ) {}

  async download(fileUrl: string): Promise<Uint8Array> {
    const target = new URL(toFileEndpointPath(fileUrl), this.pb.baseUrl);
    const response = await fetch(target);

    if (!response.ok) {
      throw new Error(
        `Could not read uploaded file (HTTP ${response.status}) at ${target.pathname}`,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  async upload(blob: StoredBlob): Promise<string> {
    const form = new FormData();
    form.append(this.field, toBlob(blob), blob.fileName);

    const record = await this.pb.collection(this.collection).create(form);
    const storedName = record[this.field];
    if (typeof storedName !== "string" || storedName.length === 0) {
      throw new Error(
        `Storing the cover returned no "${this.field}" value on the new record`,
      );
    }

    const url = this.pb.client.files.getURL(record, storedName);
    return process.env.DBRAIN_DESKTOP === "1" ? new URL(url).pathname : url;
  }
}
