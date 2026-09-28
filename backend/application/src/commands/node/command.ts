import type {
  DataView,
  DatabaseContent,
  FilterConfig,
  NodeStateData,
  WebpageContent,
} from "@workspace/interfaces";

export interface CreateTextNodeCommand {
  nodeType: "text";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  content: { docs: Record<string, any> };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateImageNodeCommand {
  nodeType: "image";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  width: number;
  height: number;
  fileSize: number;
  location?: string;
  shootingTime?: string;
  content: { url: string };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreatePdfNodeCommand {
  nodeType: "pdf";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  pageCount: number;
  fileSize: number;
  content: { url: string; coverUrl: string };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateVideoNodeCommand {
  nodeType: "video";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  duration: number;
  source: "local" | "online";
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;
  content: { url: string; coverUrl: string; hlsUrl?: string };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateAudioNodeCommand {
  nodeType: "audio";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  duration: number;
  fileSize: number;
  content: { url: string };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateWebpageNodeCommand {
  nodeType: "webpage";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  content: WebpageContent;
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateWebsiteNodeCommand {
  nodeType: "website";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  content: { url: string; faviconUrl?: string };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateCollectionNodeCommand {
  nodeType: "collection";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  content: {
    filterConfig?: FilterConfig;
    /** Data views of this collection; absent means "start with none". */
    views?: DataView[];
  };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface CreateRichTextNodeCommand {
  nodeType: "rich-text";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  content: { referencedNodes: string[]; docs: Record<string, any> };
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

/**
 * `content` is the whole table — fields and rows are replaced wholesale, so
 * column/row edits do not need a command of their own (design doc §10).
 */
export interface CreateDatabaseNodeCommand {
  nodeType: "database";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  content: DatabaseContent;
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export type CreateNodeCommand =
  | CreateTextNodeCommand
  | CreateImageNodeCommand
  | CreatePdfNodeCommand
  | CreateVideoNodeCommand
  | CreateAudioNodeCommand
  | CreateWebpageNodeCommand
  | CreateWebsiteNodeCommand
  | CreateCollectionNodeCommand
  | CreateRichTextNodeCommand
  | CreateDatabaseNodeCommand;

export interface UpdateNodeCommand {
  id: string;
  title?: string;
  abstract?: string;
  tags?: string[];
  permission?: "private" | "public" | "restricted";
  semanticId?: string;
  isPinned?: boolean;
  content?: any;
  stateData?: NodeStateData;
  /**
   * File metadata measured by the upload flow (dimensions, duration, page
   * count, …). These are immutable everywhere else in the domain, so they ride
   * along with the update that carries the uploaded url — see
   * `ImageNode.updateFileMeta`. Each media node picks the subset it owns.
   */
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  pageCount?: number;
  source?: "local" | "online";
  sourceUrl?: string;
  location?: string;
  shootingTime?: string;
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface DeleteNodeCommand {
  id: string;
  userId: string;
  sourceId?: string;
}
