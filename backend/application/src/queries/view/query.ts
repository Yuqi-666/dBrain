export interface GetViewByIdQuery {
  id: string;
}

export interface ListViewsQuery {
  isPinned?: boolean;
  layout?: string;
}

export interface GetViewsByNodeQuery {
  nodeId: string;
}

export interface GetPinnedViewsQuery {}