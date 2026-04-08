"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactElement } from "react";
import { Graph } from "@workspace/graph";
import { useGraphStore } from "@workspace/store";
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

const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: "force", label: "Force Directed" },
  { value: "dagre", label: "Dagre (Hierarchical)" },
  { value: "fruchterman", label: "Fruchterman" },
  { value: "circular", label: "Circular" },
  { value: "grid", label: "Grid" },
  { value: "radial", label: "Radial" },
  { value: "concentric", label: "Concentric" },
  { value: "d3-force", label: "D3 Force" },
  { value: "fishbone", label: "Fishbone" },
  { value: "mindmap", label: "Mind Map" },
];

const INITIAL_NODE_SEMANTICS: NodeSemantic[] = [
  { id: "layer", name: "System Layer", color: "#3B82F6" },
  { id: "module", name: "Core Module", color: "#10B981" },
  { id: "component", name: "Component", color: "#8B5CF6" },
];

const INITIAL_EDGE_SEMANTICS: EdgeSemantic[] = [
  { id: "belongs_to", name: "Belongs To", category: "hierarchy" },
  { id: "depends_on", name: "Depends On", category: "association" },
  { id: "calls", name: "Calls", category: "flow" },
];

const INITIAL_NODES: TextNodeData[] = [
  // 分层节点
  {
    id: "layer-1",
    title: "Layer 1: AI & Research",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "layer-2",
    title: "Layer 2: Application Layer",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "layer-3",
    title: "Layer 3: Core Framework - vnpy.trader",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "layer-4",
    title: "Layer 4: Gateway & API",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "layer-5",
    title: "Layer 5: External Interface",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "layer-ui",
    title: "User Interface Layer",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "layer-infra",
    title: "Infrastructure Layer",
    nodeType: "text",
    semanticId: "layer",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 1: AI & Research 组件
  {
    id: "comp-1-1",
    title: "vnpy.alpha.dataset\nFeature Engineering",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-1-2",
    title: "vnpy.alpha.model\nML Models",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-1-3",
    title: "vnpy.alpha.strategy\nAI Strategies",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-1-4",
    title: "vnpy.alpha.lab\nResearch Environment",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 2: Application Layer 组件
  {
    id: "comp-2-1",
    title: "BaseApp\nvnpy.trader.app",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-2-2",
    title: "vnpy_ctastrategy",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-2-3",
    title: "vnpy_algotrading",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-2-4",
    title: "vnpy_datarecorder",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-2-5",
    title: "15+ App Modules",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 3: Core Framework 组件
  {
    id: "comp-3-1",
    title: "MainEngine\nvnpy.trader.engine",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-3-2",
    title: "EventEngine\nvnpy.event.engine",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-3-3",
    title: "OmsEngine\nvnpy.trader.engine",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-3-4",
    title: "LogEngine\nvnpy.trader.engine",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-3-5",
    title: "EmailEngine\nvnpy.trader.engine",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 4: Gateway & API 组件
  {
    id: "comp-4-1",
    title: "vnpy_rest\nREST Client",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-4-2",
    title: "vnpy_websocket\nWebSocket Client",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-4-3",
    title: "BaseGateway\nvnpy.trader.gateway",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 5: External Interface 组件
  {
    id: "comp-5-1",
    title: "Data Services\n10+ Providers",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-5-2",
    title: "Trading Exchanges\n30+ Gateways",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // UI Layer 组件
  {
    id: "comp-ui-1",
    title: "ChartWidget\nvnpy.chart",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-ui-2",
    title: "MainWindow\nvnpy.trader.ui",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Infrastructure Layer 组件
  {
    id: "comp-infra-1",
    title: "vnpy.trader.datafeed\nHistorical Data",
    nodeType: "text",
    semanticId: "module",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-infra-2",
    title: "vnpy.trader.database\nSQL/NoSQL/TimeSeries",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "comp-infra-3",
    title: "vnpy.rpc\nDistributed Communication",
    nodeType: "text",
    semanticId: "component",
    permission: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
const INITIAL_EDGES: EdgeData[] = [
  // Layer 1 归属 + 内部依赖
  {
    id: "edge-1-1",
    from: "comp-1-1",
    to: "layer-1",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-1-2",
    from: "comp-1-2",
    to: "layer-1",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-1-3",
    from: "comp-1-3",
    to: "layer-1",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-1-4",
    from: "comp-1-4",
    to: "layer-1",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-1-5",
    from: "comp-1-1",
    to: "comp-1-2",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-1-6",
    from: "comp-1-2",
    to: "comp-1-3",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-1-7",
    from: "comp-1-3",
    to: "comp-1-4",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 2 归属 + 内部依赖
  {
    id: "edge-2-1",
    from: "comp-2-1",
    to: "layer-2",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-2",
    from: "comp-2-2",
    to: "layer-2",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-3",
    from: "comp-2-3",
    to: "layer-2",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-4",
    from: "comp-2-4",
    to: "layer-2",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-5",
    from: "comp-2-5",
    to: "layer-2",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-6",
    from: "comp-2-2",
    to: "comp-2-1",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-7",
    from: "comp-2-3",
    to: "comp-2-1",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-8",
    from: "comp-2-4",
    to: "comp-2-1",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-2-9",
    from: "comp-2-5",
    to: "comp-2-1",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 3 归属 + 内部依赖
  {
    id: "edge-3-1",
    from: "comp-3-1",
    to: "layer-3",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-2",
    from: "comp-3-2",
    to: "layer-3",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-3",
    from: "comp-3-3",
    to: "layer-3",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-4",
    from: "comp-3-4",
    to: "layer-3",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-5",
    from: "comp-3-5",
    to: "layer-3",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-6",
    from: "comp-3-1",
    to: "comp-3-2",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-7",
    from: "comp-3-3",
    to: "comp-3-2",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-8",
    from: "comp-3-4",
    to: "comp-3-1",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-3-9",
    from: "comp-3-5",
    to: "comp-3-3",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 4 归属 + 内部依赖
  {
    id: "edge-4-1",
    from: "comp-4-1",
    to: "layer-4",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-4-2",
    from: "comp-4-2",
    to: "layer-4",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-4-3",
    from: "comp-4-3",
    to: "layer-4",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-4-4",
    from: "comp-4-1",
    to: "comp-4-3",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-4-5",
    from: "comp-4-2",
    to: "comp-4-3",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Layer 5 归属
  {
    id: "edge-5-1",
    from: "comp-5-1",
    to: "layer-5",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-5-2",
    from: "comp-5-2",
    to: "layer-5",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // UI Layer 归属 + 内部依赖
  {
    id: "edge-ui-1",
    from: "comp-ui-1",
    to: "layer-ui",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-ui-2",
    from: "comp-ui-2",
    to: "layer-ui",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-ui-3",
    from: "comp-ui-1",
    to: "comp-ui-2",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Infrastructure Layer 归属 + 内部依赖
  {
    id: "edge-infra-1",
    from: "comp-infra-1",
    to: "layer-infra",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-infra-2",
    from: "comp-infra-2",
    to: "layer-infra",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-infra-3",
    from: "comp-infra-3",
    to: "layer-infra",
    semanticId: "belongs_to",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "edge-infra-4",
    from: "comp-infra-1",
    to: "comp-infra-2",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 跨层核心依赖（架构主链路）
  {
    id: "cross-1",
    from: "comp-ui-2",
    to: "comp-3-1",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-2",
    from: "comp-4-3",
    to: "comp-3-1",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-3",
    from: "comp-5-1",
    to: "comp-infra-1",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-4",
    from: "comp-5-2",
    to: "comp-4-3",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-5",
    from: "comp-infra-1",
    to: "comp-3-1",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-6",
    from: "comp-infra-3",
    to: "comp-3-1",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-7",
    from: "comp-2-1",
    to: "comp-3-1",
    semanticId: "depends_on",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-8",
    from: "comp-3-2",
    to: "comp-2-1",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-9",
    from: "comp-3-2",
    to: "comp-ui-2",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cross-10",
    from: "comp-3-2",
    to: "comp-4-3",
    semanticId: "calls",
    direction: "forward",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
export default function GraphDemoPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [view, setView] = useState<View>({
    id: "demo-view",
    name: "Demo View",
    layout: "force",
    visualConfig: {
      showMinimap: true,
      backgroundStyle: "grid",
    },
  });
  const [nodeCounter, setNodeCounter] = useState(5);
  const [isInitialized, setIsInitialized] = useState(false);

  const store = useGraphStore();

  useEffect(() => {
    if (isInitialized) return;

    store.setNodeSemantics(INITIAL_NODE_SEMANTICS);
    store.setEdgeSemantics(INITIAL_EDGE_SEMANTICS);
    store.setNodes(INITIAL_NODES);
    store.setEdges(INITIAL_EDGES);
    setIsInitialized(true);
  }, [isInitialized, store]);

  const handleAddNode = useCallback(() => {
    const newId = `node-${nodeCounter + 1}`;
    const semanticIds = ["concept", "field", "technology"] as const;
    const randomSemantic =
      semanticIds[Math.floor(Math.random() * semanticIds.length)]!;
    const titles = [
      "Reinforcement Learning",
      "Transformer",
      "GAN",
      "BERT",
      "GPT",
      "CNN",
      "RNN",
    ];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)]!;

    store.addNode({
      id: newId,
      title: randomTitle,
      nodeType: "text" as const,
      semanticId: randomSemantic,
      permission: "private",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNodeCounter((c) => c + 1);
    console.log("[GraphDemo] Node added:", newId);
  }, [store, nodeCounter]);

  const handleAddEdge = useCallback(() => {
    const nodeIds = Array.from(store.nodes.keys());
    if (nodeIds.length < 2) {
      console.warn("[GraphDemo] Need at least 2 nodes to create an edge");
      return;
    }

    const fromNode = nodeIds[Math.floor(Math.random() * nodeIds.length)]!;
    let toNode = nodeIds[Math.floor(Math.random() * nodeIds.length)]!;
    while (toNode === fromNode && nodeIds.length > 1) {
      toNode = nodeIds[Math.floor(Math.random() * nodeIds.length)]!;
    }

    const existingEdges = Array.from(store.edges.values());
    const edgeExists = existingEdges.some(
      (e) =>
        (e.from === fromNode && e.to === toNode) ||
        (e.from === toNode && e.to === fromNode),
    );

    if (edgeExists) {
      console.warn("[GraphDemo] Edge already exists between these nodes");
      return;
    }

    const edgeSemanticIds = [
      "relates_to",
      "specializes",
      "applies_to",
    ] as const;
    const randomSemantic =
      edgeSemanticIds[Math.floor(Math.random() * edgeSemanticIds.length)]!;
    const newEdgeId = `edge-${Date.now()}`;

    store.addEdge({
      id: newEdgeId,
      from: fromNode,
      to: toNode,
      semanticId: randomSemantic,
      direction: "forward",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(
      "[GraphDemo] Edge added:",
      newEdgeId,
      "from",
      fromNode,
      "to",
      toNode,
    );
  }, [store]);

  const handleDeleteSelected = useCallback(() => {
    console.log(
      "[GraphDemo] Delete selected - not implemented (selection handled internally by Graph)",
    );
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg">
        <select
          value={view.layout}
          onChange={(e) =>
            setView({ ...view, layout: e.target.value as LayoutType })
          }
          className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          title={theme === "light" ? "Switch to Dark" : "Switch to Light"}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button variant="outline" size="sm" onClick={handleAddNode}>
          <Plus className="h-4 w-4 mr-1" />
          Node
        </Button>

        <Button variant="outline" size="sm" onClick={handleAddEdge}>
          <Link2 className="h-4 w-4 mr-1" />
          Edge
        </Button>

        <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* {isInitialized && ( */}
      {/*   <Graph */}
      {/*     theme={theme} */}
      {/*     view={view} */}
      {/*     enableMinimap={true} */}
      {/*     enableGrid={true} */}
      {/*     enableFisheye={false} */}
      {/*     enableNodeDragging={true} */}
      {/*     enableEdgeInteractions={true} */}
      {/*     className="w-full h-full" */}
      {/*     onLoad={(graph) => console.log("[GraphDemo] Graph loaded", graph)} */}
      {/*   /> */}
      {/* )} */}
      <Graph
        theme={theme}
        view={view}
        enableMinimap={true}
        enableGrid={true}
        enableFisheye={false}
        enableNodeDragging={true}
        enableEdgeInteractions={true}
        className="w-full h-full"
        onLoad={(graph) => console.log("[GraphDemo] Graph loaded", graph)}
      />
    </div>
  );
}
