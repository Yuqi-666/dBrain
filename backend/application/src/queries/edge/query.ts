import type { PaginationParams } from "../../dto/pagination.dto";

export interface GetEdgeByIdQuery {
  id: string;
}

export interface ListEdgesQuery extends PaginationParams {
  from?: string;
  to?: string;
  semanticId?: string;
  direction?: "forward" | "reverse" | "bidirectional";
  edgeType?: string;
}

export interface GetEdgesByNodeQuery {
  nodeId: string;
}

export interface GetEdgesByEndpointsQuery {
  from: string;
  to: string;
}

export interface GetEdgesByIdsQuery {
  ids: string[];
}