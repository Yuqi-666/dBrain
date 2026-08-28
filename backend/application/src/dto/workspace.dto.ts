export interface WorkspaceDTO {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMemberDTO {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  createdAt?: string;
}
