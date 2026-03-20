import { create } from "zustand";
import type { NodeData } from "@workspace/interfaces";
import type { EdgeBase } from "@workspace/interfaces";
import type { View, LayoutType } from "@workspace/interfaces";

interface GraphState {
  nodes: NodeData[];
  edges: EdgeBase[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  currentView: View | null;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  layoutType: LayoutType;
  isSidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;

  setNodes: (nodes: NodeData[]) => void;
  addNode: (node: NodeData) => void;
  updateNode: (nodeId: string, updates: Partial<NodeData>) => void;
  removeNode: (nodeId: string) => void;

  setEdges: (edges: EdgeBase[]) => void;
  addEdge: (edge: EdgeBase) => void;
  updateEdge: (edgeId: string, updates: Partial<EdgeBase>) => void;
  removeEdge: (edgeId: string) => void;

  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearNodeSelection: () => void;
  selectNodes: (nodeIds: string[]) => void;

  selectEdge: (edgeId: string) => void;
  deselectEdge: (edgeId: string) => void;
  toggleEdgeSelection: (edgeId: string) => void;
  clearEdgeSelection: () => void;

  setCurrentView: (view: View | null) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setLayoutType: (layout: LayoutType) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  reset: () => void;
}

const initialState = {
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  currentView: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  layoutType: "force" as LayoutType,
  isSidebarOpen: true,
  isLoading: false,
  error: null,
};

export const useGraphStore = create<GraphState>((set) => ({
  ...initialState,

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.metadata.id === nodeId ? { ...n, ...updates } : n,
      ),
    })),
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.metadata.id !== nodeId),
      edges: state.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    })),

  setEdges: (edges) => set({ edges }),
  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  updateEdge: (edgeId, updates) =>
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, ...updates } : e,
      ),
    })),
  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    })),

  selectNode: (nodeId) =>
    set((state) => ({
      selectedNodeIds: [...state.selectedNodeIds, nodeId],
    })),
  deselectNode: (nodeId) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    })),
  toggleNodeSelection: (nodeId) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.includes(nodeId)
        ? state.selectedNodeIds.filter((id) => id !== nodeId)
        : [...state.selectedNodeIds, nodeId],
    })),
  clearNodeSelection: () => set({ selectedNodeIds: [] }),
  selectNodes: (nodeIds) => set({ selectedNodeIds: nodeIds }),

  selectEdge: (edgeId) =>
    set((state) => ({
      selectedEdgeIds: [...state.selectedEdgeIds, edgeId],
    })),
  deselectEdge: (edgeId) =>
    set((state) => ({
      selectedEdgeIds: state.selectedEdgeIds.filter((id) => id !== edgeId),
    })),
  toggleEdgeSelection: (edgeId) =>
    set((state) => ({
      selectedEdgeIds: state.selectedEdgeIds.includes(edgeId)
        ? state.selectedEdgeIds.filter((id) => id !== edgeId)
        : [...state.selectedEdgeIds, edgeId],
    })),
  clearEdgeSelection: () => set({ selectedEdgeIds: [] }),

  setCurrentView: (view) => set({ currentView: view }),
  setViewport: (viewport) => set({ viewport }),
  setLayoutType: (layout) => set({ layoutType: layout }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
