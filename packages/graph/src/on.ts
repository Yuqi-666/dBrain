import type * as G6 from "@antv/g6";

export interface GraphEventHandlers {
  onNodeClick?: (node: any, event: any) => void;
  onNodeDoubleClick?: (node: any, event: any) => void;
  onNodeRightClick?: (node: any, event: any) => void;
  onEdgeClick?: (edge: any, event: any) => void;
  onEdgeRightClick?: (edge: any, event: any) => void;
  onCanvasClick?: (event: any) => void;
  onCanvasRightClick?: (event: any) => void;
  onSelectionChange?: (selectedNodes: any[], selectedEdges: any[]) => void;
  onNodeDragStart?: (node: any, event: any) => void;
  onNodeDrag?: (node: any, event: any) => void;
  onNodeDragEnd?: (node: any, event: any) => void;
  onViewportChange?: (zoom: number, position: { x: number; y: number }) => void;
}

export function registerEventHandlers(
  graph: G6.Graph,
  handlers: GraphEventHandlers,
): () => void {
  // Register all event listeners
  const eventListeners = [
    {
      event: "node:click",
      handler: (e: any) => {
        if (handlers.onNodeClick) handlers.onNodeClick(e.item?.getModel(), e);
      },
    },
    {
      event: "node:dblclick",
      handler: (e: any) => {
        if (handlers.onNodeDoubleClick)
          handlers.onNodeDoubleClick(e.item?.getModel(), e);
      },
    },
    {
      event: "node:contextmenu",
      handler: (e: any) => {
        e.preventDefault();
        if (handlers.onNodeRightClick)
          handlers.onNodeRightClick(e.item?.getModel(), e);
      },
    },
    {
      event: "edge:click",
      handler: (e: any) => {
        if (handlers.onEdgeClick) handlers.onEdgeClick(e.item?.getModel(), e);
      },
    },
    {
      event: "edge:contextmenu",
      handler: (e: any) => {
        e.preventDefault();
        if (handlers.onEdgeRightClick)
          handlers.onEdgeRightClick(e.item?.getModel(), e);
      },
    },
    {
      event: "canvas:click",
      handler: (e: any) => {
        if (handlers.onCanvasClick) handlers.onCanvasClick(e);
      },
    },
    {
      event: "canvas:contextmenu",
      handler: (e: any) => {
        e.preventDefault();
        if (handlers.onCanvasRightClick) handlers.onCanvasRightClick(e);
      },
    },
    {
      event: "afterselect",
      handler: (e: any) => {
        if (handlers.onSelectionChange) {
          const g = graph as any;
          const selectedNodes = g
            .findAllByState("node", "selected")
            .map((n: any) => n.getModel());
          const selectedEdges = g
            .findAllByState("edge", "selected")
            .map((e: any) => e.getModel());
          handlers.onSelectionChange(selectedNodes, selectedEdges);
        }
      },
    },
    {
      event: "node:dragstart",
      handler: (e: any) => {
        if (handlers.onNodeDragStart)
          handlers.onNodeDragStart(e.item?.getModel(), e);
      },
    },
    {
      event: "node:drag",
      handler: (e: any) => {
        if (handlers.onNodeDrag) handlers.onNodeDrag(e.item?.getModel(), e);
      },
    },
    {
      event: "node:dragend",
      handler: (e: any) => {
        if (handlers.onNodeDragEnd)
          handlers.onNodeDragEnd(e.item?.getModel(), e);
      },
    },
    {
      event: "viewportchange",
      handler: (e: any) => {
        if (handlers.onViewportChange) {
          const zoom = graph.getZoom();
          const canvas = graph.getCanvas() as any;
          const position = canvas.getViewPortTransform();
          handlers.onViewportChange(zoom, { x: position[4], y: position[5] });
        }
      },
    },
  ];

  // Register all listeners
  eventListeners.forEach(({ event, handler }) => {
    graph.on(event, handler);
  });

  // Return cleanup function to remove all listeners
  return () => {
    eventListeners.forEach(({ event, handler }) => {
      graph.off(event, handler);
    });
  };
}
