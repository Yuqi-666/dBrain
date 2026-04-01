import type {
  NodeAddedEvent,
  NodeUpdatedEvent,
  NodeDeletedEvent,
  NodeSemanticAddedEvent,
  NodeSemanticUpdatedEvent,
  NodeSemanticEventDeletedEvent,
  EdgeAddedEvent,
  EdgeUpdatedEvent,
  EdgeDeletedEvent,
  EdgeSemanticAddedEvent,
  EdgeSemanticUpdatedEvent,
  EdgeSemanticEventDeletedEvent,
  ViewAddedEvent,
  ViewUpdatedEvent,
  ViewDeletedEvent,
} from "@workspace/interfaces";
import { useGraphStore } from "@workspace/store";

export function handleNodeSemanticAdded(payload: NodeSemanticAddedEvent): void {
  useGraphStore.getState().addNodeSemantic(payload.nodeSemantic);
}

export function handleNodeSemanticUpdated(
  payload: NodeSemanticUpdatedEvent,
): void {
  useGraphStore.getState().updateNodeSemantic(payload.id, payload.updates);
}

export function handleNodeSemanticDeleted(
  payload: NodeSemanticEventDeletedEvent,
): void {
  useGraphStore.getState().deleteNodeSemantic(payload.id);
}

export function handleEdgeSemanticAdded(payload: EdgeSemanticAddedEvent): void {
  useGraphStore.getState().addEdgeSemantic(payload.edgeSemantic);
}

export function handleEdgeSemanticUpdated(
  payload: EdgeSemanticUpdatedEvent,
): void {
  useGraphStore.getState().updateEdgeSemantic(payload.id, payload.updates);
}

export function handleEdgeSemanticDeleted(
  payload: EdgeSemanticEventDeletedEvent,
): void {
  useGraphStore.getState().deleteEdgeSemantic(payload.id);
}

export function handleNodeAdded(payload: NodeAddedEvent): void {
  useGraphStore.getState().addNode(payload.node);
}

export function handleNodeUpdated(payload: NodeUpdatedEvent): void {
  useGraphStore.getState().updateNode(payload.id, payload.updates);
}

export function handleNodeDeleted(payload: NodeDeletedEvent): void {
  useGraphStore.getState().deleteNode(payload.id);
}

export function handleEdgeAdded(payload: EdgeAddedEvent): void {
  useGraphStore.getState().addEdge(payload.edge);
}

export function handleEdgeUpdated(payload: EdgeUpdatedEvent): void {
  useGraphStore.getState().updateEdge(payload.id, payload.updates);
}

export function handleEdgeDeleted(payload: EdgeDeletedEvent): void {
  useGraphStore.getState().deleteEdge(payload.id);
}

export function handleViewAdded(payload: ViewAddedEvent): void {
  useGraphStore.getState().addView(payload.view);
}

export function handleViewUpdated(payload: ViewUpdatedEvent): void {
  useGraphStore.getState().updateView(payload.id, payload.updates);
}

export function handleViewDeleted(payload: ViewDeletedEvent): void {
  useGraphStore.getState().deleteView(payload.id);
}

export function handleWsConnected(payload: {
  connectionId: string;
  timestamp: number;
}): void {
  console.log("WebSocket connected:", payload.connectionId);
}

export function handleWsDisconnected(payload: {
  reason?: string;
  timestamp: number;
}): void {
  console.log("WebSocket disconnected:", payload.reason);
}
