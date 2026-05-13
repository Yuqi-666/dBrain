import type { RecordModel } from "pocketbase";
import type { RuleGroupType } from "@workspace/utils";

import {
  NodeId,
  Permission,
  TextContent,
  ImageContent,
  PdfContent,
  VideoContent,
  AudioContent,
  WebpageContent,
  WebsiteContent,
  CollectionContent,
  RichTextContent,
} from "@workspace/domain/models/node/value-objects";

import {
  Node,
  TextNode,
  ImageNode,
  PdfNode,
  VideoNode,
  AudioNode,
  WebpageNode,
  WebsiteNode,
  CollectionNode,
  RichTextNode,
} from "@workspace/domain/models/node/entities";

interface BaseNodeRecord {
  id: string;
  title: string;
  abstract?: string;
  permission: "private" | "public" | "restricted";
  semanticId: string;
  tags: string[];
  isPinned: boolean;
  stateData?: Record<string, unknown>;
  created: string;
  updated: string;
  nodeType: string;
}

interface TextNodeRecord extends BaseNodeRecord {
  nodeType: "text";
  content: Record<string, unknown>;
}

interface ImageNodeRecord extends BaseNodeRecord {
  nodeType: "image";
  content: string;
  width: number;
  height: number;
  fileSize: number;
  location?: string;
  shootingTime?: string;
}

interface PdfNodeRecord extends BaseNodeRecord {
  nodeType: "pdf";
  content: string;
  coverUrl: string;
  pageCount: number;
  fileSize: number;
}

interface VideoNodeRecord extends BaseNodeRecord {
  nodeType: "video";
  content: string;
  coverUrl: string;
  duration: number;
  source: "local" | "online";
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;
}

interface AudioNodeRecord extends BaseNodeRecord {
  nodeType: "audio";
  content: string;
  duration: number;
  fileSize: number;
}

interface WebpageNodeRecord extends BaseNodeRecord {
  nodeType: "webpage";
  content: string;
  url: string;
  screenshotUrl?: string;
}

interface WebsiteNodeRecord extends BaseNodeRecord {
  nodeType: "website";
  content: string;
  faviconUrl?: string;
}

interface CollectionNodeRecord extends BaseNodeRecord {
  nodeType: "collection";
  filterConfig?: RuleGroupType;
  selectedNodes: string[];
}

interface RichTextNodeRecord extends BaseNodeRecord {
  nodeType: "rich-text";
  referencedNodes: string[];
  docs: Record<string, unknown>;
}

const VALID_NODE_TYPES = [
  "text",
  "image",
  "pdf",
  "video",
  "audio",
  "webpage",
  "website",
  "collection",
  "rich-text",
] as const;

type ValidNodeType = (typeof VALID_NODE_TYPES)[number];

function isValidNodeType(type: string): type is ValidNodeType {
  return VALID_NODE_TYPES.includes(type as ValidNodeType);
}

export class NodeMapper {
  toDomain(record: RecordModel): Node {
    const nodeType = record.nodeType as string;

    if (!isValidNodeType(nodeType)) {
      throw new Error(`Invalid node type: ${nodeType}`);
    }

    const baseProps = {
      id: new NodeId(record.id),
      title: record.title,
      abstract: record.abstract || undefined,
      permission: new Permission(record.permission as "private" | "public" | "restricted"),
      semanticId: record.semanticId as string,
      tags: (record.tags as string[]) || [],
      isPinned: record.isPinned as boolean,
      stateData: record.stateData as Record<string, unknown> | undefined,
      createdAt: record.created as string,
      updatedAt: record.updated as string,
    };

    switch (nodeType) {
      case "text":
        return this.mapTextNode(record as unknown as TextNodeRecord, baseProps);
      case "image":
        return this.mapImageNode(record as unknown as ImageNodeRecord, baseProps);
      case "pdf":
        return this.mapPdfNode(record as unknown as PdfNodeRecord, baseProps);
      case "video":
        return this.mapVideoNode(record as unknown as VideoNodeRecord, baseProps);
      case "audio":
        return this.mapAudioNode(record as unknown as AudioNodeRecord, baseProps);
      case "webpage":
        return this.mapWebpageNode(record as unknown as WebpageNodeRecord, baseProps);
      case "website":
        return this.mapWebsiteNode(record as unknown as WebsiteNodeRecord, baseProps);
      case "collection":
        return this.mapCollectionNode(record as unknown as CollectionNodeRecord, baseProps);
      case "rich-text":
        return this.mapRichTextNode(record as unknown as RichTextNodeRecord, baseProps);
      default:
        throw new Error(`Unhandled node type: ${nodeType}`);
    }
  }

  private mapTextNode(record: TextNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): TextNode {
    return TextNode.create({
      ...baseProps,
      content: new TextContent(record.content || {}),
    });
  }

  private mapImageNode(record: ImageNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): ImageNode {
    return ImageNode.create({
      ...baseProps,
      width: record.width || 0,
      height: record.height || 0,
      fileSize: record.fileSize || 0,
      location: record.location,
      shootingTime: record.shootingTime,
      content: new ImageContent(record.content || ""),
    });
  }

  private mapPdfNode(record: PdfNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): PdfNode {
    return PdfNode.create({
      ...baseProps,
      pageCount: record.pageCount || 0,
      fileSize: record.fileSize || 0,
      content: new PdfContent(record.content || "", record.coverUrl || ""),
    });
  }

  private mapVideoNode(record: VideoNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): VideoNode {
    return VideoNode.create({
      ...baseProps,
      duration: record.duration || 0,
      source: record.source || "online",
      sourceUrl: record.sourceUrl,
      fileSize: record.fileSize,
      location: record.location,
      shootingTime: record.shootingTime,
      content: new VideoContent(record.content || "", record.coverUrl || ""),
    });
  }

  private mapAudioNode(record: AudioNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): AudioNode {
    return AudioNode.create({
      ...baseProps,
      duration: record.duration || 0,
      fileSize: record.fileSize || 0,
      content: new AudioContent(record.content || ""),
    });
  }

  private mapWebpageNode(record: WebpageNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): WebpageNode {
    return WebpageNode.create({
      ...baseProps,
      content: new WebpageContent(
        record.content || "",
        record.url || "",
        record.screenshotUrl,
      ),
    });
  }

  private mapWebsiteNode(record: WebsiteNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): WebsiteNode {
    return WebsiteNode.create({
      ...baseProps,
      content: new WebsiteContent(record.content || "", record.faviconUrl),
    });
  }

  private mapCollectionNode(record: CollectionNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): CollectionNode {
    const selectedNodes = (record.selectedNodes || []).map((id) => new NodeId(id));
    return CollectionNode.create({
      ...baseProps,
      content: new CollectionContent(record.filterConfig, selectedNodes),
    });
  }

  private mapRichTextNode(record: RichTextNodeRecord, baseProps: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: string;
    tags: string[];
    isPinned: boolean;
    stateData?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): RichTextNode {
    const referencedNodes = (record.referencedNodes || []).map((id) => new NodeId(id));
    return RichTextNode.create({
      ...baseProps,
      content: new RichTextContent(referencedNodes, record.docs || {}),
    });
  }

  toRecord(node: Node): Partial<RecordModel> {
    const baseRecord: Partial<RecordModel> = {
      id: node.id.value,
      title: node.title,
      abstract: node.abstract,
      permission: node.permission.value,
      semanticId: node.semanticId,
      tags: node.tags,
      isPinned: node.isPinned,
      stateData: node.stateData,
      created: node.createdAt,
      updated: node.updatedAt,
      nodeType: node.nodeType.value,
    };

    if (node instanceof TextNode) {
      return {
        ...baseRecord,
        content: node.content.docs,
      };
    }

    if (node instanceof ImageNode) {
      return {
        ...baseRecord,
        content: node.content.url,
        width: node.width,
        height: node.height,
        fileSize: node.fileSize,
        location: node.location,
        shootingTime: node.shootingTime,
      };
    }

    if (node instanceof PdfNode) {
      return {
        ...baseRecord,
        content: node.content.url,
        coverUrl: node.content.coverUrl,
        pageCount: node.pageCount,
        fileSize: node.fileSize,
      };
    }

    if (node instanceof VideoNode) {
      return {
        ...baseRecord,
        content: node.content.url,
        coverUrl: node.content.coverUrl,
        duration: node.duration,
        source: node.source,
        sourceUrl: node.sourceUrl,
        fileSize: node.fileSize,
        location: node.location,
        shootingTime: node.shootingTime,
      };
    }

    if (node instanceof AudioNode) {
      return {
        ...baseRecord,
        content: node.content.url,
        duration: node.duration,
        fileSize: node.fileSize,
      };
    }

    if (node instanceof WebpageNode) {
      return {
        ...baseRecord,
        content: node.content.html,
        url: node.content.url,
        screenshotUrl: node.content.screenshotUrl,
      };
    }

    if (node instanceof WebsiteNode) {
      return {
        ...baseRecord,
        content: node.content.url,
        faviconUrl: node.content.faviconUrl,
      };
    }

    if (node instanceof CollectionNode) {
      return {
        ...baseRecord,
        filterConfig: node.content.filterConfig,
        selectedNodes: node.content.selectedNodes.map((n) => n.value),
      };
    }

    if (node instanceof RichTextNode) {
      return {
        ...baseRecord,
        referencedNodes: node.content.referencedNodes.map((n) => n.value),
        docs: node.content.docs,
      };
    }

    throw new Error(`Unknown node type: ${node.constructor.name}`);
  }
}