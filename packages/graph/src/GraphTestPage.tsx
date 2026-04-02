import { Graph } from "@workspace/graph";
import { useGraphStore } from "@workspace/store/src/graphStore";
import { useEffect } from "react";

// Example test component to demonstrate the Graph component
export function GraphTestPage() {
  const { addNode, addEdge, addView } = useGraphStore();

  // Add sample data on mount
  useEffect(() => {
    // Add sample nodes
    addNode({
      id: "node1",
      title: "Node 1",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addNode({
      id: "node2",
      title: "Node 2",
      type: "default",
      permission: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addNode({
      id: "node3",
      title: "Node 3",
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
      name: "connected to",
    });

    addEdge({
      id: "edge2",
      from: "node2",
      to: "node3",
      type: "default",
      name: "connected to",
    });

    // Add sample view
    addView({
      id: "view1",
      name: "Main View",
      layout: "force",
      visualConfig: {
        backgroundColor: "#ffffff",
        backgroundStyle: "grid",
        gridSpacing: 20,
        showMinimap: true,
      },
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <h1
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          margin: 0,
        }}
      >
        Cognitive Graph Test
      </h1>
      <Graph
        viewId="view1"
        syncMode="incremental"
        theme="light"
        onNodeClick={(node) => console.log("Node clicked:", node)}
        onNodeDoubleClick={(node) => console.log("Node double clicked:", node)}
        onEdgeClick={(edge) => console.log("Edge clicked:", edge)}
        onSelectionChange={(nodes, edges) =>
          console.log("Selection changed:", { nodes, edges })
        }
      />
    </div>
  );
}

export default GraphTestPage;
