import { trpc } from "./provider";
import type { IDomainEvent } from "@workspace/interfaces";
import {
  handleNodeAdded,
  handleNodeUpdated,
  handleNodeDeleted,
  handleEdgeAdded,
  handleEdgeUpdated,
  handleEdgeDeleted,
  handleViewAdded,
  handleViewUpdated,
  handleViewDeleted,
  handleNodeSemanticAdded,
  handleNodeSemanticUpdated,
  handleNodeSemanticDeleted,
  handleEdgeSemanticAdded,
  handleEdgeSemanticUpdated,
  handleEdgeSemanticDeleted,
  handleNodeTagAdded,
  handleNodeTagUpdated,
  handleNodeTagDeleted,
} from "../handler/graph-handler";
import { useAuthStore } from "@workspace/store";

export function useGraphSubscriptions(): void {
  trpc.event.onEvent.useSubscription(undefined, {
    onData: (event: IDomainEvent) => {
      return
      const currentUserId = useAuthStore.getState().getUserId();
      console.log(currentUserId, event.metadata.userId)
      if (currentUserId && event.metadata.userId !== currentUserId) return;

      switch (event.eventType) {
        case "NodeCreated": handleNodeAdded(event); break;
        case "NodeUpdated": handleNodeUpdated(event); break;
        case "NodeDeleted": handleNodeDeleted(event); break;
        case "EdgeCreated": handleEdgeAdded(event); break;
        case "EdgeUpdated": handleEdgeUpdated(event); break;
        case "EdgeDeleted": handleEdgeDeleted(event); break;
        case "ViewCreated": handleViewAdded(event); break;
        case "ViewUpdated": handleViewUpdated(event); break;
        case "ViewDeleted": handleViewDeleted(event); break;
        case "NodeSemanticCreated": handleNodeSemanticAdded(event); break;
        case "NodeSemanticUpdated": handleNodeSemanticUpdated(event); break;
        case "NodeSemanticDeleted": handleNodeSemanticDeleted(event); break;
        case "EdgeSemanticCreated": handleEdgeSemanticAdded(event); break;
        case "EdgeSemanticUpdated": handleEdgeSemanticUpdated(event); break;
        case "EdgeSemanticDeleted": handleEdgeSemanticDeleted(event); break;
        case "NodeTagCreated": handleNodeTagAdded(event); break;
        case "NodeTagUpdated": handleNodeTagUpdated(event); break;
        case "NodeTagDeleted": handleNodeTagDeleted(event); break;
      }
    },
  });
}
