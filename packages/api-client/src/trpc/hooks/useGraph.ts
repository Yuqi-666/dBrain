import { trpc } from "../provider";

export const useAddNode = () => trpc.node.add.useMutation();
export const useUpdateNode = () => trpc.node.update.useMutation();
export const useDeleteNode = () => trpc.node.delete.useMutation();

export const useNodeAdded = (onData: (event: any) => void) => {
  return trpc.node.onAdded.useSubscription(undefined, {
    onData,
  });
};

export const useNodeUpdated = (onData: (event: any) => void) => {
  return trpc.node.onUpdated.useSubscription(undefined, {
    onData,
  });
};

export const useNodeDeleted = (onData: (event: any) => void) => {
  return trpc.node.onDeleted.useSubscription(undefined, {
    onData,
  });
};

// Edge mutations
export const useAddEdge = () => trpc.edge.add.useMutation();
export const useUpdateEdge = () => trpc.edge.update.useMutation();
export const useDeleteEdge = () => trpc.edge.delete.useMutation();

// Edge subscriptions
export const useEdgeAdded = (onData: (event: any) => void) => {
  return trpc.edge.onAdded.useSubscription(undefined, {
    onData,
  });
};

export const useEdgeUpdated = (onData: (event: any) => void) => {
  return trpc.edge.onUpdated.useSubscription(undefined, {
    onData,
  });
};

export const useEdgeDeleted = (onData: (event: any) => void) => {
  return trpc.edge.onDeleted.useSubscription(undefined, {
    onData,
  });
};

export const useAddNodeSemantic = () => trpc.nodeSemantic.add.useMutation();
export const useUpdateNodeSemantic = () =>
  trpc.nodeSemantic.update.useMutation();
export const useDeleteNodeSemantic = () =>
  trpc.nodeSemantic.delete.useMutation();

// Node semantic subscriptions
export const useNodeSemanticAdded = (onData: (event: any) => void) => {
  return trpc.nodeSemantic.onAdded.useSubscription(undefined, {
    onData,
  });
};

export const useNodeSemanticUpdated = (onData: (event: any) => void) => {
  return trpc.nodeSemantic.onUpdated.useSubscription(undefined, {
    onData,
  });
};

export const useNodeSemanticDeleted = (onData: (event: any) => void) => {
  return trpc.nodeSemantic.onDeleted.useSubscription(undefined, {
    onData,
  });
};

export const useAddEdgeSemantic = () => trpc.edgeSemantic.add.useMutation();
export const useUpdateEdgeSemantic = () =>
  trpc.edgeSemantic.update.useMutation();
export const useDeleteEdgeSemantic = () =>
  trpc.edgeSemantic.delete.useMutation();

// Edge semantic subscriptions
export const useEdgeSemanticAdded = (onData: (event: any) => void) => {
  return trpc.edgeSemantic.onAdded.useSubscription(undefined, {
    onData,
  });
};

export const useEdgeSemanticUpdated = (onData: (event: any) => void) => {
  return trpc.edgeSemantic.onUpdated.useSubscription(undefined, {
    onData,
  });
};

export const useEdgeSemanticDeleted = (onData: (event: any) => void) => {
  return trpc.edgeSemantic.onDeleted.useSubscription(undefined, {
    onData,
  });
};

export const useAddView = () => trpc.view.add.useMutation();
export const useUpdateView = () => trpc.view.update.useMutation();
export const useDeleteView = () => trpc.view.delete.useMutation();

// View subscriptions
export const useViewAdded = (onData: (event: any) => void) => {
  return trpc.view.onAdded.useSubscription(undefined, {
    onData,
  });
};

export const useViewUpdated = (onData: (event: any) => void) => {
  return trpc.view.onUpdated.useSubscription(undefined, {
    onData,
  });
};

export const useViewDeleted = (onData: (event: any) => void) => {
  return trpc.view.onDeleted.useSubscription(undefined, {
    onData,
  });
};

// NodeTag mutations
export const useAddNodeTag = () => trpc.nodeTag.add.useMutation();
export const useUpdateNodeTag = () => trpc.nodeTag.update.useMutation();
export const useDeleteNodeTag = () => trpc.nodeTag.delete.useMutation();

// NodeTag subscriptions
export const useNodeTagAdded = (onData: (event: any) => void) => {
  return trpc.nodeTag.onAdded.useSubscription(undefined, {
    onData,
  });
};
