import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as graphApi from "../api/graph";
import type { NodeData } from "@workspace/interfaces";
import type { EdgeBase } from "@workspace/interfaces";

export const GRAPH_KEYS = {
  all: ["graph"] as const,
  nodes: () => [...GRAPH_KEYS.all, "nodes"] as const,
  node: (id: string) => [...GRAPH_KEYS.nodes(), id] as const,
  edges: () => [...GRAPH_KEYS.all, "edges"] as const,
  edge: (id: string) => [...GRAPH_KEYS.edges(), id] as const,
};

export function useGraph() {
  return useQuery({
    queryKey: GRAPH_KEYS.all,
    queryFn: graphApi.getGraph,
  });
}

export function useNodes() {
  return useQuery({
    queryKey: GRAPH_KEYS.nodes(),
    queryFn: graphApi.getNodes,
  });
}

export function useNode(nodeId: string) {
  return useQuery({
    queryKey: GRAPH_KEYS.node(nodeId),
    queryFn: () => graphApi.getNode(nodeId),
    enabled: !!nodeId,
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (node: NodeData) => graphApi.createNode(node),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.all });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      nodeId,
      updates,
    }: {
      nodeId: string;
      updates: Partial<NodeData>;
    }) => graphApi.updateNode(nodeId, updates),
    onSuccess: (_, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.node(nodeId) });
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.nodes() });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => graphApi.deleteNode(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.all });
    },
  });
}

export function useEdges() {
  return useQuery({
    queryKey: GRAPH_KEYS.edges(),
    queryFn: graphApi.getEdges,
  });
}

export function useEdge(edgeId: string) {
  return useQuery({
    queryKey: GRAPH_KEYS.edge(edgeId),
    queryFn: () => graphApi.getEdge(edgeId),
    enabled: !!edgeId,
  });
}

export function useCreateEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edge: EdgeBase) => graphApi.createEdge(edge),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.all });
    },
  });
}

export function useUpdateEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      edgeId,
      updates,
    }: {
      edgeId: string;
      updates: Partial<EdgeBase>;
    }) => graphApi.updateEdge(edgeId, updates),
    onSuccess: (_, { edgeId }) => {
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.edge(edgeId) });
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.edges() });
    },
  });
}

export function useDeleteEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edgeId: string) => graphApi.deleteEdge(edgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRAPH_KEYS.all });
    },
  });
}
