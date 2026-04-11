"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactElement } from "react";
import { Graph } from "@workspace/graph";
import { useGraphStore, useUIStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import { Sun, Moon, Plus, Link2, Trash2 } from "lucide-react";
import type {
  LayoutType,
  View,
  EdgeSemantic,
  EdgeData,
  TextNodeData,
  NodeSemantic,
} from "@workspace/interfaces";
import { GraphHeader } from "@workspace/ui/components/header/graph-header/graph-header";
import { EditorHeader } from "@workspace/ui/components/header/editor-header/editor-header";
import { Main } from "next/document";


const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: "D3force", label: "D3 Force" },
  { value: "dagre", label: "Dagre (Hierarchical)" },
  { value: "radial", label: "Radial" },
  { value: "compactBox", label: "CompactBox" },
  { value: "fishbone", label: "Fishbone" },
  { value: "mindmap", label: "Mind Map" },
];
// 节点语义定义（保持原格式）
const INITIAL_NODE_SEMANTICS: NodeSemantic[] = [
  { id: "layer", name: "System Layer", color: "#3B82F6" },
  { id: "module", name: "Core Module", color: "#10B981" },
  { id: "component", name: "Component", color: "#8B5CF6" },
];

// 边语义定义（保持原格式）
const INITIAL_EDGE_SEMANTICS: EdgeSemantic[] = [
  { id: "belongs_to", name: "Belongs To", color: "#3B82F6" },
  { id: "depends_on", name: "Depends On", color: "#10B981" },
  { id: "calls", name: "Calls", color: "#8B5CF6" },
];

// 测试节点（覆盖3种语义、2种权限、分层结构）
const INITIAL_NODES: TextNodeData[] = [
  // 1. 系统层节点（Layer）
  {
    id: "layer-frontend",
    title: "Frontend Layer",
    nodeType: "text",
    semanticId: "layer",
    permission: "public",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "layer-backend",
    title: "Backend Layer",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "layer-data",
    title: "Data Layer",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // 2. 核心模块节点（Module）
  {
    id: "module-user",
    title: "User Module",
    nodeType: "text",
    semanticId: "module",
    permission: "public",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "module-order",
    title: "Order Module",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "module-payment",
    title: "Payment Module",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // 3. 组件节点（Component）
  {
    id: "comp-auth",
    title: "Auth Component",
    nodeType: "text",
    semanticId: "component",
    permission: "public",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "comp-cart",
    title: "Shopping Cart",
    nodeType: "text",
    semanticId: "component",
    permission: "public",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "comp-db-user",
    title: "User DB",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "comp-cache",
    title: "Redis Cache",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// 测试边（覆盖3种语义、3种方向、5种权重、4种类别）
const INITIAL_EDGES: EdgeData[] = [
  // 1. 层级关系（hierarchy + belongs_to + forward + 权重1）
  {
    id: "edge-1",
    from: "module-user",
    to: "layer-backend",
    semanticId: "belongs_to",
    direction: "forward",
    weight: 1,
    category: "hierarchy",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "edge-2",
    from: "module-order",
    to: "layer-backend",
    semanticId: "belongs_to",
    direction: "forward",
    weight: 1,
    category: "hierarchy",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "edge-3",
    from: "comp-auth",
    to: "module-user",
    semanticId: "belongs_to",
    direction: "forward",
    weight: 1,
    category: "hierarchy",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "edge-4",
    from: "comp-db-user",
    to: "layer-data",
    semanticId: "belongs_to",
    direction: "forward",
    weight: 1,
    category: "hierarchy",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // 2. 依赖关系（flow + depends_on + forward + 权重2-3）
  {
    id: "edge-5",
    from: "comp-cart",
    to: "comp-auth",
    semanticId: "depends_on",
    direction: "forward",
    weight: 2,
    category: "flow",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "edge-6",
    from: "module-order",
    to: "module-user",
    semanticId: "depends_on",
    direction: "forward",
    weight: 3,
    category: "flow",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // 3. 调用关系（interaction + calls + forward + 权重3）
  {
    id: "edge-7",
    from: "module-payment",
    to: "module-order",
    semanticId: "calls",
    direction: "forward",
    weight: 3,
    category: "interaction",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "edge-8",
    from: "comp-auth",
    to: "comp-db-user",
    semanticId: "calls",
    direction: "forward",
    weight: 3,
    category: "interaction",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // 4. 双向关联（association + depends_on + bidirectional + 权重4）
  {
    id: "edge-9",
    from: "comp-cache",
    to: "comp-db-user",
    semanticId: "depends_on",
    direction: "bidirectional",
    weight: 4,
    category: "association",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },

  // 5. 反向关系（reverse + belongs_to + 权重5）
  {
    id: "edge-10",
    from: "layer-frontend",
    to: "comp-cart",
    semanticId: "belongs_to",
    direction: "reverse",
    weight: 5,
    category: "hierarchy",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];
const Main_View: View = {
  id: "demo-view",
  name: "Demo View",
  layout: "D3force",
  visualConfig: {
    showMinimap: true,
    backgroundStyle: "grid",
  },
}
export default function GraphDemoPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const ui_store = useUIStore();
  const graph_store = useGraphStore();
  const currentViewId = ui_store.currentViewId;
  useEffect(() => {
    ui_store.setCurrentViewId(Main_View.id);
    graph_store.setViews([Main_View]);
    graph_store.setNodeSemantics(INITIAL_NODE_SEMANTICS);
    graph_store.setEdgeSemantics(INITIAL_EDGE_SEMANTICS);
    graph_store.setNodes(INITIAL_NODES);
    graph_store.setEdges(INITIAL_EDGES);
    setIsInitialized(true);
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <GraphHeader />
      {isInitialized && (
        <Graph
          theme={theme}
          viewId={currentViewId}
          enableMinimap={true}
          enableGrid={true}
          enableFisheye={false}
          enableNodeDragging={true}
          enableEdgeInteractions={true}
          className="w-full h-full"
          onLoad={(graph) => console.log("[GraphDemo] Graph loaded", graph)}
        />
      )}
    </div>
  );
}
