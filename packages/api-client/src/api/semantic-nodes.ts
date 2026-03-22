import type { NodeSemantic } from "@workspace/interfaces";
export interface NodeSemanticResponse {
  nodeSemantics: NodeSemantic[];
  total: number;
}

const DEFAULT_NODE_SEMANTICS: NodeSemantic[] = [
  {
    id: "axiom",
    name: "公理",
    description: "基本原则和公理",
    color: "#6366F1",
  },
  {
    id: "task",
    name: "任务",
    description: "待办事项和任务",
    color: "#F59E0B",
  },
  {
    id: "concept",
    name: "概念",
    description: "核心概念定义",
    color: "#10B981",
  },
  {
    id: "note",
    name: "笔记",
    description: "个人笔记内容",
    color: "#8B5CF6",
  },
];

export async function getNodeSemantics(): Promise<NodeSemanticResponse> {
  return Promise.resolve({
    nodeSemantics: DEFAULT_NODE_SEMANTICS,
    total: DEFAULT_NODE_SEMANTICS.length,
  });
}

export async function getNodeSemantic(
  typeId: string,
): Promise<NodeSemantic | null> {
  const type = DEFAULT_NODE_SEMANTICS.find((t) => t.id === typeId);
  return Promise.resolve(type ?? null);
}

export async function createNodeSemantic(
  nodeSemantic: NodeSemantic,
): Promise<NodeSemantic> {
  const newType = {
    ...nodeSemantic,
    id: nodeSemantic.id || `semantic-${Date.now()}`,
  };
  DEFAULT_NODE_SEMANTICS.push(newType);
  return Promise.resolve(newType);
}

export async function updateNodeSemantic(
  typeId: string,
  updates: Partial<NodeSemantic>,
): Promise<NodeSemantic> {
  const index = DEFAULT_NODE_SEMANTICS.findIndex((t) => t.id === typeId);
  if (index === -1) {
    throw new Error("Node Semantic not found");
  }
  const existing = DEFAULT_NODE_SEMANTICS[index]!;
  const updated: NodeSemantic = {
    id: typeId,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    color: updates.color ?? existing.color,
    icon: updates.icon ?? existing.icon,
  };
  DEFAULT_NODE_SEMANTICS[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteNodeSemantic(typeId: string): Promise<void> {
  const index = DEFAULT_NODE_SEMANTICS.findIndex((t) => t.id === typeId);
  if (index !== -1) {
    DEFAULT_NODE_SEMANTICS.splice(index, 1);
  }
  return Promise.resolve();
}
