/** `/api/files/<collection>/<record>/<filename>` — nothing else is allowed. */
const FILE_PATH_PATTERN = /^\/api\/files\/[A-Za-z0-9_]+\/[A-Za-z0-9]+\/[^/]+$/;

export function toFileEndpointPath(fileUrl: string): string {
  let pathname: string;
  try {
    pathname = new URL(fileUrl, "http://pocketbase.invalid").pathname;
  } catch {
    throw new Error(`Not a usable file address: ${fileUrl}`);
  }

  pathname = pathname.replace(/^\/pb(?=\/api\/files\/)/, "").replace(/^\/session\/[a-f0-9]+(?=\/api\/files\/)/, "");
  if (!FILE_PATH_PATTERN.test(pathname)) {
    throw new Error(`Refusing to fetch a non file-store address: ${fileUrl}`);
  }
  return pathname;
}
