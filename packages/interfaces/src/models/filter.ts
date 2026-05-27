import type { RuleGroupType, Field } from "@workspace/utils";
import type { NodeId } from "./node";
import { NODE_DATA_TYPES } from "./node/types";
import type { EdgeType, EdgeDirection } from "./edge/types";

export interface FilterConfig {
  //Filter->selectedNodes AND ruleGroup
  //example
  //[1,2,3,4,5,6]
  //selectedNodes:[1,6] ruleGroup:even
  //filter->[1,2,4,6]
  selectedNodes?: NodeId[];
  ruleGroup?: RuleGroupType;
  collectionType?: string;
}

// Node filter fields for react-querybuilder
export const NODE_FILTER_FIELDS: Field[] = [
  {
    name: "id",
    label: "ID",
    inputType: "text",
  },
  {
    name: "title",
    label: "标题",
    inputType: "text",
  },
  {
    name: "abstract",
    label: "摘要",
    inputType: "text",
  },
  {
    name: "permission",
    label: "权限",
    inputType: "select",
    values: [
      { name: "private", label: "私有" },
      { name: "public", label: "公开" },
      { name: "restricted", label: "受限" },
    ],
  },
  {
    name: "semanticId",
    label: "语义标签",
    inputType: "text",
  },
  {
    name: "tags",
    label: "标签",
    inputType: "text",
  },
  {
    name: "nodeType",
    label: "节点类型",
    inputType: "select",
    values: NODE_DATA_TYPES.map((type) => ({ name: type, label: type })),
  },
  {
    name: "createdAt",
    label: "创建时间",
    inputType: "date",
  },
  {
    name: "updatedAt",
    label: "更新时间",
    inputType: "date",
  },
];

// Edge filter fields for react-querybuilder
export const EDGE_FILTER_FIELDS: Field[] = [
  {
    name: "id",
    label: "ID",
    inputType: "text",
  },
  {
    name: "from",
    label: "起始节点",
    inputType: "text",
  },
  {
    name: "to",
    label: "目标节点",
    inputType: "text",
  },
  {
    name: "direction",
    label: "方向",
    inputType: "select",
    values: (["forward", "reverse", "bidirectional", "undirected"] as EdgeDirection[]).map(
      (d) => ({
        name: d,
        label: d === "forward" ? "正向" : d === "reverse" ? "反向" : "双向",
      }),
    ),
  },
  {
    name: "semanticId",
    label: "语义标签",
    inputType: "text",
  },
  {
    name: "category",
    label: "边类别",
    inputType: "select",
    values: (
      ["hierarchy", "flow", "association", "interaction"] as EdgeType[]
    ).map((c) => ({
      name: c,
      label:
        c === "hierarchy"
          ? "层级"
          : c === "flow"
            ? "流动"
            : c === "association"
              ? "关联"
              : "交互",
    })),
  },
  {
    name: "weight",
    label: "权重",
    inputType: "number",
    values: [
      { name: "1", label: "1 (最近)" },
      { name: "2", label: "2" },
      { name: "3", label: "3" },
      { name: "4", label: "4" },
      { name: "5", label: "5 (最远)" },
    ],
  },
  {
    name: "createdAt",
    label: "创建时间",
    inputType: "date",
  },
  {
    name: "updatedAt",
    label: "更新时间",
    inputType: "date",
  },
];

// All filter fields combined
export const ALL_FILTER_FIELDS: Field[] = [
  {
    name: "node",
    label: "节点",
    subFields: NODE_FILTER_FIELDS,
  },
  {
    name: "edge",
    label: "边",
    subFields: EDGE_FILTER_FIELDS,
  },
];
