import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as relationTypesApi from "../api/relation-types";
import type { RelationType } from "../api/relation-types";

export const RELATION_TYPES_KEYS = {
  all: ["relationTypes"] as const,
  lists: () => [...RELATION_TYPES_KEYS.all, "list"] as const,
  list: (filters: string) => [...RELATION_TYPES_KEYS.lists(), filters] as const,
  details: () => [...RELATION_TYPES_KEYS.all, "detail"] as const,
  detail: (id: string) => [...RELATION_TYPES_KEYS.details(), id] as const,
};

export function useRelationTypes() {
  return useQuery({
    queryKey: RELATION_TYPES_KEYS.lists(),
    queryFn: relationTypesApi.getRelationTypes,
  });
}

export function useRelationType(typeId: string) {
  return useQuery({
    queryKey: RELATION_TYPES_KEYS.detail(typeId),
    queryFn: () => relationTypesApi.getRelationType(typeId),
    enabled: !!typeId,
  });
}

export function useCreateRelationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relationType: RelationType) =>
      relationTypesApi.createRelationType(relationType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATION_TYPES_KEYS.lists() });
    },
  });
}

export function useUpdateRelationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      updates,
    }: {
      typeId: string;
      updates: Partial<RelationType>;
    }) => relationTypesApi.updateRelationType(typeId, updates),
    onSuccess: (_, { typeId }) => {
      queryClient.invalidateQueries({
        queryKey: RELATION_TYPES_KEYS.detail(typeId),
      });
      queryClient.invalidateQueries({ queryKey: RELATION_TYPES_KEYS.lists() });
    },
  });
}

export function useDeleteRelationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) => relationTypesApi.deleteRelationType(typeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RELATION_TYPES_KEYS.lists() });
    },
  });
}
