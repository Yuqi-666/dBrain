import type {
  IWorkspaceRepository,
  IWorkspaceMemberRepository,
  INodeRepository,
  IEdgeRepository,
  IViewRepository,
  IEventBus,
} from "@workspace/domain";
import type {
  WorkspaceCreated,
  WorkspaceUpdated,
  WorkspaceDeleted,
  WorkspaceMemberAdded,
  WorkspaceMemberRemoved,
  ViewCreated,
} from "@workspace/domain";
import type {
  CreateWorkspaceCommand,
  UpdateWorkspaceCommand,
  DeleteWorkspaceCommand,
  AddWorkspaceMemberCommand,
  RemoveWorkspaceMemberCommand,
} from "./command";
import type { WorkspaceDTO, WorkspaceMemberDTO } from "../../dto/workspace.dto";
import { Workspace } from "@workspace/domain/models/workspace/entities";
import { WorkspaceMember } from "@workspace/domain/models/workspace/entities";
import { WorkspaceId } from "@workspace/domain/models/workspace/value-objects";
import { View } from "@workspace/domain/models/view/entities";
import { VisualConfig, ViewType } from "@workspace/domain/models/view/value-objects";
import { FilterConfig } from "@workspace/domain/models/filter/value-objects";

function toWorkspaceDTO(workspace: Workspace): WorkspaceDTO {
  return {
    id: workspace.id.value,
    name: workspace.name,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function toWorkspaceMemberDTO(member: WorkspaceMember): WorkspaceMemberDTO {
  return {
    id: member.id.value,
    workspaceId: member.workspaceId.value,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt,
  };
}

export class WorkspaceCommandService {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly workspaceMemberRepository: IWorkspaceMemberRepository,
    private readonly nodeRepository: INodeRepository,
    private readonly edgeRepository: IEdgeRepository,
    private readonly viewRepository: IViewRepository,
    private readonly eventBus: IEventBus,
  ) { }

  /**
   * Provision a default workspace for a brand-new user on first login.
   *
   * Called when a user has zero workspaces. Creates an empty "默认工作区"
   * workspace with the user as owner + owner membership, plus a single
   * empty global view (no filterConfig → shows everything) so the graph has
   * something to render immediately after login.
   *
   * Uses `tmp_`-prefixed IDs so the repositories create (not update) the
   * records; PocketBase assigns real IDs and the mappers map them back.
   * Returns the created workspace DTO.
   */
  async provisionDefaultWorkspace(userId: string): Promise<WorkspaceDTO> {
    const workspaceId = `tmp_${crypto.randomUUID()}`;
    const memberId = `tmp_${crypto.randomUUID()}`;
    const viewId = `tmp_${crypto.randomUUID()}`;

    const workspace = Workspace.create({
      id: workspaceId,
      name: "默认工作区",
      ownerId: userId,
    });
    const saved = await this.workspaceRepository.save(workspace);

    const member = WorkspaceMember.create({
      id: memberId,
      workspaceId: saved.id.value,
      userId,
      role: "owner",
    });
    await this.workspaceMemberRepository.save(member);

    const view = View.create({
      id: viewId,
      name: "全部",
      viewType: ViewType.force(),
      visualConfig: VisualConfig.create({ showMinimap: true }),
      filterConfig: FilterConfig.empty(),
      isPinned: true,
      workspaceId: saved.id.value,
    });
    await this.viewRepository.save(view);

    const createdEvent: WorkspaceCreated = {
      eventType: "WorkspaceCreated",
      aggregateId: saved.id.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId,
      },
      data: {
        id: saved.id.value,
      },
    };
    this.eventBus.publish(createdEvent);

    const viewCreatedEvent: ViewCreated = {
      eventType: "ViewCreated",
      aggregateId: viewId,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId,
      },
      data: {
        id: viewId,
      },
    };
    this.eventBus.publish(viewCreatedEvent);

    return toWorkspaceDTO(saved);
  }

  async createWorkspace(cmd: CreateWorkspaceCommand): Promise<WorkspaceDTO> {
    const workspace = Workspace.create({
      id: cmd.id,
      name: cmd.name,
      ownerId: cmd.ownerId,
    });

    const saved = await this.workspaceRepository.save(workspace);

    const event: WorkspaceCreated = {
      eventType: "WorkspaceCreated",
      aggregateId: saved.id.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: saved.id.value,
      },
    };
    this.eventBus.publish(event);

    // Invariant: every workspace must have at least one global view
    // (empty filterConfig → shows everything). Mirror the default-provision
    // path so a workspace created via createWorkspace is immediately renderable.
    const viewId = `tmp_${crypto.randomUUID()}`;
    const view = View.create({
      id: viewId,
      name: "全部",
      viewType: ViewType.force(),
      visualConfig: VisualConfig.create({ showMinimap: true }),
      filterConfig: FilterConfig.empty(),
      isPinned: true,
      workspaceId: saved.id.value,
    });
    await this.viewRepository.save(view);

    const viewCreatedEvent: ViewCreated = {
      eventType: "ViewCreated",
      aggregateId: viewId,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: viewId,
      },
    };
    this.eventBus.publish(viewCreatedEvent);

    return toWorkspaceDTO(saved);
  }

  async updateWorkspace(cmd: UpdateWorkspaceCommand): Promise<WorkspaceDTO> {
    const id = WorkspaceId.create(cmd.id);
    const workspace = await this.workspaceRepository.findById(id);

    if (!workspace) {
      throw new Error(`Workspace not found: ${cmd.id}`);
    }

    let updated = workspace;

    if (cmd.name !== undefined) {
      updated = updated.updateName(cmd.name);
    }

    const saved = await this.workspaceRepository.save(updated);

    const event: WorkspaceUpdated = {
      eventType: "WorkspaceUpdated",
      aggregateId: saved.id.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: saved.id.value,
      },
    };
    this.eventBus.publish(event);

    return toWorkspaceDTO(saved);
  }

  async deleteWorkspace(cmd: DeleteWorkspaceCommand): Promise<void> {
    const id = WorkspaceId.create(cmd.id);

    // Cascade-delete all workspace-scoped data so no orphaned nodes/edges/views
    // linger after the workspace is gone.
    const nodes = await this.nodeRepository.findAll({ workspaceId: id.value });
    if (nodes.length > 0) {
      await this.nodeRepository.deleteMany(nodes.map((n) => n.id));
    }
    const edges = await this.edgeRepository.findAll({ workspaceId: id.value });
    if (edges.length > 0) {
      await this.edgeRepository.deleteMany(edges.map((e) => e.id));
    }
    const views = await this.viewRepository.findAll({ workspaceId: id.value });
    if (views.length > 0) {
      await this.viewRepository.deleteMany(views.map((v) => v.id));
    }

    await this.workspaceRepository.delete(id);

    // Delete all members of the workspace.
    const members = await this.workspaceMemberRepository.findByWorkspaceId(id);
    for (const member of members) {
      await this.workspaceMemberRepository.delete(member.id);
    }

    const event: WorkspaceDeleted = {
      eventType: "WorkspaceDeleted",
      aggregateId: id.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: id.value,
      },
    };
    this.eventBus.publish(event);
  }

  async addMember(cmd: AddWorkspaceMemberCommand): Promise<WorkspaceMemberDTO> {
    const member = WorkspaceMember.create({
      id: cmd.id,
      workspaceId: cmd.workspaceId,
      userId: cmd.userId,
      role: cmd.role,
    });

    const saved = await this.workspaceMemberRepository.save(member);

    const event: WorkspaceMemberAdded = {
      eventType: "WorkspaceMemberAdded",
      aggregateId: saved.workspaceId.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.actorUserId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: saved.id.value,
        workspaceId: saved.workspaceId.value,
        userId: saved.userId,
      },
    };
    this.eventBus.publish(event);

    return toWorkspaceMemberDTO(saved);
  }

  async removeMember(cmd: RemoveWorkspaceMemberCommand): Promise<void> {
    const workspaceId = WorkspaceId.create(cmd.workspaceId);

    const member = await this.workspaceMemberRepository.findByWorkspaceAndUser(
      workspaceId,
      cmd.userId,
    );

    if (!member) {
      throw new Error(
        `WorkspaceMember not found: workspace=${cmd.workspaceId} user=${cmd.userId}`,
      );
    }

    await this.workspaceMemberRepository.delete(member.id);

    const event: WorkspaceMemberRemoved = {
      eventType: "WorkspaceMemberRemoved",
      aggregateId: workspaceId.value,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.actorUserId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: member.id.value,
        workspaceId: workspaceId.value,
        userId: member.userId,
      },
    };
    this.eventBus.publish(event);
  }
}
