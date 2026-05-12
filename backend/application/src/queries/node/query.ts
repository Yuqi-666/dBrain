import type { PaginationParams } from '../../dto/pagination.dto';

export interface GetNodeByIdQuery {
  id: string;
}

export interface ListNodesQuery extends PaginationParams {
  nodeType?: string;
  semanticId?: string;
  tags?: string[];
  isPinned?: boolean;
  searchTerm?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  permission?: 'private' | 'public' | 'restricted';
}

export interface GetNodesByIdsQuery {
  ids: string[];
}

export interface GetPinnedNodesQuery {}

export interface GetRecentlyUpdatedNodesQuery {
  limit: number;
}