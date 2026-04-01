import { SocketClient } from "./socket";
import { EventMessageType } from "@workspace/interfaces";
import {
  handleNodeSemanticAdded,
  handleNodeSemanticUpdated,
  handleNodeSemanticDeleted,
  handleEdgeSemanticAdded,
  handleEdgeSemanticUpdated,
  handleEdgeSemanticDeleted,
  handleNodeAdded,
  handleNodeUpdated,
  handleNodeDeleted,
  handleEdgeAdded,
  handleEdgeUpdated,
  handleEdgeDeleted,
  handleViewAdded,
  handleViewUpdated,
  handleViewDeleted,
  handleWsConnected,
  handleWsDisconnected,
} from "./handler/graph-handler";

export function initializeEventHandlers(): void {
  const socket = SocketClient.getInstance();

  socket.on(
    EventMessageType.REMOTE_NODE_SEMANTIC_ADDED,
    handleNodeSemanticAdded,
  );
  socket.on(
    EventMessageType.REMOTE_NODE_SEMANTIC_UPDATED,
    handleNodeSemanticUpdated,
  );
  socket.on(
    EventMessageType.REMOTE_NODE_SEMANTIC_DELETED,
    handleNodeSemanticDeleted,
  );
  socket.on(
    EventMessageType.REMOTE_EDGE_SEMANTIC_ADDED,
    handleEdgeSemanticAdded,
  );
  socket.on(
    EventMessageType.REMOTE_EDGE_SEMANTIC_UPDATED,
    handleEdgeSemanticUpdated,
  );
  socket.on(
    EventMessageType.REMOTE_EDGE_SEMANTIC_DELETED,
    handleEdgeSemanticDeleted,
  );
  socket.on(EventMessageType.REMOTE_NODE_ADDED, handleNodeAdded);
  socket.on(EventMessageType.REMOTE_NODE_UPDATED, handleNodeUpdated);
  socket.on(EventMessageType.REMOTE_NODE_DELETED, handleNodeDeleted);
  socket.on(EventMessageType.REMOTE_EDGE_ADDED, handleEdgeAdded);
  socket.on(EventMessageType.REMOTE_EDGE_UPDATED, handleEdgeUpdated);
  socket.on(EventMessageType.REMOTE_EDGE_DELETED, handleEdgeDeleted);
  socket.on(EventMessageType.REMOTE_VIEW_ADDED, handleViewAdded);
  socket.on(EventMessageType.REMOTE_VIEW_UPDATED, handleViewUpdated);
  socket.on(EventMessageType.REMOTE_VIEW_DELETED, handleViewDeleted);
  socket.on(EventMessageType.WS_CONNECTED, handleWsConnected);
  socket.on(EventMessageType.WS_DISCONNECTED, handleWsDisconnected);
}
