import type {
  IViewRepository,
  ViewQuery,
  PaginatedResult,
} from "@workspace/domain/repositories";
import type { View, LayoutType } from "@workspace/domain/models";
import { ViewId } from "@workspace/domain/models/view/value-objects";
import type { NodeId } from "@workspace/domain/models/node/value-objects";

export class ViewDao {
  constructor(private repository: IViewRepository) {}

  async findByLayout(layout: LayoutType): Promise<View[]> {
    const result = await this.repository.findAll({ layout: layout.getValue() });
    return result.items;
  }

  async findContainingNodes(nodeIds: NodeId[]): Promise<View[]> {
    if (nodeIds.length === 0) {
      return [];
    }

    const views = await this.repository.findAll({}, 1, 1000);
    const matchingViews: View[] = [];

    for (const view of views.items) {
      const config = view.filterConfig;
      const selectedNodes = config.selectedNodes;
      if (selectedNodes && selectedNodes.length > 0) {
        const hasMatchingNode = nodeIds.some((nodeId) =>
          selectedNodes.some((selected) => selected === nodeId.value)
        );
        if (hasMatchingNode) {
          matchingViews.push(view);
        }
      }
    }

    return matchingViews;
  }

  async findPinned(): Promise<View[]> {
    return this.repository.findPinned();
  }

  async findByNodeId(nodeId: NodeId): Promise<View[]> {
    return this.repository.findByNodeId(nodeId);
  }

  async findWithFilters(query: ViewQuery): Promise<PaginatedResult<View>> {
    return this.repository.findAll(query);
  }

  async findPaginated(
    query?: ViewQuery,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<View>> {
    return this.repository.findAll(query, page, pageSize);
  }

  async batchSave(views: View[]): Promise<{ saved: View[]; failed: number }> {
    const saved: View[] = [];
    let failed = 0;

    for (const view of views) {
      try {
        const result = await this.repository.save(view);
        saved.push(result);
      } catch {
        failed++;
      }
    }

    return { saved, failed };
  }

  async batchDelete(viewIds: ViewId[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of viewIds) {
      try {
        await this.repository.delete(id);
        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }

  async findById(id: ViewId): Promise<View | null> {
    return this.repository.findById(id);
  }

  async count(query?: ViewQuery): Promise<number> {
    return this.repository.count(query);
  }

  async exists(id: ViewId): Promise<boolean> {
    const view = await this.repository.findById(id);
    return view !== null;
  }

  async getNodeCount(viewId: ViewId): Promise<number> {
    const view = await this.repository.findById(viewId);
    if (!view) {
      return 0;
    }
    return view.filterConfig.selectedNodes?.length ?? 0;
  }

  async pinView(viewId: ViewId): Promise<View | null> {
    const view = await this.repository.findById(viewId);
    if (!view) {
      return null;
    }
    const pinned = view.pin();
    return this.repository.save(pinned);
  }

  async unpinView(viewId: ViewId): Promise<View | null> {
    const view = await this.repository.findById(viewId);
    if (!view) {
      return null;
    }
    const unpinned = view.unpin();
    return this.repository.save(unpinned);
  }
}