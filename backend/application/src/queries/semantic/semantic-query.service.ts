import type { INodeSemanticRepository, IEdgeSemanticRepository, INodeTagRepository, NodeSemantic, EdgeSemantic, NodeTag } from '@workspace/domain';
import { SemanticId, TagId } from '@workspace/domain';
import type {
  GetNodeSemanticByIdQuery, ListNodeSemanticsQuery, GetNodeSemanticByNameQuery, GetNodeSemanticsByColorQuery,
  GetEdgeSemanticByIdQuery, ListEdgeSemanticsQuery, GetEdgeSemanticByNameQuery, GetEdgeSemanticsByCategoryQuery,
  GetNodeTagByIdQuery, ListNodeTagsQuery, GetNodeTagByNameQuery, GetNodeTagsByIdsQuery
} from './query';
import type { NodeSemanticDTO, EdgeSemanticDTO, NodeTagDTO } from '../../dto/semantic.dto';
import type { EdgeType } from '@workspace/interfaces/models/edge/types';

function toNodeSemanticDTO(entity: NodeSemantic): NodeSemanticDTO {
  return {
    id: entity.id.getValue(),
    name: entity.name,
    description: entity.description,
    color: entity.color,
    icon: entity.icon,
  };
}

function toEdgeSemanticDTO(entity: EdgeSemantic): EdgeSemanticDTO {
  return {
    id: entity.id.getValue(),
    name: entity.name,
    category: entity.category,
    color: entity.color,
    description: entity.description,
  };
}

function toNodeTagDTO(entity: NodeTag): NodeTagDTO {
  return {
    id: entity.id.getValue(),
    name: entity.name,
    color: entity.color,
  };
}

export class SemanticQueryService {
  constructor(
    private readonly nodeSemanticRepository: INodeSemanticRepository,
    private readonly edgeSemanticRepository: IEdgeSemanticRepository,
    private readonly nodeTagRepository: INodeTagRepository,
  ) {}

  async getNodeSemanticById(q: GetNodeSemanticByIdQuery): Promise<NodeSemanticDTO | null> {
    const entity = await this.nodeSemanticRepository.findById(SemanticId.create(q.id));
    return entity ? toNodeSemanticDTO(entity) : null;
  }

  async listNodeSemantics(_q: ListNodeSemanticsQuery): Promise<NodeSemanticDTO[]> {
    const entities = await this.nodeSemanticRepository.findAll();
    return entities.map(toNodeSemanticDTO);
  }

  async getNodeSemanticByName(q: GetNodeSemanticByNameQuery): Promise<NodeSemanticDTO | null> {
    const entity = await this.nodeSemanticRepository.findByName(q.name);
    return entity ? toNodeSemanticDTO(entity) : null;
  }

  async getNodeSemanticsByColor(q: GetNodeSemanticsByColorQuery): Promise<NodeSemanticDTO[]> {
    const entities = await this.nodeSemanticRepository.findByColor(q.color);
    return entities.map(toNodeSemanticDTO);
  }

  async getEdgeSemanticById(q: GetEdgeSemanticByIdQuery): Promise<EdgeSemanticDTO | null> {
    const entity = await this.edgeSemanticRepository.findById(SemanticId.create(q.id));
    return entity ? toEdgeSemanticDTO(entity) : null;
  }

  async listEdgeSemantics(_q: ListEdgeSemanticsQuery): Promise<EdgeSemanticDTO[]> {
    const entities = await this.edgeSemanticRepository.findAll();
    return entities.map(toEdgeSemanticDTO);
  }

  async getEdgeSemanticByName(q: GetEdgeSemanticByNameQuery): Promise<EdgeSemanticDTO | null> {
    const entity = await this.edgeSemanticRepository.findByName(q.name);
    return entity ? toEdgeSemanticDTO(entity) : null;
  }

  async getEdgeSemanticsByCategory(q: GetEdgeSemanticsByCategoryQuery): Promise<EdgeSemanticDTO[]> {
    const entities = await this.edgeSemanticRepository.findByCategory(q.category as EdgeType);
    return entities.map(toEdgeSemanticDTO);
  }

  async getNodeTagById(q: GetNodeTagByIdQuery): Promise<NodeTagDTO | null> {
    const entity = await this.nodeTagRepository.findById(TagId.create(q.id));
    return entity ? toNodeTagDTO(entity) : null;
  }

  async listNodeTags(_q: ListNodeTagsQuery): Promise<NodeTagDTO[]> {
    const entities = await this.nodeTagRepository.findAll();
    return entities.map(toNodeTagDTO);
  }

  async getNodeTagByName(q: GetNodeTagByNameQuery): Promise<NodeTagDTO | null> {
    const entity = await this.nodeTagRepository.findByName(q.name);
    return entity ? toNodeTagDTO(entity) : null;
  }

  async getNodeTagsByIds(q: GetNodeTagsByIdsQuery): Promise<NodeTagDTO[]> {
    const tagIds = q.ids.map(id => TagId.create(id));
    const entities = await this.nodeTagRepository.findByIds(tagIds);
    return entities.map(toNodeTagDTO);
  }
}