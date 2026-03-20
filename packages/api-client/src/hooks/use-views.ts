import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as viewsApi from "../api/views";
import type { View } from "@workspace/interfaces";

export const VIEWS_KEYS = {
  all: ["views"] as const,
  lists: () => [...VIEWS_KEYS.all, "list"] as const,
  list: (filters: string) => [...VIEWS_KEYS.lists(), filters] as const,
  details: () => [...VIEWS_KEYS.all, "detail"] as const,
  detail: (id: string) => [...VIEWS_KEYS.details(), id] as const,
};

export function useViews() {
  return useQuery({
    queryKey: VIEWS_KEYS.lists(),
    queryFn: viewsApi.getViews,
  });
}

export function useView(viewId: string) {
  return useQuery({
    queryKey: VIEWS_KEYS.detail(viewId),
    queryFn: () => viewsApi.getView(viewId),
    enabled: !!viewId,
  });
}

export function useCreateView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (view: View) => viewsApi.createView(view),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIEWS_KEYS.lists() });
    },
  });
}

export function useUpdateView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      viewId,
      updates,
    }: {
      viewId: string;
      updates: Partial<View>;
    }) => viewsApi.updateView(viewId, updates),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: VIEWS_KEYS.detail(viewId) });
      queryClient.invalidateQueries({ queryKey: VIEWS_KEYS.lists() });
    },
  });
}

export function useDeleteView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) => viewsApi.deleteView(viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIEWS_KEYS.lists() });
    },
  });
}
