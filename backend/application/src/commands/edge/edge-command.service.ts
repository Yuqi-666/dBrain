import type { IEdgeRepository } from "@workspace/domain";
import type { IEventBus } from "@workspace/domain";
import type { EdgeCreated, EdgeDeleted, EdgeUpdated } from "@workspace/domain";
import type { CreateEdgeCommand, UpdateEdgeCommand, DeleteEdgeCommand } from "./command";
import type { EdgeDTO } from "../../dto/edge.dto";
import { Edge } from "@workspace/domain/models/edge/entities";
import {
  EdgeId,
  EdgeDirection,
  EdgeType,
} from "@workspace/domain/models/edge/value-objects";

function toEdgeDTO(edge: Edge): EdgeDTO {
  return {
    id: edge.id.getValue(),
    from: edge.from.toString(),
    to: edge.to.toString(),
    direction: edge.direction.getValue(),
    semanticId: edge.semanticId,
    edgeType: edge.edgeType.getValue(),
    stateData: edge.stateData,
    createdAt: edge.createdAt,
    updatedAt: edge.updatedAt,
  };
}

function parseEdgeDirection(dir: string): EdgeDirection {
  switch (dir) {
    case "forward":
      return EdgeDirection.forward();
    case "reverse":
      return EdgeDirection.reverse();
    case "bidirectional":
      return EdgeDirection.bidirectional();
    case "undirected":
      return EdgeDirection.undirected();
    default:
      throw new Error(`Invalid edge direction: ${dir}`);
  }
}

function mapEdgeType(edgeType: string): EdgeType {
  const edgeTypeMap: Record<string, () => EdgeType> = {
    hierarchy: EdgeType.hierarchy,
    flow: EdgeType.flow,
    association: EdgeType.association,
    interaction: EdgeType.interaction,
  };
  return (edgeTypeMap[edgeType] ?? EdgeType.association)();
}

export class EdgeCommandService {
  constructor(
    private readonly edgeRepository: IEdgeRepository,
    private readonly eventBus: IEventBus,
  ) { }

  async createEdge(cmd: CreateEdgeCommand): Promise<EdgeDTO> {
    try {
      const edge = Edge.create({
        id: EdgeId.create(cmd.id),
        from: cmd.from,
        to: cmd.to,
        direction: parseEdgeDirection(cmd.direction),
        semanticId: cmd.semanticId,
        edgeType: mapEdgeType(cmd.edgeType),
        stateData: cmd.stateData,
      });

      const saved = await this.edgeRepository.save(edge);

      const event: EdgeCreated = {
        eventType: "EdgeCreated",
        aggregateId: saved.id.getValue(),
        metadata: {
          occurredAt: new Date().toISOString(),
          eventVersion: 1,
          userId: cmd.userId,
          sourceId: cmd.sourceId,
        },
        data: {
          id: saved.id.getValue(),
        },
      };
      this.eventBus.publish(event);

      return toEdgeDTO(saved);
    } catch (error) {
      if (error instanceof Error && error.message.includes("self-loop")) {
        throw new Error("Cannot create edge: source and target nodes cannot be the same");
      }
      throw error;
    }
  }

  async updateEdge(cmd: UpdateEdgeCommand): Promise<EdgeDTO> {
    const id = EdgeId.create(cmd.id);
    const edge = await this.edgeRepository.findById(id);

    if (!edge) {
      throw new Error(`Edge not found: ${cmd.id}`);
    }

    let updated = edge;

    if (cmd.direction) {
      updated = updated.flip();
    }

    if (cmd.stateData !== undefined) {
      updated = updated.updateStateData(cmd.stateData);
    }

    if (cmd.semanticId !== undefined || cmd.edgeType !== undefined) {
      updated = updated.updateSemantic(
        cmd.semanticId ?? updated.semanticId,
        cmd.edgeType ? mapEdgeType(cmd.edgeType) : updated.edgeType,
      );
    }

    const saved = await this.edgeRepository.save(updated);

    const event: EdgeUpdated = {
      eventType: "EdgeUpdated",
      aggregateId: saved.id.getValue(),
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: saved.id.getValue(),
      },
    };
    this.eventBus.publish(event);

    return toEdgeDTO(saved);
  }

  async deleteEdge(cmd: DeleteEdgeCommand): Promise<void> {
    const id = EdgeId.create(cmd.id);
    await this.edgeRepository.delete(id);

    const event: EdgeDeleted = {
      eventType: "EdgeDeleted",
      aggregateId: cmd.id,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
        userId: cmd.userId,
        sourceId: cmd.sourceId,
      },
      data: {
        id: cmd.id,
      },
    };
    this.eventBus.publish(event);
  }
}
