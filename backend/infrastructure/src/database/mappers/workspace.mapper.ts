import type { RecordModel } from "pocketbase";
import { Workspace } from "@workspace/domain/models/workspace/entities";
import { WorkspaceId } from "@workspace/domain/models/workspace/value-objects";

export class WorkspaceMapper {
  static toDomain(record: RecordModel): Workspace {
    return Workspace.create({
      id: record.id,
      name: record.name as string,
      ownerId: record.ownerId as string,
      createdAt: record.created as string | undefined,
      updatedAt: record.updated as string | undefined,
    });
  }

  static toRecord(workspace: Workspace): Partial<RecordModel> {
    return {
      id: workspace.id.value,
      name: workspace.name,
      ownerId: workspace.ownerId,
    };
  }
}
