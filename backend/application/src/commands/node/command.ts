export interface CreateTextNodeCommand {
  nodeType: "text";
  id: string;
  title: string;
  abstract?: string;
  permission?: "private" | "public" | "restricted";
  semanticId: string;
  tags?: string[];
  isPinned?: boolean;
  content: { docs: Record<string, any> };
  userId: string;
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
  width: number;
  height: number;
  fileSize: number;
  location?: string;
  shootingTime?: string;
  content: { url: string };
  userId: string;
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
  pageCount: number;
  fileSize: number;
  content: { url: string; coverUrl: string };
  userId: string;
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
  duration: number;
  source: "local" | "online";
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;
  content: { url: string; coverUrl: string };
  userId: string;
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
  duration: number;
  fileSize: number;
  content: { url: string };
  userId: string;
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
  content: { html: string; url: string; screenshotUrl?: string };
  userId: string;
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
  content: { url: string; faviconUrl?: string };
  userId: string;
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
  content: { filterConfig?: any; selectedNodes: string[] };
  userId: string;
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
  content: { referencedNodes: string[]; docs: Record<string, any> };
  userId: string;
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
  | CreateRichTextNodeCommand;

export interface UpdateNodeCommand {
  id: string;
  title?: string;
  abstract?: string;
  tags?: string[];
  permission?: "private" | "public" | "restricted";
  isPinned?: boolean;
  content?: any;
  userId: string;
}

export interface DeleteNodeCommand {
  id: string;
  userId: string;
}