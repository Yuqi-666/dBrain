export interface SyncQuery {
  // Optional filters to limit sync data
  syncNodeSemantics?: boolean;
  syncEdgeSemantics?: boolean;
  syncNodes?: boolean;
  syncEdges?: boolean;
  syncViews?: boolean;
}
