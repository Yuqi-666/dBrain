import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { resolveFileUrl } from "@workspace/api-client";

/**
 * Resolves an attachment `src` to an absolute URL.
 *
 * Uploads now land in PocketBase's `files` collection, so the base origin comes
 * from the shared PocketBase client (`resolveFileUrl`) instead of a hard-coded
 * `localhost:3001`.
 */
export function getFileUrl(src: string): string {
  return resolveFileUrl(src);
}

export async function loadExcalidrawData(src: string): Promise<{
  elements: NonNullable<ExcalidrawInitialDataState["elements"]>;
  files: NonNullable<ExcalidrawInitialDataState["files"]>;
}> {
  const url = getFileUrl(src);
  const request = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!request.ok) {
    throw new Error(
      `Failed to load Excalidraw diagram (${request.status} ${request.statusText})`,
    );
  }

  const { loadFromBlob } = await import("@excalidraw/excalidraw");
  return loadFromBlob(await request.blob(), null, null);
}

export async function getExcalidrawInitialData(src: string | null): Promise<{
  elements: NonNullable<ExcalidrawInitialDataState["elements"]>;
  files: NonNullable<ExcalidrawInitialDataState["files"]>;
} | null> {
  if (!src) {
    return null;
  }

  const data = await loadExcalidrawData(src);
  return { elements: data.elements, files: data.files };
}

export async function exportToExcalidrawJSON(api: ExcalidrawImperativeAPI) {
  return {
    elements: api.getSceneElements(),
    files: api.getFiles(),
  };
}
