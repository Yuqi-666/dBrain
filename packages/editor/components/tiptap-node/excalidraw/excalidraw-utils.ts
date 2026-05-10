import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const FILE_BASE_URL = "http://localhost:3001";

export function getFileUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  return `${FILE_BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

export async function loadExcalidrawData(src: string): Promise<any> {
  const url = getFileUrl(src);
  const request = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  const { loadFromBlob } = await import("@excalidraw/excalidraw");
  return loadFromBlob(await request.blob(), null, null);
}

export async function getExcalidrawInitialData(
  src: string | null,
): Promise<{ elements: any[]; files: any } | null> {
  if (!src) {
    return null;
  }

  const data = await loadExcalidrawData(src);
  return { elements: data.elements, files: data.files };
}

export async function exportToExcalidrawJSON(
  api: ExcalidrawImperativeAPI,
): Promise<{ elements: any[]; files: any }> {
  return {
    elements: api.getSceneElements(),
    files: api.getFiles(),
  };
}
