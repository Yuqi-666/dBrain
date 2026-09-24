import type {
  NodeData,
  NodeId,
  EdgeId,
  NodeSemantic,
  EdgeSemantic,
} from "@workspace/interfaces";

/**
 * Demo graph data for a fresh workspace in dev.
 *
 * This mirrors the dataset seeded by `pb/pb_migrations/1700000001_seed_cognitive_graph.js`
 * at HEAD (3 node semantics, 5 edge semantics, 24 nodes across 8 types, 24 edges,
 * 1 view), so the in-browser dev mock stays in sync with the PocketBase seed.
 *
 * The `id` values are STABLE LOGICAL keys: the backend generates different real
 * ids on persistence, so `seed.ts` captures returned ids and builds a remap that
 * edges / view-selectors resolve against. These logical ids are only ever used
 * as remap keys, never written to the store as real ids.
 */

export interface DemoNodeSeed {
  id: NodeId;
  nodeType: "text" | "rich-text" | "website" | "image" | "pdf" | "video" | "audio" | "webpage" | "collection";
  title: string;
  abstract?: string;
  permission: "private" | "public" | "restricted";
  semanticId: NodeSemantic["id"];
  isPinned: boolean;
  stateData: NodeData["stateData"];
  // text / rich-text
  docs?: { [key: string]: unknown };
  referencedNodes?: NodeId[];
  // website
  webUrl?: string;
  faviconUrl?: string;
  // image
  imageUrl?: string;
  width?: number;
  height?: number;
  shootingTime?: string;
  // pdf
  pdfUrl?: string;
  pageCount?: number;
  coverUrl?: string;
  // video
  videoUrl?: string;
  duration?: number;
  source?: "local" | "online";
  // audio
  audioUrl?: string;
  // webpage
  webpageCode?: string;
  webpageLanguage?: string;
}

export const DEMO_NODE_SEMANTICS: NodeSemantic[] = [
  { id: "demo-sem-system", name: "System Layer", color: "#3B82F6" },
  { id: "demo-sem-core", name: "Core Module", color: "#10B981" },
  { id: "demo-sem-component", name: "Component", color: "#8B5CF6" },
];

// 种子节点的 semanticId 对应 DEMO_NODE_SEMANTICS 的 id。
export const DEMO_NODES: DemoNodeSeed[] = [
  {
    id: "demo-node-frontend-arch",
    nodeType: "rich-text",
    title: "Frontend Architecture",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-system",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    docs: {},
    referencedNodes: [],
  },
  {
    id: "demo-node-backend",
    nodeType: "text",
    title: "Backend Services",
    abstract: "",
    permission: "private",
    semanticId: "demo-sem-system",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    docs: {
      description: "Backend services powered by Rust and Salvo framework for high-performance API endpoints",
      technologies: ["Rust", "Salvo", "Tokio"],
    },
  },
  {
    id: "demo-node-storage",
    nodeType: "text",
    title: "Data Storage",
    abstract: "",
    permission: "private",
    semanticId: "demo-sem-system",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    docs: {
      description: "Data storage managing SQLite databases and object storage via MinIO",
      technologies: ["SQLite", "MinIO", "Diesel"],
    },
  },
  {
    id: "demo-node-auth",
    nodeType: "text",
    title: "Authentication System",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    docs: {
      description: "JWT-based authentication with secure password handling using bcrypt",
      features: ["JWT tokens", "Password hashing", "Session management"],
    },
  },
  {
    id: "demo-node-realtime",
    nodeType: "text",
    title: "Real-time Communication",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    docs: {
      description: "WebSocket-based real-time communication for live updates",
      features: ["WebSocket", "Live updates", "Event broadcasting"],
    },
  },
  {
    id: "demo-node-sys-diagram",
    nodeType: "image",
    title: "System Architecture Diagram",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    imageUrl: "https://picsum.photos/2048/1024",
    width: 2048,
    height: 1024,
    shootingTime: "2024-01-15T10:30:00Z",
  },
  {
    id: "demo-node-ui-mockup",
    nodeType: "image",
    title: "UI Design Mockup",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    imageUrl: "https://picsum.photos/2048/1024",
    width: 2048,
    height: 1024,
  },
  {
    id: "demo-node-dataflow",
    nodeType: "image",
    title: "Data Flow Visualization",
    abstract: "",
    permission: "private",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    imageUrl: "https://picsum.photos/2048/1024",
    width: 2048,
    height: 1024,
  },
  {
    id: "demo-node-screenshot",
    nodeType: "image",
    title: "Application Screenshot",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    imageUrl: "https://picsum.photos/2048/1024",
    width: 2048,
    height: 1024,
  },
  {
    id: "demo-node-product-demo",
    nodeType: "video",
    title: "Product Demo",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    coverUrl: "https://picsum.photos/2048/1024",
    duration: 120,
    source: "online",
  },
  {
    id: "demo-node-tutorial",
    nodeType: "video",
    title: "Getting Started Tutorial",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    coverUrl: "https://picsum.photos/2048/1024",
    duration: 300,
    source: "online",
  },
  {
    id: "demo-node-meeting-record",
    nodeType: "video",
    title: "Team Meeting Record",
    abstract: "",
    permission: "private",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    coverUrl: "https://picsum.photos/2048/1024",
    duration: 600,
    source: "online",
  },
  {
    id: "demo-node-podcast",
    nodeType: "audio",
    title: "Tech Podcast Episode",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 1800,
  },
  {
    id: "demo-node-meeting-audio",
    nodeType: "audio",
    title: "Team Meeting Recording",
    abstract: "",
    permission: "private",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 3600,
  },
  {
    id: "demo-node-interview",
    nodeType: "audio",
    title: "Developer Interview",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 2700,
  },
  {
    id: "demo-node-ml-paper",
    nodeType: "pdf",
    title: "Machine Learning Research Paper",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    pdfUrl: "https://arxiv.org/pdf/2604.14020",
    coverUrl: "https://picsum.photos/1024/768",
    pageCount: 24,
  },
  {
    id: "demo-node-api-docs",
    nodeType: "pdf",
    title: "API Documentation",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    pdfUrl: "https://arxiv.org/pdf/2604.14020",
    coverUrl: "https://picsum.photos/1024/768",
    pageCount: 15,
  },
  {
    id: "demo-node-design-spec",
    nodeType: "pdf",
    title: "Design System Spec",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    pdfUrl: "https://arxiv.org/pdf/2604.14020",
    coverUrl: "https://picsum.photos/1024/768",
    pageCount: 32,
  },
  {
    // A screenshot is an image now that a webpage node only holds source, so
    // the sample that used to be one is seeded as a real image node.
    id: "demo-node-tech-article",
    nodeType: "image",
    title: "Technical Article",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    imageUrl: "https://picsum.photos/1024/768",
    width: 1024,
    height: 768,
  },
  {
    id: "demo-node-project-docs",
    nodeType: "webpage",
    title: "Project Documentation",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    webpageLanguage: "html",
    webpageCode:
      '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>API Reference</title>\n  </head>\n  <body>\n    <h1>Documentation Page</h1>\n    <p>API reference and usage guide.</p>\n  </body>\n</html>',
  },
  {
    // Likewise a live address belongs to a website node, which is where the
    // url-mode sample moved when webpage stopped holding one.
    id: "demo-node-interactive-tut",
    nodeType: "website",
    title: "Interactive Tutorial",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    webUrl: "https://arxiv.org/html/2604.14020v1",
  },
  {
    id: "demo-node-bilibili",
    nodeType: "website",
    title: "Bilibili",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    webUrl: "https://bilibili.com",
    faviconUrl: "https://bilibili.com/favicon.ico",
  },
  {
    id: "demo-node-github",
    nodeType: "website",
    title: "GitHub Repository",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    webUrl: "https://github.com",
    faviconUrl: "https://github.com/favicon.ico",
  },
  {
    id: "demo-node-doc-site",
    nodeType: "website",
    title: "Project Documentation Site",
    abstract: "",
    permission: "public",
    semanticId: "demo-sem-component",
    isPinned: false,
    stateData: { client: {}, server: { weight: 8 } },
    webUrl: "https://docs.example.com",
    faviconUrl: "https://docs.example.com/favicon.ico",
  },
];

export const DEMO_EDGE_SEMANTICS: EdgeSemantic[] = [
  { id: "demo-edge-sem-belongs", name: "Belongs To", category: "hierarchy", color: "#3B82F6" },
  { id: "demo-edge-sem-depends", name: "Depends On", category: "association", color: "#10B981" },
  { id: "demo-edge-sem-calls", name: "Calls", category: "interaction", color: "#8B5CF6" },
  { id: "demo-edge-sem-refs", name: "References", category: "association", color: "#F59E0B" },
  { id: "demo-edge-sem-embeds", name: "Embeds", category: "association", color: "#EF4444" },
];

export interface DemoEdgeSeed {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  direction: "forward" | "reverse" | "bidirectional" | "undirected";
  semanticId: EdgeSemantic["id"];
  weight: number;
}

export const DEMO_EDGES: DemoEdgeSeed[] = [
  { id: "demo-edge-1", from: "demo-node-frontend-arch", to: "demo-node-sys-diagram", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-2", from: "demo-node-backend", to: "demo-node-auth", direction: "forward", semanticId: "demo-edge-sem-belongs", weight: 1 },
  { id: "demo-edge-3", from: "demo-node-frontend-arch", to: "demo-node-ui-mockup", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-4", from: "demo-node-storage", to: "demo-node-dataflow", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-5", from: "demo-node-frontend-arch", to: "demo-node-product-demo", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 3 },
  { id: "demo-edge-6", from: "demo-node-frontend-arch", to: "demo-node-tutorial", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 3 },
  { id: "demo-edge-7", from: "demo-node-backend", to: "demo-node-meeting-record", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-8", from: "demo-node-frontend-arch", to: "demo-node-podcast", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-9", from: "demo-node-backend", to: "demo-node-meeting-audio", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-10", from: "demo-node-auth", to: "demo-node-interview", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 1 },
  { id: "demo-edge-11", from: "demo-node-storage", to: "demo-node-ml-paper", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 3 },
  { id: "demo-edge-12", from: "demo-node-backend", to: "demo-node-api-docs", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-13", from: "demo-node-frontend-arch", to: "demo-node-design-spec", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-14", from: "demo-node-frontend-arch", to: "demo-node-tech-article", direction: "forward", semanticId: "demo-edge-sem-embeds", weight: 3 },
  { id: "demo-edge-15", from: "demo-node-backend", to: "demo-node-project-docs", direction: "forward", semanticId: "demo-edge-sem-embeds", weight: 2 },
  { id: "demo-edge-16", from: "demo-node-auth", to: "demo-node-interactive-tut", direction: "forward", semanticId: "demo-edge-sem-embeds", weight: 2 },
  { id: "demo-edge-17", from: "demo-node-frontend-arch", to: "demo-node-bilibili", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-18", from: "demo-node-backend", to: "demo-node-github", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-19", from: "demo-node-storage", to: "demo-node-doc-site", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-20", from: "demo-node-product-demo", to: "demo-node-tutorial", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-21", from: "demo-node-sys-diagram", to: "demo-node-ml-paper", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-22", from: "demo-node-project-docs", to: "demo-node-api-docs", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 3 },
  { id: "demo-edge-23", from: "demo-node-bilibili", to: "demo-node-product-demo", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
  { id: "demo-edge-24", from: "demo-node-podcast", to: "demo-node-interview", direction: "forward", semanticId: "demo-edge-sem-refs", weight: 2 },
];

export interface DemoViewSeed {
  name: string;
  viewType: "Force" | "Flow";
  isPinned: boolean;
  visualConfig?: {
    backgroundColor?: string;
    backgroundStyle?: "solid" | "grid" | "dots" | "none";
    gridSpacing?: number;
    gridColor?: string;
    snapToGrid?: boolean;
    showMinimap?: boolean;
  };
  filterConfig: {
    selectedNodes?: NodeId[];
    ruleGroup?: unknown;
    collectionType?: string;
  };
}

export const DEMO_VIEWS: DemoViewSeed[] = [
  {
    name: "Demo View",
    viewType: "Force",
    isPinned: true,
    visualConfig: { showMinimap: true, backgroundStyle: "grid" },
    filterConfig: {},
  },
];
