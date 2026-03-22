import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as edgeSemanticsApi from "../api/semantic-edges";
import type { EdgeSemantic } from "@workspace/interfaces";

export const SEMANTIC_EDGES_KEYS = {
  all: ["edgeSemantics"] as const,
  lists: () => [...SEMANTIC_EDGES_KEYS.all, "list"] as const,
  list: (filters: string) => [...SEMANTIC_EDGES_KEYS.lists(), filters] as const,
  details: () => [...SEMANTIC_EDGES_KEYS.all, "detail"] as const,
  detail: (id: string) => [...SEMANTIC_EDGES_KEYS.details(), id] as const,
};

export function useEdgeSemantics() {
  return useQuery({
    queryKey: SEMANTIC_EDGES_KEYS.lists(),
    queryFn: edgeSemanticsApi.getEdgeSemantics,
  });
}

export function useEdgeSemantic(typeId: string) {
  return useQuery({
    queryKey: SEMANTIC_EDGES_KEYS.detail(typeId),
    queryFn: () => edgeSemanticsApi.getEdgeSemantic(typeId),
    enabled: !!typeId,
  });
}

export function useCreateEdgeSemantic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edgeSemantic: EdgeSemantic) =>
      edgeSemanticsApi.createEdgeSemantic(edgeSemantic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEMANTIC_EDGES_KEYS.lists() });
    },
  });
}

export function useUpdateEdgeSemantic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      updates,
    }: {
      typeId: string;
      updates: Partial<EdgeSemantic>;
    }) => edgeSemanticsApi.updateEdgeSemantic(typeId, updates),
    onSuccess: (_, { typeId }) => {
      queryClient.invalidateQueries({
        queryKey: SEMANTIC_EDGES_KEYS.detail(typeId),
      });
      queryClient.invalidateQueries({ queryKey: SEMANTIC_EDGES_KEYS.lists() });
    },
  });
}

export function useDeleteEdgeSemantic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) => edgeSemanticsApi.deleteEdgeSemantic(typeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEMANTIC_EDGES_KEYS.lists() });
    },
  });
}
