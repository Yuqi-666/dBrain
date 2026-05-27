import type { RecordModel } from "pocketbase";
import type { NodeId } from "@workspace/interfaces/models/node/base";
import { Edge } from "@workspace/domain/models/edge/entities";
import {
  EdgeId,
  EdgeDirection,
  EdgeType,
  EdgeWeight,
  type EdgeSemanticId,
} from "@workspace/domain/models/edge/value-objects";

/**
 * Maps between PocketBase RecordModel and domain Edge entity.
 */
export class EdgeMapper {
  /**
   * Converts a PocketBase record to a domain Edge entity.
   */
  static toDomain(record: RecordModel): Edge {
    return Edge.create({
      id: EdgeId.create(record.id),
      from: record.from as NodeId,
      to: record.to as NodeId,
      direction: EdgeMapper.mapDirectionToDomain(record.direction),
      semanticId: record.semanticId as EdgeSemanticId,
      edgeType: EdgeMapper.mapEdgeTypeToDomain(record.edgeType),
      weight: EdgeWeight.create(record.weight),
    });
  }

  /**
   * Converts a domain Edge entity to a Partial PocketBase RecordModel.
   */
  static toRecord(edge: Edge): Partial<RecordModel> {
    return {
      id: edge.id.getValue(),
      from: edge.from,
      to: edge.to,
      direction: edge.direction.getValue(),
      semanticId: edge.semanticId,
      edgeType: edge.edgeType.getValue(),
      weight: edge.weight.getValue(),
    };
  }

  private static mapDirectionToDomain(
    direction: string,
  ): EdgeDirection {
    switch (direction) {
      case "forward":
        return EdgeDirection.forward();
      case "reverse":
        return EdgeDirection.reverse();
      case "bidirectional":
        return EdgeDirection.bidirectional();
      case "undirected":
        return EdgeDirection.undirected();
      default:
        return EdgeDirection.forward();
    }
  }

  private static mapEdgeTypeToDomain(edgeType: string): EdgeType {
    switch (edgeType) {
      case "hierarchy":
        return EdgeType.hierarchy();
      case "flow":
        return EdgeType.flow();
      case "association":
        return EdgeType.association();
      case "interaction":
        return EdgeType.interaction();
      default:
        return EdgeType.association();
    }
  }
}
