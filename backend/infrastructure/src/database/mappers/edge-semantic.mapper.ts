import type { RecordModel } from "pocketbase";
import type { EdgeType } from "@workspace/interfaces/models/edge";
import { EdgeSemantic } from "@workspace/domain/models/semantic/entities";
import { SemanticId } from "@workspace/domain/models/semantic/value-objects";

export class EdgeSemanticMapper {
  toDomain(record: RecordModel): EdgeSemantic {
    return EdgeSemantic.create({
      id: SemanticId.create(record.id),
      name: record.name as string,
      category: record.category as EdgeType,
      color: record.color as string | undefined,
      description: record.description as string | undefined,
    });
  }

  toRecord(entity: EdgeSemantic): Partial<RecordModel> {
    return {
      id: entity.id.getValue(),
      name: entity.name,
      category: entity.category,
      color: entity.color,
      description: entity.description,
    };
  }
}