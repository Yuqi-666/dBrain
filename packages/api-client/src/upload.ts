import type { IAttachment } from "@workspace/interfaces";

export async function uploadFile(
  file: File,
  signal?: AbortSignal,
): Promise<IAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:3001/api/attachment/upload", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json() as Promise<IAttachment>;
}
