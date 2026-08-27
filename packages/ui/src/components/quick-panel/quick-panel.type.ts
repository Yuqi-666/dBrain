import type { NodeDataType } from "@workspace/interfaces";
import { NODE_DATA_TYPES } from "@workspace/interfaces";
import type { QuickPanelMode } from "@workspace/store";

export type { QuickPanelMode };

export const QUICK_TAB_KEYS = [
  "all",
  "text",
  "media",
  "website",
  "collection",
  "commands",
  "node-types",
  "edge-types",
] as const;

export type QuickTabKey = (typeof QUICK_TAB_KEYS)[number];

export interface QuickTabConfig {
  key: QuickTabKey;
  label: string;
  nodeTypes?: NodeDataType[];
  kind: "nodes" | "commands" | "node-types" | "edge-types";
}

export const QUICK_TABS: QuickTabConfig[] = [
  { key: "all", label: "全部", nodeTypes: [...NODE_DATA_TYPES], kind: "nodes" },
  {
    key: "text",
    label: "文本",
    nodeTypes: ["text", "rich-text"],
    kind: "nodes",
  },
  {
    key: "media",
    label: "媒体",
    nodeTypes: ["image", "audio", "video", "pdf"],
    kind: "nodes",
  },
  {
    key: "website",
    label: "网站",
    nodeTypes: ["webpage", "website"],
    kind: "nodes",
  },
  {
    key: "collection",
    label: "集合",
    nodeTypes: ["collection"],
    kind: "nodes",
  },
  { key: "commands", label: "命令", kind: "commands" },
  { key: "node-types", label: "节点类型", kind: "node-types" },
  { key: "edge-types", label: "边类型", kind: "edge-types" },
];

export type QuickGroupKey = "nodes" | "commands" | "types";

export type SemanticKind = "node" | "edge";

export interface QuickSearchMatch {
  id: string;
  title: string;
  subtitle?: string;
  group: QuickGroupKey;
  icon?: "node" | "command" | "type";
  nodeType?: NodeDataType;
  edgeType?: string;
  semanticId?: string;
  semanticKind?: SemanticKind;
  semanticName?: string;
  color?: string;
  onSelect?: () => void;
}

export function normalizeKeyword(text: string): string {
  return text.toLowerCase().trim();
}

export function stripSlashPrefix(query: string): string {
  return query.replace(/^\//, "");
}
