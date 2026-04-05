"use client";

import { Graph } from "@workspace/graph";
import { useGraphStore } from "@workspace/store";
import { useEffect } from "react";

export default function GraphTestPage(): React.ReactElement {
  const { addNode, addEdge, addView, nodes, edges, views } = useGraphStore();

  // Add sample data on mount
  useEffect(() => {
    // Only add data if empty
    if (nodes.size > 0 || edges.size > 0 || views.size > 0) return;

    // Add sample nodes
    addNode({
      id: "node1",
      title: "认知图谱",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addNode({
      id: "node2",
      title: "节点数据",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addNode({
      id: "node3",
      title: "关系数据",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addNode({
      id: "node4",
      title: "视图系统",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addNode({
      id: "node5",
      title: "G6渲染引擎",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add sample edges
    addEdge({
      id: "edge1",
      from: "node1",
      to: "node2",
      type: "default",
      name: "包含",
    });

    addEdge({
      id: "edge2",
      from: "node1",
      to: "node3",
      type: "default",
      name: "包含",
    });

    addEdge({
      id: "edge3",
      from: "node1",
      to: "node4",
      type: "default",
      name: "包含",
    });

    addEdge({
      id: "edge4",
      from: "node2",
      to: "node5",
      type: "default",
      name: "由...渲染",
    });

    addEdge({
      id: "edge5",
      from: "node3",
      to: "node5",
      type: "default",
      name: "由...渲染",
    });

    addEdge({
      id: "edge6",
      from: "node4",
      to: "node5",
      type: "default",
      name: "基于",
    });

    // Add sample view
    addView({
      id: "view1",
      name: "主视图",
      layout: "d3-force",
      visualConfig: {
        backgroundColor: "#ffffff",
        backgroundStyle: "grid",
        gridSpacing: 20,
        showMinimap: true,
      },
    });
  }, [addNode, addEdge, addView, nodes.size, edges.size, views.size]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "12px 20px",
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          认知图谱测试页
        </h1>
        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#666" }}>
          支持拖拽、缩放、右键菜单、节点选择等操作
        </p>
      </div>
      <Graph
        viewId="view1"
        theme="light"
        onNodeClick={(node: any) => console.log("点击节点:", node)}
        onNodeDoubleClick={(node: any) => alert(`双击节点: ${node.data.title}`)}
        onEdgeClick={(edge: any) => console.log("点击边:", edge)}
        onSelectionChange={(nodes: any[], edges: any[]) =>
          console.log("选择变化:", {
            选中节点数: nodes.length,
            选中边数: edges.length,
          })
        }
      />
    </div>
  );
}
