import type { INodeRepository, NodeQuery } from '@workspace/domain';
import { NodeId } from '@workspace/domain';
import type {
  GetNodeByIdQuery,
  ListNodesQuery,
  GetNodesByIdsQuery,
  GetPinnedNodesQuery,
  GetRecentlyUpdatedNodesQuery,
} from './query';
import type { NodeDTO } from '../../dto/node.dto';
import type { Node } from '@workspace/domain';

function toNodeDTO(node: Node): NodeDTO {
  const base = {
    id: node.id.toString(),
    title: node.title,
    abstract: node.abstract,
    permission: node.permission.value,
    semanticId: node.semanticId,
    tags: node.tags,
    isPinned: node.isPinned,
    stateData: node.stateData,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };

  const nodeType = node.nodeType.value;

  switch (nodeType) {
    case 'text': {
      const n = node as import('@workspace/domain').TextNode;
      return { ...base, nodeType: 'text', content: { docs: n.content.docs } };
    }
    case 'image': {
      const n = node as import('@workspace/domain').ImageNode;
      return { ...base, nodeType: 'image', width: n.width, height: n.height, fileSize: n.fileSize, location: n.location, shootingTime: n.shootingTime, content: { url: n.content.url } };
    }
    case 'pdf': {
      const n = node as import('@workspace/domain').PdfNode;
      return { ...base, nodeType: 'pdf', pageCount: n.pageCount, fileSize: n.fileSize, content: { url: n.content.url, coverUrl: n.content.coverUrl } };
    }
    case 'video': {
      const n = node as import('@workspace/domain').VideoNode;
      return { ...base, nodeType: 'video', duration: n.duration, source: n.source, sourceUrl: n.sourceUrl, fileSize: n.fileSize, location: n.location, shootingTime: n.shootingTime, content: { url: n.content.url, coverUrl: n.content.coverUrl } };
    }
    case 'audio': {
      const n = node as import('@workspace/domain').AudioNode;
      return { ...base, nodeType: 'audio', duration: n.duration, fileSize: n.fileSize, content: { url: n.content.url } };
    }
    case 'webpage': {
      const n = node as import('@workspace/domain').WebpageNode;
      return { ...base, nodeType: 'webpage', content: { html: n.content.html, url: n.content.url, screenshotUrl: n.content.screenshotUrl } };
    }
    case 'website': {
      const n = node as import('@workspace/domain').WebsiteNode;
      return { ...base, nodeType: 'website', content: { url: n.content.url, faviconUrl: n.content.faviconUrl } };
    }
    case 'collection': {
      const n = node as import('@workspace/domain').CollectionNode;
      return {
        ...base, nodeType: 'collection', content: {
          filterConfig: n.content.filterConfig && {
            selectedNodes: n.content.filterConfig.selectedNodes?.map(nodeId => nodeId.value),
            ruleGroup: n.content.filterConfig.ruleGroup,
            collectionType: n.content.filterConfig.collectionType
          }
        }
      };
    }
    case 'rich-text': {
      const n = node as import('@workspace/domain').RichTextNode;
      return { ...base, nodeType: 'rich-text', content: { referencedNodes: n.content.referencedNodes.map(id => id.toString()), docs: n.content.docs } };
    }
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}

function toNodeQuery(q: ListNodesQuery): NodeQuery {
  return {
    nodeType: q.nodeType as NodeQuery['nodeType'],
    semanticId: q.semanticId,
    tags: q.tags,
    isPinned: q.isPinned,
    searchTerm: q.searchTerm,
    createdAfter: q.createdAfter,
    createdBefore: q.createdBefore,
    updatedAfter: q.updatedAfter,
    updatedBefore: q.updatedBefore,
    permission: q.permission,
  };
}

export class NodeQueryService {
  constructor(private readonly nodeRepository: INodeRepository) { }

  async getById(q: GetNodeByIdQuery): Promise<NodeDTO | null> {
    const node = await this.nodeRepository.findById(new NodeId(q.id));
    return node ? toNodeDTO(node) : null;
  }

  async list(q: ListNodesQuery): Promise<NodeDTO[]> {
    const items = await this.nodeRepository.findAll(toNodeQuery(q));
    return items.map(toNodeDTO)
  }

  async getByIds(q: GetNodesByIdsQuery): Promise<NodeDTO[]> {
    const nodeIds = q.ids.map(id => new NodeId(id));
    const nodes = await this.nodeRepository.findByIds(nodeIds);
    return nodes.map(toNodeDTO);
  }

  async getPinned(): Promise<NodeDTO[]> {
    const nodes = await this.nodeRepository.findPinned();
    return nodes.map(toNodeDTO);
  }

  async getRecentlyUpdated(q: GetRecentlyUpdatedNodesQuery): Promise<NodeDTO[]> {
    const nodes = await this.nodeRepository.findRecentlyUpdated(q.limit);
    return nodes.map(toNodeDTO);
  }
}
