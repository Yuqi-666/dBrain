/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const nsCol = app.findCollectionByNameOrId("node_semantics");
  const ns1 = new Record(nsCol, { name: "System Layer", color: "#3B82F6" });
  const ns2 = new Record(nsCol, { name: "Core Module", color: "#10B981" });
  const ns3 = new Record(nsCol, { name: "Component", color: "#8B5CF6" });
  app.save(ns1);
  app.save(ns2);
  app.save(ns3);

  const esCol = app.findCollectionByNameOrId("edge_semantics");
  const es1 = new Record(esCol, { name: "Belongs To", color: "#3B82F6", category: "hierarchy" });
  const es2 = new Record(esCol, { name: "Depends On", color: "#10B981", category: "association" });
  const es3 = new Record(esCol, { name: "Calls", color: "#8B5CF6", category: "interaction" });
  const es4 = new Record(esCol, { name: "References", color: "#F59E0B", category: "association" });
  const es5 = new Record(esCol, { name: "Embeds", color: "#EF4444", category: "association" });
  app.save(es1);
  app.save(es2);
  app.save(es3);
  app.save(es4);
  app.save(es5);

  const nodesCol = app.findCollectionByNameOrId("nodes");
  const n1 = new Record(nodesCol, { title: "Frontend Architecture", nodeType: "rich-text", semanticId: ns1.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, referencedNodes: [], docs: {} });
  const n2 = new Record(nodesCol, { title: "Backend Services", nodeType: "text", semanticId: ns1.id, permission: "private", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: { docs: { description: "Backend services powered by Rust and Salvo framework for high-performance API endpoints", technologies: ["Rust", "Salvo", "Tokio"] } } });
  const n3 = new Record(nodesCol, { title: "Data Storage", nodeType: "text", semanticId: ns1.id, permission: "private", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: { docs: { description: "Data storage managing SQLite databases and object storage via MinIO", technologies: ["SQLite", "MinIO", "Diesel"] } } });
  const n4 = new Record(nodesCol, { title: "Authentication System", nodeType: "text", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: { docs: { description: "JWT-based authentication with secure password handling using bcrypt", features: ["JWT tokens", "Password hashing", "Session management"] } } });
  const n5 = new Record(nodesCol, { title: "Real-time Communication", nodeType: "text", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: { docs: { description: "WebSocket-based real-time communication for live updates", features: ["WebSocket", "Live updates", "Event broadcasting"] } } });
  const n6 = new Record(nodesCol, { title: "System Architecture Diagram", nodeType: "image", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, width: 2048, height: 1024, fileSize: 524288, shootingTime: "2024-01-15T10:30:00Z", content: "https://picsum.photos/2048/1024" });
  const n7 = new Record(nodesCol, { title: "UI Design Mockup", nodeType: "image", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, width: 2048, height: 1024, fileSize: 614400, shootingTime: "", content: "https://picsum.photos/2048/1024" });
  const n8 = new Record(nodesCol, { title: "Data Flow Visualization", nodeType: "image", semanticId: ns3.id, permission: "private", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, width: 2048, height: 1024, fileSize: 450562, shootingTime: "", content: "https://picsum.photos/2048/1024" });
  const n9 = new Record(nodesCol, { title: "Application Screenshot", nodeType: "image", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, width: 2048, height: 1024, fileSize: 589824, shootingTime: "", content: "https://picsum.photos/2048/1024" });
  const n10 = new Record(nodesCol, { title: "Product Demo", nodeType: "video", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, duration: 120, source: "online", fileSize: 10485760, content: "https://www.w3schools.com/html/mov_bbb.mp4", coverUrl: "https://picsum.photos/2048/1024" });
  const n11 = new Record(nodesCol, { title: "Getting Started Tutorial", nodeType: "video", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, duration: 300, source: "online", fileSize: 26214400, content: "https://www.w3schools.com/html/mov_bbb.mp4", coverUrl: "https://picsum.photos/2048/1024" });
  const n12 = new Record(nodesCol, { title: "Team Meeting Record", nodeType: "video", semanticId: ns3.id, permission: "private", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, duration: 600, source: "online", fileSize: 52428800, content: "https://www.w3schools.com/html/mov_bbb.mp4", coverUrl: "https://picsum.photos/2048/1024" });
  const n13 = new Record(nodesCol, { title: "Tech Podcast Episode", nodeType: "audio", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, duration: 1800, fileSize: 15728640, content: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" });
  const n14 = new Record(nodesCol, { title: "Team Meeting Recording", nodeType: "audio", semanticId: ns3.id, permission: "private", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, duration: 3600, fileSize: 31457280, content: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" });
  const n15 = new Record(nodesCol, { title: "Developer Interview", nodeType: "audio", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, duration: 2700, fileSize: 23592960, content: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" });
  const n16 = new Record(nodesCol, { title: "Machine Learning Research Paper", nodeType: "pdf", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, pageCount: 24, fileSize: 2097152, content: "https://arxiv.org/pdf/2604.14020", coverUrl: "https://picsum.photos/1024/768" });
  const n17 = new Record(nodesCol, { title: "API Documentation", nodeType: "pdf", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, pageCount: 15, fileSize: 1048576, content: "https://arxiv.org/pdf/2604.14020", coverUrl: "https://picsum.photos/1024/768" });
  const n18 = new Record(nodesCol, { title: "Design System Spec", nodeType: "pdf", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, pageCount: 32, fileSize: 3145728, content: "https://arxiv.org/pdf/2604.14020", coverUrl: "https://picsum.photos/1024/768" });
  const n19 = new Record(nodesCol, { title: "Technical Article", nodeType: "webpage", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: "<html><body><h1>Captured Webpage</h1><p>Technical article about system architecture</p></body></html>", url: "https://arxiv.org/html/2604.14020v1", screenshotUrl: "https://picsum.photos/1024/768" });
  const n20 = new Record(nodesCol, { title: "Project Documentation", nodeType: "webpage", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: "<html><body><h1>Documentation Page</h1><p>API reference and usage guide</p></body></html>", url: "https://arxiv.org/html/2604.14020v1", screenshotUrl: "https://picsum.photos/1024/768" });
  const n21 = new Record(nodesCol, { title: "Interactive Tutorial", nodeType: "webpage", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: "<html><body><h1>Tutorial</h1><p>Step-by-step guide for beginners</p></body></html>", url: "https://arxiv.org/html/2604.14020v1", screenshotUrl: "https://picsum.photos/1024/768" });
  const n22 = new Record(nodesCol, { title: "Bilibili", nodeType: "website", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: "https://bilibili.com", faviconUrl: "https://bilibili.com/favicon.ico" });
  const n23 = new Record(nodesCol, { title: "GitHub Repository", nodeType: "website", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: "https://github.com", faviconUrl: "https://github.com/favicon.ico" });
  const n24 = new Record(nodesCol, { title: "Project Documentation Site", nodeType: "website", semanticId: ns3.id, permission: "public", abstract: "", isPinned: false, tags: [], stateData: { client: {}, server: { weight: 8 } }, content: "https://docs.example.com", faviconUrl: "https://docs.example.com/favicon.ico" });
  app.save(n1);
  app.save(n2);
  app.save(n3);
  app.save(n4);
  app.save(n5);
  app.save(n6);
  app.save(n7);
  app.save(n8);
  app.save(n9);
  app.save(n10);
  app.save(n11);
  app.save(n12);
  app.save(n13);
  app.save(n14);
  app.save(n15);
  app.save(n16);
  app.save(n17);
  app.save(n18);
  app.save(n19);
  app.save(n20);
  app.save(n21);
  app.save(n22);
  app.save(n23);
  app.save(n24);

  const edgesCol = app.findCollectionByNameOrId("edges");
  app.save(new Record(edgesCol, { from: n1.id, to: n6.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n2.id, to: n4.id, semanticId: es1.id, direction: "forward", stateData: { client: {}, server: { weight: 1 } }, edgeType: "hierarchy" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n7.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n3.id, to: n8.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n10.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 3 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n11.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 3 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n2.id, to: n12.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n13.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n2.id, to: n14.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n4.id, to: n15.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 1 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n3.id, to: n16.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 3 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n2.id, to: n17.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n18.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n19.id, semanticId: es5.id, direction: "forward", stateData: { client: {}, server: { weight: 3 } }, edgeType: "flow" }));
  app.save(new Record(edgesCol, { from: n2.id, to: n20.id, semanticId: es5.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "flow" }));
  app.save(new Record(edgesCol, { from: n4.id, to: n21.id, semanticId: es5.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "flow" }));
  app.save(new Record(edgesCol, { from: n1.id, to: n22.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n2.id, to: n23.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n3.id, to: n24.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n10.id, to: n11.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n6.id, to: n16.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n20.id, to: n17.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 3 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n22.id, to: n10.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));
  app.save(new Record(edgesCol, { from: n13.id, to: n15.id, semanticId: es4.id, direction: "forward", stateData: { client: {}, server: { weight: 2 } }, edgeType: "association" }));

  const viewsCol = app.findCollectionByNameOrId("views");
  app.save(new Record(viewsCol, { name: "Demo View", viewType: "Force", isPinned: true, visualConfig: { showMinimap: true, backgroundStyle: "grid" }, filterConfig: {} }));
}, (app) => {
  const deleteAll = (col) => {
    const records = col.getFullList();
    for (const record of records) {
      col.delete(record.id);
    }
  };
  deleteAll(app.findCollectionByNameOrId("edges"));
  deleteAll(app.findCollectionByNameOrId("nodes"));
  deleteAll(app.findCollectionByNameOrId("node_semantics"));
  deleteAll(app.findCollectionByNameOrId("edge_semantics"));
  deleteAll(app.findCollectionByNameOrId("views"));
});
