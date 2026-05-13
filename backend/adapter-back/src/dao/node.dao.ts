import type {
  INodeRepository,
  NodeQuery,
  PaginatedResult,
} from "@workspace/domain/repositories";
import type { Node } from "@workspace/domain/models";
import type { NodeId } from "@workspace/domain/models/node/value-objects";
import type { NodeSemanticId, NodeTagId } from "@workspace/interfaces/models/node/base";

export class NodeDao {
  constructor(private repository: INodeRepository) {}

  async findByTitle(title: string): Promise<Node[]> {
    const result = await this.repository.findAll({ searchTerm: title });
    return result.items;
  }

  async findBySemanticId(semanticId: NodeSemanticId): Promise<Node[]> {
    const result = await this.repository.findAll({ semanticId });
    return result.items;
  }

  async findByTags(tagIds: NodeTagId[]): Promise<Node[]> {
    if (tagIds.length === 0) {
      return [];
    }
    const result = await this.repository.findAll({ tags: tagIds });
    return result.items;
  }

  async findWithFilters(query: NodeQuery): Promise<PaginatedResult<Node>> {
    return this.repository.findAll(query);
  }

  async findRecentlyCreated(limit: number): Promise<Node[]> {
    const result = await this.repository.findAll({}, 1, limit);
    return result.items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Node[]> {
    const result = await this.repository.findAll({
      createdAfter: startDate,
      createdBefore: endDate,
    });
    return result.items;
  }

  async findByNodeType(
    nodeType: "text" | "image" | "pdf" | "video" | "audio" | "webpage" | "website" | "collection" | "rich-text"
  ): Promise<Node[]> {
    const result = await this.repository.findAll({ nodeType });
    return result.items;
  }

  async batchSave(nodes: Node[]): Promise<Node[]> {
    const results: Node[] = [];
    const errors: Error[] = [];

    for (const node of nodes) {
      try {
        const saved = await this.repository.save(node);
        results.push(saved);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      console.warn(`NodeDao.batchSave: ${errors.length} nodes failed to save`, errors);
    }

    return results;
  }

  async batchUpdateTags(nodeIds: NodeId[], tags: NodeTagId[]): Promise<Node[]> {
    return this.repository.updateTags(nodeIds, tags);
  }

  async batchDelete(nodeIds: NodeId[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of nodeIds) {
      try {
        await this.repository.delete(id);
        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }

  async findPaginated(
    query?: NodeQuery,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Node>> {
    return this.repository.findAll(query, page, pageSize);
  }

  async exists(id: NodeId): Promise<boolean> {
    const node = await this.repository.findById(id);
    return node !== null;
  }

  async count(query?: NodeQuery): Promise<number> {
    return this.repository.count(query);
  }

  async findById(id: NodeId): Promise<Node | null> {
    return this.repository.findById(id);
  }

  async findByIds(ids: NodeId[]): Promise<Node[]> {
    return this.repository.findByIds(ids);
  }
}