import type { FilterConfig } from "@workspace/interfaces/models/filter";
import type { NodeStateData } from "@workspace/interfaces/models/node/base";
import type { WebpageContent } from "@workspace/interfaces/models/node/nodes/single/webpage";

export interface BaseNodeDTO {
  id: string;
  workspaceId?: string;
  title: string;
  abstract?: string;
  permission: "private" | "public" | "restricted";
  semanticId: string;
  tags: string[];
  isPinned: boolean;
  stateData?: NodeStateData;
  createdAt: string;
  updatedAt: string;
}

export interface TextNodeDTO extends BaseNodeDTO {
  nodeType: "text";
  content: { docs: Record<string, any> };
}

export interface ImageNodeDTO extends BaseNodeDTO {
  nodeType: "image";
  width: number;
  height: number;
  fileSize: number;
  location?: string;
  shootingTime?: string;
  content: { url: string };
}

export interface PdfNodeDTO extends BaseNodeDTO {
  nodeType: "pdf";
  pageCount: number;
  fileSize: number;
  content: { url: string; coverUrl: string };
}

export interface VideoNodeDTO extends BaseNodeDTO {
  nodeType: "video";
  duration: number;
  source: "local" | "online";
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;
  content: { url: string; coverUrl: string; hlsUrl?: string };
}

export interface AudioNodeDTO extends BaseNodeDTO {
  nodeType: "audio";
  duration: number;
  fileSize: number;
  content: { url: string };
}

export interface WebpageNodeDTO extends BaseNodeDTO {
  nodeType: "webpage";
  content: WebpageContent;
}

export interface WebsiteNodeDTO extends BaseNodeDTO {
  nodeType: "website";
  content: { url: string; faviconUrl?: string };
}

export interface CollectionNodeDTO extends BaseNodeDTO {
  nodeType: "collection";
  content: {
    filterConfig?: FilterConfig
  };
}

export interface RichTextNodeDTO extends BaseNodeDTO {
  nodeType: "rich-text";
  content: {
    referencedNodes: string[];
    docs: Record<string, any>;
  };
}

export type NodeDTO =
  | TextNodeDTO
  | ImageNodeDTO
  | PdfNodeDTO
  | VideoNodeDTO
  | AudioNodeDTO
  | WebpageNodeDTO
  | WebsiteNodeDTO
  | CollectionNodeDTO
  | RichTextNodeDTO;
