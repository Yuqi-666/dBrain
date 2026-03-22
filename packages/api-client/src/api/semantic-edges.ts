import type { EdgeSemantic } from "@workspace/interfaces";

export interface EdgeSemanticResponse {
  edgeSemantics: EdgeSemantic[];
  total: number;
}

const DEFAULT_EDGE_SEMANTICS: EdgeSemantic[] = [
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

export async function getEdgeSemantics(): Promise<EdgeSemanticResponse> {
  return Promise.resolve({
    edgeSemantics: DEFAULT_EDGE_SEMANTICS,
    total: DEFAULT_EDGE_SEMANTICS.length,
  });
}

export async function getEdgeSemantic(
  typeId: string,
): Promise<EdgeSemantic | null> {
  const type = DEFAULT_EDGE_SEMANTICS.find((t) => t.id === typeId);
  return Promise.resolve(type ?? null);
}

export async function createEdgeSemantic(
  edgeSemantic: EdgeSemantic,
): Promise<EdgeSemantic> {
  const newType = {
    ...edgeSemantic,
    id: edgeSemantic.id || `relation-${Date.now()}`,
  };
  DEFAULT_EDGE_SEMANTICS.push(newType);
  return Promise.resolve(newType);
}

export async function updateEdgeSemantic(
  typeId: string,
  updates: Partial<EdgeSemantic>,
): Promise<EdgeSemantic> {
  const index = DEFAULT_EDGE_SEMANTICS.findIndex((t) => t.id === typeId);
  if (index === -1) {
    throw new Error("Relation type not found");
  }
  const existing = DEFAULT_EDGE_SEMANTICS[index]!;
  const updated: EdgeSemantic = {
    id: typeId,
    name: updates.name ?? existing.name,
    category: updates.category ?? existing.category,
    description: updates.description ?? existing.description,
  };
  DEFAULT_EDGE_SEMANTICS[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteEdgeSemantic(typeId: string): Promise<void> {
  const index = DEFAULT_EDGE_SEMANTICS.findIndex((t) => t.id === typeId);
  if (index !== -1) {
    DEFAULT_EDGE_SEMANTICS.splice(index, 1);
  }
  return Promise.resolve();
}
