import type { RelationType } from "@workspace/interfaces";

export interface RelationTypesResponse {
  relationTypes: RelationType[];
  total: number;
}

const DEFAULT_RELATION_TYPES: RelationType[] = [
  {
    id: "hierarchy-belongsTo",
    name: "归属于",
    category: "hierarchy",
    description: "子节点归属于父节点",
  },
  {
    id: "hierarchy-contains",
    name: "包含",
    category: "hierarchy",
    description: "父节点包含子节点",
  },
  {
    id: "flow-causes",
    name: "导致",
    category: "flow",
    description: "原因导致结果",
  },
  {
    id: "flow-precedes",
    name: "先于",
    category: "flow",
    description: "前置节点先于后置节点",
  },
  {
    id: "flow-derivesFrom",
    name: "派生自",
    category: "flow",
    description: "结论派生自前提",
  },
  {
    id: "association-references",
    name: "引用",
    category: "association",
    description: "引用相关资源",
  },
  {
    id: "association-relatedTo",
    name: "相关",
    category: "association",
    description: "与其他节点相关",
  },
  {
    id: "association-similarTo",
    name: "相似",
    category: "association",
    description: "与其他节点相似",
  },
  {
    id: "interaction-influences",
    name: "影响",
    category: "interaction",
    description: "对其他节点产生影响",
  },
  {
    id: "interaction-collaborates",
    name: "协作",
    category: "interaction",
    description: "与其他节点协同工作",
  },
  {
    id: "interaction-dependsOn",
    name: "依赖",
    category: "interaction",
    description: "依赖于其他节点",
  },
];

export async function getRelationTypes(): Promise<RelationTypesResponse> {
  return Promise.resolve({
    relationTypes: DEFAULT_RELATION_TYPES,
    total: DEFAULT_RELATION_TYPES.length,
  });
}

export async function getRelationType(
  typeId: string,
): Promise<RelationType | null> {
  const type = DEFAULT_RELATION_TYPES.find((t) => t.id === typeId);
  return Promise.resolve(type ?? null);
}

export async function createRelationType(
  relationType: RelationType,
): Promise<RelationType> {
  const newType = {
    ...relationType,
    id: relationType.id || `relation-${Date.now()}`,
  };
  DEFAULT_RELATION_TYPES.push(newType);
  return Promise.resolve(newType);
}

export async function updateRelationType(
  typeId: string,
  updates: Partial<RelationType>,
): Promise<RelationType> {
  const index = DEFAULT_RELATION_TYPES.findIndex((t) => t.id === typeId);
  if (index === -1) {
    throw new Error("Relation type not found");
  }
  const existing = DEFAULT_RELATION_TYPES[index]!;
  const updated: RelationType = {
    id: typeId,
    name: updates.name ?? existing.name,
    category: updates.category ?? existing.category,
    description: updates.description ?? existing.description,
  };
  DEFAULT_RELATION_TYPES[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteRelationType(typeId: string): Promise<void> {
  const index = DEFAULT_RELATION_TYPES.findIndex((t) => t.id === typeId);
  if (index !== -1) {
    DEFAULT_RELATION_TYPES.splice(index, 1);
  }
  return Promise.resolve();
}
