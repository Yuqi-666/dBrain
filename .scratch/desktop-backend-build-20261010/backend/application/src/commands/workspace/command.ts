export interface CreateWorkspaceCommand {
  id: string;
  name: string;
  ownerId: string;
  userId: string;
  sourceId?: string;
}

export interface UpdateWorkspaceCommand {
  id: string;
  name?: string;
  userId: string;
  sourceId?: string;
}

export interface DeleteWorkspaceCommand {
  id: string;
  userId: string;
  sourceId?: string;
}

export interface AddWorkspaceMemberCommand {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  actorUserId: string;
  sourceId?: string;
}

export interface RemoveWorkspaceMemberCommand {
  id: string;
  workspaceId: string;
  userId: string;
  actorUserId: string;
  sourceId?: string;
}
