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
  EdgeWeight,
} from "@workspace/domain/models/edge/value-objects";

function toEdgeDTO(edge: Edge): EdgeDTO {
  return {
    id: edge.id.getValue(),
    from: edge.from.toString(),
    to: edge.to.toString(),
    direction: edge.direction.getValue(),
    semanticId: edge.semanticId,
    edgeType: edge.edgeType.getValue(),
    weight: edge.weight.getValue() as 1 | 2 | 3 | 4 | 5,
    stateData: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    default:
      throw new Error(`Invalid edge direction: ${dir}`);
  }
}

export class EdgeCommandService {
  constructor(
    private readonly edgeRepository: IEdgeRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async createEdge(cmd: CreateEdgeCommand): Promise<EdgeDTO> {
    try {
      const edge = Edge.create({
        id: EdgeId.create(cmd.id),
        from: cmd.from,
        to: cmd.to,
        direction: parseEdgeDirection(cmd.direction),
        semanticId: cmd.semanticId,
        edgeType: EdgeType.hierarchy(),
        weight: EdgeWeight.create(cmd.weight?.value ?? 1),
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

    if (cmd.weight !== undefined) {
      updated = updated.updateWeight(EdgeWeight.create(cmd.weight.value));
    }

    if (cmd.semanticId !== undefined || cmd.edgeType !== undefined) {
      const edgeTypeMap: Record<string, () => EdgeType> = {
        hierarchy: EdgeType.hierarchy,
        flow: EdgeType.flow,
        association: EdgeType.association,
        interaction: EdgeType.interaction,
      };
      const factoryFn = cmd.edgeType ? edgeTypeMap[cmd.edgeType] : null;
      updated = updated.updateSemantic(
        cmd.semanticId ?? updated.semanticId,
        factoryFn ? factoryFn() : updated.edgeType,
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