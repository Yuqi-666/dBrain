import type { TextNodeData } from "./single/text";
import type { ImageNodeData } from "./single/image";
import type { PdfNodeData } from "./single/pdf";
import type { VideoNodeData } from "./single/video";
import type { AudioNodeData } from "./single/audio";
import type { WebpageNodeData } from "./single/webpage";
import type { WebsiteNodeData } from "./single/website";
import type { CollectionNodeData } from "./complex/collection";
import type { RichTextNodeData } from "./complex/rich-text";

export type NodeData = SingleNodeData | ComplexNodeData;

export type SingleNodeData =
  | TextNodeData
  | ImageNodeData
  | PdfNodeData
  | VideoNodeData
  | AudioNodeData
  | WebpageNodeData
  | WebsiteNodeData;

export type ComplexNodeData = CollectionNodeData | RichTextNodeData;

export type { TextNodeData } from "./single/text";
export type { ImageNodeData } from "./single/image";
export type { PdfNodeData } from "./single/pdf";
export type { VideoNodeData, VideoSource } from "./single/video";
export type { AudioNodeData } from "./single/audio";
export type { WebpageNodeData } from "./single/webpage";
export type { WebsiteNodeData } from "./single/website";

export type { CollectionNodeData } from "./complex/collection";

export type { RichTextNodeData, RichTextContent } from "./complex/rich-text";
