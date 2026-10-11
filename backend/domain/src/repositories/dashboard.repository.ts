import type { Dashboard } from "../models/dashboard";

export interface IDashboardRepository {
  findLatest(workspaceId: string, ownerId: string): Promise<Dashboard | null>;
  /** Atomically inserts a revision; unique scope/revision rejects concurrent saves. */
  save(dashboard: Dashboard): Promise<Dashboard>;
}
