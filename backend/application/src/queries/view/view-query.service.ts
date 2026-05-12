import type { IViewRepository, ViewQuery } from '@workspace/domain';
import { ViewId } from '@workspace/domain';
import type {
  GetViewByIdQuery,
  ListViewsQuery,
  GetViewsByNodeQuery,
  GetPinnedViewsQuery,
} from './query';
import type { ViewDTO } from '../../dto/view.dto';
import type { PaginatedResultDTO } from '../../dto/pagination.dto';
import type { View } from '@workspace/domain';

function toViewDTO(view: View): ViewDTO {
  return {
    id: view.id.toString(),
    name: view.name,
    layout: view.layout.getValue() as ViewDTO['layout'],
    visualConfig: {
      backgroundColor: view.visualConfig.backgroundColor,
      backgroundStyle: view.visualConfig.backgroundStyle,
      gridSpacing: view.visualConfig.gridSpacing,
      gridColor: view.visualConfig.gridColor,
      snapToGrid: view.visualConfig.snapToGrid,
      showMinimap: view.visualConfig.showMinimap,
    },
    filterConfig: view.filterConfig,
    isPinned: view.isPinned,
  };
}

function toViewQuery(q: ListViewsQuery): ViewQuery {
  return {
    isPinned: q.isPinned,
    layout: q.layout as ViewQuery['layout'],
  };
}

export class ViewQueryService {
  constructor(private readonly viewRepository: IViewRepository) {}

  async getById(q: GetViewByIdQuery): Promise<ViewDTO | null> {
    const view = await this.viewRepository.findById(ViewId.create(q.id));
    return view ? toViewDTO(view) : null;
  }

  async list(q: ListViewsQuery): Promise<PaginatedResultDTO<ViewDTO>> {
    const result = await this.viewRepository.findAll(toViewQuery(q), q.page, q.pageSize);
    return {
      items: result.items.map(toViewDTO),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    };
  }

  async getByNodeId(q: GetViewsByNodeQuery): Promise<ViewDTO[]> {
    const views = await this.viewRepository.findByNodeId(q.nodeId as any);
    return views.map(toViewDTO);
  }

  async getPinned(): Promise<ViewDTO[]> {
    const views = await this.viewRepository.findPinned();
    return views.map(toViewDTO);
  }
}