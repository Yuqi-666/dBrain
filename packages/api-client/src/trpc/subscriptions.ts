import {
  useNodeAdded,
  useNodeUpdated,
  useNodeDeleted,
  useEdgeAdded,
  useEdgeUpdated,
  useEdgeDeleted,
  useNodeSemanticAdded,
  useNodeSemanticUpdated,
  useNodeSemanticDeleted,
  useEdgeSemanticAdded,
  useEdgeSemanticUpdated,
  useEdgeSemanticDeleted,
  useViewAdded,
  useViewUpdated,
  useViewDeleted,
} from './hooks/useGraph';
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
} from '../handler/graph-handler';

/**
 * React hook that sets up all tRPC subscriptions to handle server push events.
 * This replaces the Socket.io-based event dispatcher.
 *
 * Call this hook in your root component or a provider to enable real-time updates.
 */
export function useGraphSubscriptions(): void {
  useNodeSemanticAdded(handleNodeSemanticAdded);
  useNodeSemanticUpdated(handleNodeSemanticUpdated);
  useNodeSemanticDeleted(handleNodeSemanticDeleted);

  useEdgeSemanticAdded(handleEdgeSemanticAdded);
  useEdgeSemanticUpdated(handleEdgeSemanticUpdated);
  useEdgeSemanticDeleted(handleEdgeSemanticDeleted);

  useNodeAdded(handleNodeAdded);
  useNodeUpdated(handleNodeUpdated);
  useNodeDeleted(handleNodeDeleted);

  useEdgeAdded(handleEdgeAdded);
  useEdgeUpdated(handleEdgeUpdated);
  useEdgeDeleted(handleEdgeDeleted);

  useViewAdded(handleViewAdded);
  useViewUpdated(handleViewUpdated);
  useViewDeleted(handleViewDeleted);
}
