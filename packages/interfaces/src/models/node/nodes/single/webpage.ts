import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface WebpageNodeData extends NodeBase, NodeType<"webpage"> {
  content: WebpageContent;
}

/**
 * The one representation a webpage node holds: its source.
 *
 * There is no initialization mode to distinguish — the node stores the page's
 * text and nothing else. HTML and code share the single `code` field, and
 * `language` is what decides how it is read: `"html"` renders it as a page,
 * anything else shows it as source. A live address belongs to a `website`
 * node, and a screenshot is just an uploaded `image`.
 */
export interface WebpageContent {
  /**
   * Page source. HTML for a captured page, any other language for code.
   * Importing a file initializes it; otherwise the user edits it directly,
   * which is why HTML and code share this one field.
   */
  code: string;
  /** Language id used by the source editor / highlighter, e.g. `"html"`. */
  language: string;
}
