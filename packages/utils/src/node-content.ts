/**
 * The "clear the node" action: keep the node, remove the payload.
 *
 * The dialog offers the same choice for every node type that owns one payload,
 * so the shapes live here instead of in the editor or in a node view. A node
 * type without a single payload (`collection`, `database`) is not clearable:
 * silently emptying a table is not the same gesture as emptying a text block,
 * so the caller hides the option when this returns `null`.
 */

/**
 * Largest JSON value PocketBase accepts in the `nodes.content` field.
 *
 * PocketBase caps a JSON field at 1 MiB unless the field sets a size. A web page
 * node keeps its whole HTML source in this field, so the schema raises the cap
 * to this value; `pb_migrations_base/0000000001_base_schema.js` and
 * `pb_migrations_changes/0000000006_node_content_size.js` must both carry it.
 * 24 MiB leaves room for JSON escaping over the default 16 MiB web page file
 * limit, which is the largest source the storage policy reads into a node.
 */
export const NODE_CONTENT_MAX_BYTES = 24 * 1024 * 1024;

/** A rich-text document with no blocks. Shared with the editor's normalizer. */
export function emptyRichTextDocument(): Record<string, unknown> {
  return { type: "doc", content: [] };
}

/**
 * The node updates that clear the node's content, or `null` when the type is
 * not clearable.
 *
 * The merge is a shallow `NodeService.upsert`, so the whole `content` object is
 * replaced. Measurements that belong to the removed payload (size, page count,
 * duration, pixel size) are reset with it; the title, icon, cover, tags, state
 * and edges keep their values, because clearing the content is not deleting the
 * node.
 */
export function clearedNodeUpdates(node: {
  nodeType?: string;
  content?: unknown;
}): Record<string, unknown> | null {
  const content = (node.content ?? {}) as Record<string, unknown>;
  switch (node.nodeType) {
    case "text":
      return { content: { docs: emptyRichTextDocument() } };
    case "rich-text":
      return {
        content: { referencedNodes: [], docs: emptyRichTextDocument() },
      };
    case "webpage":
      return {
        content: {
          code: "",
          language:
            typeof content.language === "string" && content.language
              ? content.language
              : "html",
        },
      };
    case "website":
      return { content: { url: "" } };
    case "image":
      return { content: { url: "" }, width: 0, height: 0, fileSize: 0 };
    case "pdf":
      return { content: { url: "", coverUrl: "" }, pageCount: 0, fileSize: 0 };
    case "video":
      // The timeline is the user's own work, not part of the file payload.
      return {
        content: {
          url: "",
          coverUrl: "",
          hlsUrl: "",
          timestamps:
            Array.isArray(content.timestamps) && content.timestamps.length > 0
              ? content.timestamps
              : undefined,
        },
        duration: 0,
        fileSize: 0,
      };
    case "audio":
      return {
        content: {
          url: "",
          timestamps:
            Array.isArray(content.timestamps) && content.timestamps.length > 0
              ? content.timestamps
              : undefined,
        },
        duration: 0,
        fileSize: 0,
      };
    default:
      return null;
  }
}
