import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as nodeSemanticsApi from "../api/semantic-nodes";
import type { NodeSemantic } from "@workspace/interfaces";

export const SEMANTIC_NODES_KEYS = {
  all: ["nodeSemantics"] as const,
  lists: () => [...SEMANTIC_NODES_KEYS.all, "list"] as const,
  list: (filters: string) => [...SEMANTIC_NODES_KEYS.lists(), filters] as const,
  details: () => [...SEMANTIC_NODES_KEYS.all, "detail"] as const,
  detail: (id: string) => [...SEMANTIC_NODES_KEYS.details(), id] as const,
};

export function useNodeSemantics() {
  return useQuery({
    queryKey: SEMANTIC_NODES_KEYS.lists(),
    queryFn: nodeSemanticsApi.getNodeSemantics,
  });
}

export function useNodeSemantic(typeId: string) {
  return useQuery({
    queryKey: SEMANTIC_NODES_KEYS.detail(typeId),
    queryFn: () => nodeSemanticsApi.getNodeSemantic(typeId),
    enabled: !!typeId,
  });
}

export function useCreateNodeSemantic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeSemantic: NodeSemantic) =>
      nodeSemanticsApi.createNodeSemantic(nodeSemantic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEMANTIC_NODES_KEYS.lists() });
    },
  });
}

export function useUpdateNodeSemantic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      updates,
    }: {
      typeId: string;
      updates: Partial<NodeSemantic>;
    }) => nodeSemanticsApi.updateNodeSemantic(typeId, updates),
    onSuccess: (_, { typeId }) => {
      queryClient.invalidateQueries({
        queryKey: SEMANTIC_NODES_KEYS.detail(typeId),
      });
      queryClient.invalidateQueries({ queryKey: SEMANTIC_NODES_KEYS.lists() });
    },
  });
}

export function useDeleteNodeSemantic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) => nodeSemanticsApi.deleteNodeSemantic(typeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEMANTIC_NODES_KEYS.lists() });
    },
  });
}
