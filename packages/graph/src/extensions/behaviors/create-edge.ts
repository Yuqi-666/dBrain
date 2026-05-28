import { CommonEvent, NodeEvent, CanvasEvent } from "@antv/g6";
import { BaseBehavior } from "@antv/g6";
import type { RuntimeContext, IPointerEvent, IDragEvent, Point } from "@antv/g6";
import type { BaseBehaviorOptions } from "@antv/g6";
import type { EdgeType } from "@workspace/interfaces";

const ASSIST_EDGE_PREFIX = "create-edge-assist-edge-";
const ASSIST_NODE_PREFIX = "create-edge-assist-node-";

export interface CreateEdgeOptions extends BaseBehaviorOptions {
  enable?: boolean | ((event: IPointerEvent) => boolean);
  onCreateEdge?: (sourceIds: string[], targetId: string | null, x?: number, y?: number) => void;
  defaultEdgeDirection?: "forward" | "reverse" | "bidirectional" | "undirected";
  defaultEdgeType?: "hierarchy" | "flow" | "association" | "interaction";
}

export class CreateEdge extends BaseBehavior<CreateEdgeOptions> {
  static defaultOptions: Partial<CreateEdgeOptions> = {
    enable: true,
    defaultEdgeDirection: "forward",
    defaultEdgeType: "association",
  };

  private container: HTMLElement | null = null;
  private altPressed = false;
  private isCreating = false;
  private sourceIds: string[] = [];
  private targetId: string | null = null;
  private assistNodeId: string | null = null;
  private assistEdgeIds: string[] = [];
  private startX: number = 0;
  private startY: number = 0;
  private endX: number = 0;
  private endY: number = 0;

  constructor(context: RuntimeContext, options: CreateEdgeOptions) {
    super(
      context,
      Object.assign({}, CreateEdge.defaultOptions, options),
    );
    this.container = context.canvas.getContainer() as HTMLElement;
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;

    const { graph } = this.context;

    // Alt key detection on container
    this.container.addEventListener("keydown", this.onKeyDown);
    this.container.addEventListener("keyup", this.onKeyUp);

    // Also bind on window to catch alt key when focus is elsewhere
    window.addEventListener("keydown", this.onWindowKeyDown);
    window.addEventListener("keyup", this.onWindowKeyUp);

    // Node drag start (Scenario 1: no pre-selected nodes)
    graph.on(NodeEvent.DRAG_START, this.onNodeDragStart);

    // Canvas drag start (Scenario 2: has pre-selected nodes)
    graph.on(CanvasEvent.DRAG_START, this.onCanvasDragStart);

    // Pointer move to update assist edges
    graph.on(CommonEvent.POINTER_MOVE, this.onPointerMove);

    // Pointer up to complete or cancel
    graph.on(CommonEvent.POINTER_UP, this.onPointerUp);
  }

  private unbindEvents(): void {
    if (!this.container) return;

    const { graph } = this.context;

    this.container.removeEventListener("keydown", this.onKeyDown);
    this.container.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("keydown", this.onWindowKeyDown);
    window.removeEventListener("keyup", this.onWindowKeyUp);

    graph.off(NodeEvent.DRAG_START, this.onNodeDragStart);
    graph.off(CanvasEvent.DRAG_START, this.onCanvasDragStart);
    graph.off(CommonEvent.POINTER_MOVE, this.onPointerMove);
    graph.off(CommonEvent.POINTER_UP, this.onPointerUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Alt") {
      this.altPressed = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Alt") {
      this.altPressed = false;
      // Cancel edge creation if alt is released during creation
      if (this.isCreating) {
        this.cancelCreation();
      }
    }
  };

  private onWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Alt") {
      this.altPressed = true;
    }
  };

  private onWindowKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Alt") {
      this.altPressed = false;
      if (this.isCreating) {
        this.cancelCreation();
      }
    }
  };

  private getSelectedNodeIds(): string[] {
    const { graph } = this.context;
    // Get nodes that have 'selected' state
    const selectedNodes = graph.getElementDataByState("node", "selected");
    return selectedNodes.map((node) => node.id);
  }

  private hasSelectedNodes(): boolean {
    return this.getSelectedNodeIds().length > 0;
  }

  private validate(event: IPointerEvent): boolean {
    if (this.destroyed) return false;
    const { enable } = this.options;
    if (typeof enable === "function") return enable(event);
    return !!enable;
  }

  private getEventTargetType(event: IPointerEvent): string {
    return (event as any).targetType || "canvas";
  }

  private onNodeDragStart = (event: IDragEvent): void => {
    if (!this.validate(event)) return;
    if (!this.altPressed) return;

    // Scenario 1: No pre-selected nodes, start from the dragged node
    if (this.hasSelectedNodes()) return; // Let Scenario 2 handle it

    const targetType = this.getEventTargetType(event);
    if (targetType !== "node") return;

    const nodeId = (event as any).target?.id;
    if (!nodeId) return;

    this.startEdgeCreation([nodeId], event);
  };

  private onCanvasDragStart = (event: IDragEvent): void => {
    if (!this.validate(event)) return;
    if (!this.altPressed) return;

    // Scenario 2: Has pre-selected nodes, start from all selected nodes
    if (!this.hasSelectedNodes()) return;

    const targetType = this.getEventTargetType(event);
    // When canvas is the target, it means user is dragging on empty space to create edge
    // from all selected nodes
    if (targetType !== "canvas") return;

    const selectedNodeIds = this.getSelectedNodeIds();
    this.startEdgeCreation(selectedNodeIds, event);
  };

  private startEdgeCreation(sourceIds: string[], event: IDragEvent): void {
    const { graph } = this.context;

    this.sourceIds = sourceIds;
    this.isCreating = true;
    this.targetId = null;

    this.startX = event.client.x;
    this.startY = event.client.y;

    // Create a hidden assist node at the cursor position
    this.assistNodeId = `${ASSIST_NODE_PREFIX}${Date.now()}`;
    const point = this.getCanvasPoint(event);

    graph.addNodeData([
      {
        id: this.assistNodeId,
        type: "circle",
        style: {
          size: 1,
          visibility: "hidden",
          x: point[0],
          y: point[1],
          pointerEvents: "none",
        },
      },
    ]);

    this.assistEdgeIds = this.sourceIds.map((_, index) => {
      return `${ASSIST_EDGE_PREFIX}${index}-${Date.now()}`;
    });

    const assistNodeId = this.assistNodeId!;
    const edgeData: Array<{
      id: string;
      source: string;
      target: string;
      edgeType: EdgeType;
      style: Record<string, unknown>;
    }> = this.sourceIds.map((sourceId, index) => {
      const edgeId = this.assistEdgeIds[index]!;
      return {
        id: edgeId,
        source: sourceId,
        target: assistNodeId,
        edgeType: "association" as EdgeType,
        style: {
          lineWidth: 2,
          stroke: "#1890ff",
          lineDash: [4, 4],
          pointerEvents: "none",
        },
      };
    });

    graph.addEdgeData(edgeData);

    this.context.canvas.setCursor("crosshair" as any);
  }

  private getCanvasPoint(event: IPointerEvent): Point {
    // Use graph.getCanvasByClient to properly convert screen coordinates to canvas
    // coordinates, accounting for viewport transforms (zoom/pan)
    return this.context.graph.getCanvasByClient([event.client.x, event.client.y]);
  }

  private onPointerMove = (event: IPointerEvent): void => {
    if (!this.isCreating || !this.assistNodeId) return;

    this.endX = event.client.x;
    this.endY = event.client.y;

    const { model, element, graph } = this.context;
    const point = this.getCanvasPoint(event);

    const targetType = this.getEventTargetType(event);
    if (targetType === "node") {
      const targetId = (event as any).target?.id as string;
      if (!targetId) {
        model.translateNodeTo(this.assistNodeId, point);
      } else {
        this.targetId = targetId;
        const nodeData = graph.getNodeData([targetId])[0];
        if (nodeData?.style) {
          model.translateNodeTo(this.assistNodeId, [nodeData.style.x ?? 0, nodeData.style.y ?? 0]);
        }
      }
    } else {
      this.targetId = null;
      // Follow cursor when not over any node
      model.translateNodeTo(this.assistNodeId, point);
    }

    element?.draw({ animation: false, silence: true });
  };

  private onPointerUp = (event: IPointerEvent): void => {
    if (!this.isCreating) return;

    const targetType = this.getEventTargetType(event);

    if (targetType === "node" && this.targetId) {
      this.finishEdgeCreation();
    } else {
      this.cancelCreation();
    }
  };

  private finishEdgeCreation(): void {
    if (!this.targetId || this.sourceIds.length === 0) {
      this.cancelCreation();
      return;
    }

    const { onCreateEdge } = this.options;

    const validSourceIds: string[] = [];
    for (const sourceId of this.sourceIds) {
      if (sourceId === this.targetId) continue;
      if (this.edgeExists(sourceId, this.targetId)) continue;
      validSourceIds.push(sourceId);
    }

    if (validSourceIds.length > 0 && onCreateEdge) {
      onCreateEdge(validSourceIds, this.targetId, this.endX, this.endY);
    }

    this.cleanup();
  }

  private edgeExists(sourceId: string, targetId: string): boolean {
    const { graph } = this.context;
    const edges = graph.getEdgeData();

    for (const edge of edges) {
      if (edge.source === sourceId && edge.target === targetId) {
        return true;
      }
      // Check reverse direction for bidirectional/undirected
      if (edge.source === targetId && edge.target === sourceId) {
        return true;
      }
    }

    return false;
  }

  private cancelCreation(): void {
    const { onCreateEdge } = this.options;

    if (this.sourceIds.length > 0 && onCreateEdge) {
      onCreateEdge(this.sourceIds, null, this.endX, this.endY);
    }

    this.cleanup();
  }

  private cleanup(): void {
    const { graph, element } = this.context;

    if (this.assistEdgeIds.length > 0) {
      graph.removeEdgeData(this.assistEdgeIds);
    }

    if (this.assistNodeId) {
      graph.removeNodeData([this.assistNodeId]);
    }

    this.sourceIds = [];
    this.targetId = null;
    this.assistNodeId = null;
    this.assistEdgeIds = [];
    this.isCreating = false;

    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;

    element?.draw({ animation: false });

    this.context.canvas.setCursor("default" as any);
  }

  update(options: Partial<CreateEdgeOptions>): void {
    this.unbindEvents();
    super.update(options);
    this.bindEvents();
  }

  destroy(): void {
    this.unbindEvents();
    this.container = null;
    this.altPressed = false;
    this.isCreating = false;
    this.sourceIds = [];
    this.targetId = null;
    this.assistNodeId = null;
    this.assistEdgeIds = [];
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    super.destroy();
  }
}
