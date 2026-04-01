/**
 * Query Message Types
 * Query operations return data with payload (see responses.ts)
 */

export enum QueryMessageType {
  SYNC = "SYNC",
}

/**
// kfj
// * Query Request Interfaces
 */

export interface SyncQuery {
  // Optional filters to limit sync data
  syncNodeSemantics?: boolean;
  syncEdgeSemantics?: boolean;
  syncNodes?: boolean;
  syncEdges?: boolean;
  syncViews?: boolean;
}

/**
 * Client -> Server Query Message Union
 * Queries return responses with data payload
 */
export type QueryMessage = {
  type: QueryMessageType.SYNC;
  requestId: string;
  payload: SyncQuery;
};
