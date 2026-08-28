export type WorkspaceId = string;
export interface Workspace {
  id: WorkspaceId;
  name: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}
export type WorkspaceMemberId = string;
export type WorkspaceRole = "owner" | "editor" | "viewer";
export interface WorkspaceMember {
  id: WorkspaceMemberId;
  workspaceId: WorkspaceId;
  userId: string;
  role: WorkspaceRole;
  createdAt?: string;
}
