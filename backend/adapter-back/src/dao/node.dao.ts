import type {
  INodeRepository,
  NodeQuery,
} from "@workspace/domain/repositories";
import type { Node } from "@workspace/domain/models";
import type { NodeId } from "@workspace/domain/models/node/value-objects";
import type { NodeSemanticId, NodeTagId } from "@workspace/interfaces/models/node/base";

export class NodeDao {
  constructor(private repository: INodeRepository) {}

  async findByTitle(title: string): Promise<Node[]> {
    return this.repository.findAll({ searchTerm: title });
  }

  async findBySemanticId(semanticId: NodeSemanticId): Promise<Node[]> {
    return this.repository.findAll({ semanticId });
  }

  async findByTags(tagIds: NodeTagId[]): Promise<Node[]> {
    if (tagIds.length === 0) {
      return [];
    }
    return this.repository.findAll({ tags: tagIds });
  }

  async findWithFilters(query: NodeQuery): Promise<Node[]> {
    return this.repository.findAll(query);
  }

  async findRecentlyCreated(limit: number): Promise<Node[]> {
    const allNodes = await this.repository.findAll({});
    return allNodes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Node[]> {
    return this.repository.findAll({
      createdAfter: startDate,
      createdBefore: endDate,
    });
  }

  async findByNodeType(
    nodeType: "text" | "image" | "pdf" | "video" | "audio" | "webpage" | "website" | "collection" | "rich-text"
  ): Promise<Node[]> {
    return this.repository.findAll({ nodeType });
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
  ): Promise<{ items: Node[]; total: number }> {
    const items = await this.repository.findAll(query);
    return {
      items,
      total: items.length,
    };
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