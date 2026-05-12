import type { PaginationParams } from '../../dto/pagination.dto';

export interface GetViewByIdQuery {
  id: string;
}

export interface ListViewsQuery extends PaginationParams {
  isPinned?: boolean;
  layout?: string;
}

export interface GetViewsByNodeQuery {
  nodeId: string;
}

export interface GetPinnedViewsQuery {}