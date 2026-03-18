import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as semanticTypesApi from "../api/semantic-types";
import type { SemanticType } from "../api/semantic-types";

export const SEMANTIC_TYPES_KEYS = {
  all: ["semanticTypes"] as const,
  lists: () => [...SEMANTIC_TYPES_KEYS.all, "list"] as const,
  list: (filters: string) => [...SEMANTIC_TYPES_KEYS.lists(), filters] as const,
  details: () => [...SEMANTIC_TYPES_KEYS.all, "detail"] as const,
  detail: (id: string) => [...SEMANTIC_TYPES_KEYS.details(), id] as const,
};

export function useSemanticTypes() {
  return useQuery({
    queryKey: SEMANTIC_TYPES_KEYS.lists(),
    queryFn: semanticTypesApi.getSemanticTypes,
  });
}

export function useSemanticType(typeId: string) {
  return useQuery({
    queryKey: SEMANTIC_TYPES_KEYS.detail(typeId),
    queryFn: () => semanticTypesApi.getSemanticType(typeId),
    enabled: !!typeId,
  });
}

export function useCreateSemanticType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (semanticType: SemanticType) =>
      semanticTypesApi.createSemanticType(semanticType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEMANTIC_TYPES_KEYS.lists() });
    },
  });
}

export function useUpdateSemanticType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      updates,
    }: {
      typeId: string;
      updates: Partial<SemanticType>;
    }) => semanticTypesApi.updateSemanticType(typeId, updates),
    onSuccess: (_, { typeId }) => {
      queryClient.invalidateQueries({
        queryKey: SEMANTIC_TYPES_KEYS.detail(typeId),
      });
      queryClient.invalidateQueries({ queryKey: SEMANTIC_TYPES_KEYS.lists() });
    },
  });
}

export function useDeleteSemanticType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) => semanticTypesApi.deleteSemanticType(typeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEMANTIC_TYPES_KEYS.lists() });
    },
  });
}
