export interface SemanticType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface SemanticTypesResponse {
  semanticTypes: SemanticType[];
  total: number;
}

const DEFAULT_SEMANTIC_TYPES: SemanticType[] = [
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

export async function getSemanticTypes(): Promise<SemanticTypesResponse> {
  return Promise.resolve({
    semanticTypes: DEFAULT_SEMANTIC_TYPES,
    total: DEFAULT_SEMANTIC_TYPES.length,
  });
}

export async function getSemanticType(
  typeId: string,
): Promise<SemanticType | null> {
  const type = DEFAULT_SEMANTIC_TYPES.find((t) => t.id === typeId);
  return Promise.resolve(type ?? null);
}

export async function createSemanticType(
  semanticType: SemanticType,
): Promise<SemanticType> {
  const newType = {
    ...semanticType,
    id: semanticType.id || `semantic-${Date.now()}`,
  };
  DEFAULT_SEMANTIC_TYPES.push(newType);
  return Promise.resolve(newType);
}

export async function updateSemanticType(
  typeId: string,
  updates: Partial<SemanticType>,
): Promise<SemanticType> {
  const index = DEFAULT_SEMANTIC_TYPES.findIndex((t) => t.id === typeId);
  if (index === -1) {
    throw new Error("Semantic type not found");
  }
  const existing = DEFAULT_SEMANTIC_TYPES[index]!;
  const updated: SemanticType = {
    id: typeId,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    color: updates.color ?? existing.color,
    icon: updates.icon ?? existing.icon,
  };
  DEFAULT_SEMANTIC_TYPES[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteSemanticType(typeId: string): Promise<void> {
  const index = DEFAULT_SEMANTIC_TYPES.findIndex((t) => t.id === typeId);
  if (index !== -1) {
    DEFAULT_SEMANTIC_TYPES.splice(index, 1);
  }
  return Promise.resolve();
}
