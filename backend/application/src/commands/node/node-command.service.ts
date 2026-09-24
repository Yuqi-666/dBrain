import {
  TextContent,
  ImageContent,
  PdfContent,
  VideoContent,
  AudioContent,
  WebpageContent,
  WebsiteContent,
  CollectionContent,
  RichTextContent,
} from "@workspace/domain";
import {
  TextNode,
  ImageNode,
  PdfNode,
  VideoNode,
  AudioNode,
  WebpageNode,
  WebsiteNode,
  CollectionNode,
  RichTextNode,
  Node,
} from "@workspace/domain";
import { NodeId, Permission, FilterConfig } from "@workspace/domain";
import type { NodeDTO } from "../../dto/node.dto";
import type { INodeRepository, IEdgeRepository, IEventBus } from "@workspace/domain";
import type { NodeCreated, NodeDeleted, NodeUpdated, EdgeDeleted } from "@workspace/domain";
import type { NodeStateData } from "@workspace/interfaces/models/node/base";
import type {
  CreateNodeCommand,
  UpdateNodeCommand,
  DeleteNodeCommand,
} from "./command";

function toNodeDTO(node: Node): NodeDTO {
  const base = {
    id: node.id.value,
    workspaceId: node.workspaceId,
    title: node.title,
    abstract: node.abstract,
    permission: node.permission.value as "private" | "public" | "restricted",
    semanticId: node.semanticId,
    tags: node.tags,
    isPinned: node.isPinned,
    stateData: node.stateData,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };

  switch (node.nodeType.value) {
    case "text":
      return { ...base, nodeType: "text" as const, content: { docs: (node as TextNode).content.docs } };
    case "image":
      const imgNode = node as ImageNode;
      return { ...base, nodeType: "image" as const, width: imgNode.width, height: imgNode.height, fileSize: imgNode.fileSize, location: imgNode.location, shootingTime: imgNode.shootingTime, content: { url: imgNode.content.url } };
    case "pdf":
      const pdfNode = node as PdfNode;
      return { ...base, nodeType: "pdf" as const, pageCount: pdfNode.pageCount, fileSize: pdfNode.fileSize, content: { url: pdfNode.content.url, coverUrl: pdfNode.content.coverUrl } };
    case "video":
      const vidNode = node as VideoNode;
      return { ...base, nodeType: "video" as const, duration: vidNode.duration, source: vidNode.source, sourceUrl: vidNode.sourceUrl, fileSize: vidNode.fileSize, location: vidNode.location, shootingTime: vidNode.shootingTime, content: { url: vidNode.content.url, coverUrl: vidNode.content.coverUrl } };
    case "audio":
      const audNode = node as AudioNode;
      return { ...base, nodeType: "audio" as const, duration: audNode.duration, fileSize: audNode.fileSize, content: { url: audNode.content.url } };
    case "webpage":
      const webNode = node as WebpageNode;
      return {
        ...base,
        nodeType: "webpage" as const,
        content: {
          code: webNode.content.code,
          language: webNode.content.language,
        },
      };
    case "website":
      const siteNode = node as WebsiteNode;
      return { ...base, nodeType: "website" as const, content: { url: siteNode.content.url, faviconUrl: siteNode.content.faviconUrl } };
    case "collection":
      const colNode = node as CollectionNode;
      return {
        ...base, nodeType: "collection" as const, content: {
          filterConfig: colNode.content.filterConfig && {
            selectedNodes: colNode.content.filterConfig.selectedNodes?.map(nodeId => nodeId.value),
            ruleGroup: colNode.content.filterConfig.ruleGroup,
            collectionType: colNode.content.filterConfig.collectionType
          }
        }
      };
    case "rich-text":
      const rtNode = node as RichTextNode;
      return { ...base, nodeType: "rich-text" as const, content: { referencedNodes: rtNode.content.referencedNodes.map(n => n.value), docs: rtNode.content.docs } };
    default:
      throw new Error(`Unknown node type`);
  }
}

export class NodeCommandService {
  constructor(
    private readonly nodeRepository: INodeRepository,
    private readonly edgeRepository: IEdgeRepository,
    private readonly eventBus: IEventBus,
  ) { }

  async createNode(cmd: CreateNodeCommand): Promise<NodeDTO> {
    if (!cmd.title || cmd.title.trim().length === 0) {
      throw new Error("Node title cannot be empty");
    }

    const id = new NodeId(cmd.id);
    const permission = cmd.permission
      ? new Permission(cmd.permission)
      : Permission.private();

    let node: Node;

    switch (cmd.nodeType) {
      case "text":
        node = TextNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          content: new TextContent(cmd.content.docs),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "image":
        node = ImageNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          width: cmd.width,
          height: cmd.height,
          fileSize: cmd.fileSize,
          location: cmd.location,
          shootingTime: cmd.shootingTime,
          content: new ImageContent(cmd.content.url),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "pdf":
        node = PdfNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          pageCount: cmd.pageCount,
          fileSize: cmd.fileSize,
          content: new PdfContent(cmd.content.url, cmd.content.coverUrl),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "video":
        node = VideoNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          duration: cmd.duration,
          source: cmd.source,
          sourceUrl: cmd.sourceUrl,
          fileSize: cmd.fileSize,
          location: cmd.location,
          shootingTime: cmd.shootingTime,
          content: new VideoContent(cmd.content.url, cmd.content.coverUrl),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "audio":
        node = AudioNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          duration: cmd.duration,
          fileSize: cmd.fileSize,
          content: new AudioContent(cmd.content.url),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "webpage":
        node = WebpageNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          content: new WebpageContent(cmd.content),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "website":
        node = WebsiteNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          content: new WebsiteContent(cmd.content.url, cmd.content.faviconUrl),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "collection":
        node = CollectionNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          content: new CollectionContent(
            FilterConfig.create({
              selectedNodes: cmd.content.filterConfig?.selectedNodes?.map(nodeId => new NodeId(nodeId)) ?? [],
              ruleGroup: cmd.content.filterConfig?.ruleGroup,
              collectionType: cmd.content.filterConfig?.collectionType,
            })
          ),
          workspaceId: cmd.workspaceId,
        });
        break;
      case "rich-text":
        node = RichTextNode.create({
          id,
          title: cmd.title,
          abstract: cmd.abstract,
          permission,
          semanticId: cmd.semanticId,
          tags: cmd.tags ?? [],
          isPinned: cmd.isPinned ?? false,
          stateData: cmd.stateData,
          content: new RichTextContent(
            cmd.content.referencedNodes.map((n: string) => new NodeId(n)),
            cmd.content.docs,
          ),
          workspaceId: cmd.workspaceId,
        });
        break;
      default:
        throw new Error(`Unknown node type`);
    }

    const savedNode = await this.nodeRepository.save(node);

    const event: NodeCreated = {
      eventType: "NodeCreated",
      aggregateId: savedNode.id.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: savedNode.id.value,
      },
    };
    this.eventBus.publish(event);

    return toNodeDTO(savedNode);
  }

  async updateNode(cmd: UpdateNodeCommand): Promise<NodeDTO> {
    const id = new NodeId(cmd.id);
    const existingNode = await this.nodeRepository.findById(id);

    if (!existingNode) {
      throw new Error(`Node with id ${cmd.id} not found`);
    }

    let updatedNode: Node = existingNode;

    if (cmd.title !== undefined) {
      updatedNode = updatedNode.updateTitle(cmd.title);
    }
    if (cmd.abstract !== undefined) {
      updatedNode = updatedNode.updateAbstract(cmd.abstract);
    }
    if (cmd.tags !== undefined) {
      updatedNode = updatedNode.updateTags(cmd.tags as any);
    }
    if (cmd.permission !== undefined) {
      updatedNode = updatedNode.updatePermission(new Permission(cmd.permission));
    }
    if (cmd.semanticId !== undefined) {
      updatedNode = updatedNode.updateSemanticId(cmd.semanticId);
    }
    if (cmd.isPinned !== undefined) {
      updatedNode = cmd.isPinned ? updatedNode.pin() : updatedNode.unpin();
    }
    if (cmd.content !== undefined) {
      updatedNode = this.updateNodeContent(updatedNode, cmd.content);
    }
    if (cmd.stateData !== undefined) {
      updatedNode = updatedNode.updateNodeStateData(cmd.stateData);
    }

    updatedNode = this.updateNodeFileMeta(updatedNode, cmd);

    const savedNode = await this.nodeRepository.save(updatedNode);

    const event: NodeUpdated = {
      eventType: "NodeUpdated",
      aggregateId: savedNode.id.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: savedNode.id.value,
      },
    };
    this.eventBus.publish(event);

    return toNodeDTO(savedNode);
  }

  /**
   * File metadata belongs to a single media node type each, so hand the command
   * to every candidate and let the node decide — same shape as
   * `updateNodeContent`.
   */
  private updateNodeFileMeta(node: Node, cmd: UpdateNodeCommand): Node {
    if (node instanceof ImageNode) {
      return node.updateFileMeta(cmd);
    }
    if (node instanceof PdfNode) {
      return node.updateFileMeta(cmd);
    }
    if (node instanceof VideoNode) {
      return node.updateFileMeta(cmd);
    }
    if (node instanceof AudioNode) {
      return node.updateFileMeta(cmd);
    }
    return node;
  }

  private updateNodeContent(node: Node, content: any): Node {
    if (node instanceof TextNode && content.docs !== undefined) {
      return node.updateContent(new TextContent(content.docs));
    }
    if (node instanceof ImageNode && content.url !== undefined) {
      return node.updateContent(new ImageContent(content.url));
    }
    if (node instanceof PdfNode && content.url !== undefined && content.coverUrl !== undefined) {
      return node.updateContent(new PdfContent(content.url, content.coverUrl));
    }
    if (node instanceof VideoNode && content.url !== undefined && content.coverUrl !== undefined) {
      return node.updateContent(new VideoContent(content.url, content.coverUrl));
    }
    if (node instanceof AudioNode && content.url !== undefined) {
      return node.updateContent(new AudioContent(content.url));
    }
    if (node instanceof WebpageNode) {
      // The editor always writes source and language together; a partial patch
      // keeps the stored half so a language switch cannot blank the source.
      return node.updateContent(
        new WebpageContent({
          code: content.code ?? node.content.code,
          language: content.language ?? node.content.language,
        }),
      );
    }
    if (node instanceof WebsiteNode && content.url !== undefined) {
      return node.updateContent(new WebsiteContent(content.url, content.faviconUrl));
    }
    if (node instanceof CollectionNode && content.filterConfig !== undefined) {
      return node.applyFilter(
        content.filterConfig,
      );
    }
    if (node instanceof RichTextNode && content.referencedNodes !== undefined && content.docs !== undefined) {
      return node.updateContent(
        new RichTextContent(
          content.referencedNodes.map((n: string) => new NodeId(n)),
          content.docs,
        ),
      );
    }
    return node;
  }

  async deleteNode(cmd: DeleteNodeCommand): Promise<void> {
    const id = new NodeId(cmd.id);

    const associatedEdges = await this.edgeRepository.findByNodeId(id);
    if (associatedEdges.length > 0) {
      await this.edgeRepository.deleteMany(associatedEdges.map(e => e.id));
      for (const edge of associatedEdges) {
        const event: EdgeDeleted = {
          eventType: "EdgeDeleted",
          aggregateId: edge.id.getValue(),
          metadata: {
            occurredAt: new Date().toISOString(),
            eventVersion: 1,
            userId: cmd.userId,
            sourceId: cmd.sourceId,
          },
          data: { id: edge.id.getValue() },
        };
        this.eventBus.publish(event);
      }
    }

    await this.nodeRepository.delete(id);

    const event: NodeDeleted = {
      eventType: "NodeDeleted",
      aggregateId: cmd.id,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: { id: cmd.id },
    };
    this.eventBus.publish(event);
  }
}
