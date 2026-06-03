import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { useNodeEditorStore } from "./nodeEditorStore";
import type { NodeSemantic, EdgeSemantic } from "@workspace/interfaces";

// ==================== Types ====================

export type ContextMenuType = "node" | "edge" | "canvas" | "groupSelect" | "add-edge";

export type ContextMenuContext =
  | { nodeId: string }
  | { edgeId: string }
  | Record<string, never>
  | { nodeIds: string[]; edgeIds: string[] }
  | { sourceIds: string[]; targetId: string | null };


// ==================== Store Interface ====================

export interface GraphUIStore {
  // State
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  contextMenu: {
    x: number;
    y: number;
    visible: boolean;
    type: ContextMenuType | null;
    context: ContextMenuContext | null;
  };
  previewBlock: {
    nodeId: string | null;
    visible: boolean;
    isFocus: boolean;
  };
  isNodeFocus: boolean;
  nodeSemanticDialog: {
    open: boolean;
    editingSemantic: NodeSemantic | null;
  };
  edgeSemanticDialog: {
    open: boolean;
    editingSemantic: EdgeSemantic | null;
  };

  // Actions
  setSelectedNodeIds: (ids: Set<string>) => void;
  setSelectedEdgeIds: (ids: Set<string>) => void;
  setContextMenu: (menu: GraphUIStore["contextMenu"]) => void;
  closeContextMenu: () => void;
  setPreviewBlock: (block: GraphUIStore["previewBlock"]) => void;
  closePreviewBlock: () => void;
  setIsNodeFocus: (value: boolean) => void;
  handleNodeEdit: (nodeId: string) => void;
  handleCreateEdge: (from: string[], to: string | null, x?: number, y?: number) => Promise<void>;
  openNodeSemanticDialog: (semantic?: NodeSemantic | null) => void;
  closeNodeSemanticDialog: () => void;
  openEdgeSemanticDialog: (semantic?: EdgeSemantic | null) => void;
  closeEdgeSemanticDialog: () => void;
}

// ==================== Store Implementation ====================

export const useGraphUIStore = create<GraphUIStore>()(
  devtools(
    (set, _get) => ({
      // Initial state
      selectedNodeIds: new Set<string>(),
      selectedEdgeIds: new Set<string>(),
      contextMenu: {
        x: 0,
        y: 0,
        visible: false,
        type: null,
        context: null,
      },
      previewBlock: {
        nodeId: null,
        visible: false,
        isFocus: false,
      },
      isNodeFocus: false,
      nodeSemanticDialog: {
        open: false,
        editingSemantic: null,
      },
      edgeSemanticDialog: {
        open: false,
        editingSemantic: null,
      },

      // Actions
      setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

      setSelectedEdgeIds: (ids) => set({ selectedEdgeIds: ids }),

      setContextMenu: (menu) => set({ contextMenu: menu }),

      closeContextMenu: () =>
        set((state) => ({
          contextMenu: { ...state.contextMenu, visible: false },
        })),

      setPreviewBlock: (block) =>
        set({
          previewBlock: block,
          isNodeFocus: block.isFocus,
        }),

      closePreviewBlock: () =>
        set({
          previewBlock: {
            nodeId: null,
            visible: false,
            isFocus: false,
          },
          isNodeFocus: false,
        }),

      setIsNodeFocus: (value) => set({ isNodeFocus: value }),

      handleNodeEdit: (nodeId) => {
        useNodeEditorStore.getState().setCurrentEditingNodeId(nodeId);
      },

      openNodeSemanticDialog: (semantic = null) =>
        set({
          nodeSemanticDialog: { open: true, editingSemantic: semantic },
        }),

      closeNodeSemanticDialog: () =>
        set({
          nodeSemanticDialog: { open: false, editingSemantic: null },
        }),

      openEdgeSemanticDialog: (semantic = null) =>
        set({
          edgeSemanticDialog: { open: true, editingSemantic: semantic },
        }),

      closeEdgeSemanticDialog: () =>
        set({
          edgeSemanticDialog: { open: false, editingSemantic: null },
        }),
    }),
    { name: "graph-ui-store" },
  ),
);
