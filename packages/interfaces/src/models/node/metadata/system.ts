export type NodeId = string;
export type EdgeId = string;

export interface VersionEntry {
  version: number;
  timestamp: string;
  changedBy: string;
  changes: string[];
}

export interface SystemMetadata {
  id: NodeId;
  createdAt: string;
  updatedAt: string;
  versionHistory: VersionEntry[];
}

export function createSystemMetadata(id?: NodeId): SystemMetadata {
  const now = new Date().toISOString();
  return {
    id: id ?? "",
    createdAt: now,
    updatedAt: now,
    versionHistory: [],
  };
}

export function updateSystemMetadata(
  existing: SystemMetadata,
  changes: string[],
): SystemMetadata {
  const newVersion = existing.versionHistory.length + 1;
  const now = new Date().toISOString();

  return {
    ...existing,
    updatedAt: now,
    versionHistory: [
      ...existing.versionHistory,
      {
        version: newVersion,
        timestamp: now,
        changedBy: "current-user",
        changes,
      },
    ],
  };
}
