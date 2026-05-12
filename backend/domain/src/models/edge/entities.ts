import type { NodeId } from "@workspace/interfaces/models/node/base";
import { EdgeId, EdgeDirection, EdgeType, EdgeWeight } from "./value-objects";
import type { EdgeSemanticId } from "./value-objects";

/**
 * Properties for creating an Edge entity.
 */
export interface EdgeProps {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  direction: EdgeDirection;
  semanticId: EdgeSemanticId;
  edgeType: EdgeType;
  weight: EdgeWeight;
}

/**
 * Domain entity representing a directed edge in the knowledge graph.
 * Edges connect two nodes with a specific semantic relationship.
 *
 * Business rules:
 * - An edge cannot connect a node to itself (no self-loops)
 * - Edges are immutable - all updates return new instances
 * - Bidirectional edges are symmetric and cannot be flipped
 */
export class Edge {
  readonly id: EdgeId;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly direction: EdgeDirection;
  readonly semanticId: EdgeSemanticId;
  readonly edgeType: EdgeType;
  readonly weight: EdgeWeight;

  private constructor(props: EdgeProps) {
    this.id = props.id;
    this.from = props.from;
    this.to = props.to;
    this.direction = props.direction;
    this.semanticId = props.semanticId;
    this.edgeType = props.edgeType;
    this.weight = props.weight;
  }

  /**
   * Creates a new Edge entity.
   * @param props - Edge properties
   * @throws Error if edge would create a self-loop (from === to)
   */
  static create(props: EdgeProps): Edge {
    if (props.from === props.to) {
      throw new Error(
        `Edge cannot create self-loop: from ${props.from} to ${props.to}`,
      );
    }
    return new Edge(props);
  }

  /**
   * Checks if this edge has the same identity as another edge.
   * Identity is determined by the edge ID.
   */
  sameIdentityAs(other: Edge): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Creates a new edge with reversed direction.
   * Forward edges become: reverse
   * Reverse edges become: forward
   * Bidirectional edges remain: bidirectional (no-op)
   */
  flip(): Edge {
    if (this.direction.isBidirectional()) {
      return this;
    }

    const flippedDirection = this.direction.isForward()
      ? EdgeDirection.reverse()
      : EdgeDirection.forward();

    return new Edge({
      ...this,
      direction: flippedDirection,
    });
  }

  /**
   * Creates a new edge with updated weight.
   */
  updateWeight(weight: EdgeWeight): Edge {
    return new Edge({
      ...this,
      weight,
    });
  }

  /**
   * Creates a new edge with updated semantic information.
   */
  updateSemantic(semanticId: EdgeSemanticId, edgeType: EdgeType): Edge {
    return new Edge({
      ...this,
      semanticId,
      edgeType,
    });
  }

  /**
   * Checks if this edge connects to a specific node.
   * Returns true if the node is either the source or target.
   */
  connectsNode(nodeId: NodeId): boolean {
    return this.from === nodeId || this.to === nodeId;
  }

  /**
   * Checks if this edge has the same endpoints as another edge.
   * Considers direction for comparison.
   */
  hasSameEndpointsAs(other: Edge): boolean {
    return (
      this.from === other.from &&
      this.to === other.to &&
      this.direction.equals(other.direction)
    );
  }

  /**
   * Checks if this edge connects the same two nodes as another edge (ignoring direction).
   */
  connectsSameNodesAs(other: Edge): boolean {
    return (
      (this.from === other.from && this.to === other.to) ||
      (this.from === other.to && this.to === other.from)
    );
  }

  /**
   * Gets the source node ID.
   */
  getSourceNode(): NodeId {
    return this.from;
  }

  /**
   * Gets the target node ID.
   */
  getTargetNode(): NodeId {
    return this.to;
  }
}
