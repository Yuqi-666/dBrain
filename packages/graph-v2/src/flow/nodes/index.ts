/**
 * nodeTypes registry. Defined at module top-level so ReactFlow sees a
 * stable reference across renders (per flow/nodes/design.md §1.3).
 */

import type { CustomNodeComponent } from "./NodeShell";
import { TextNode } from "./text";
import { ImageNode } from "./image";
import { PdfNode } from "./pdf";
import { VideoNode } from "./video";
import { AudioNode } from "./audio";
import { WebpageNode } from "./webpage";
import { WebsiteNode } from "./website";
import { CollectionNode } from "./collection";
import { RichTextNode } from "./rich-text";

export {
  TextNode,
} from "./text";
export {
  ImageNode,
} from "./image";
export {
  PdfNode,
} from "./pdf";
export {
  VideoNode,
} from "./video";
export {
  AudioNode,
} from "./audio";
export {
  WebpageNode,
} from "./webpage";
export {
  WebsiteNode,
} from "./website";
export {
  CollectionNode,
} from "./collection";
export {
  RichTextNode,
} from "./rich-text";
export { NodeShell } from "./NodeShell";
export { NodeErrorBoundary } from "./ErrorBoundary";

export type { CustomNodeProps, CustomNodeComponent } from "./NodeShell";

export const nodeTypes: Record<string, CustomNodeComponent> = {
  "text": TextNode,
  "image": ImageNode,
  "pdf": PdfNode,
  "video": VideoNode,
  "audio": AudioNode,
  "webpage": WebpageNode,
  "website": WebsiteNode,
  "collection": CollectionNode,
  "rich-text": RichTextNode,
} as const;
