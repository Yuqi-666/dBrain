import type {
  EdgeData,
  EdgeId,
  EdgeSemantic,
  EdgeSemanticId,
  EdgeType,
  NodeData,
  NodeId,
  View,
} from "@workspace/interfaces";
import type { RuleGroupType, RuleType } from "react-querybuilder";

type RuleObject = RuleType;

interface FilterResult {
  filteredNodes: Map<NodeId, NodeData>;
  filteredEdges: Map<EdgeId, EdgeData>;
}

/**
 * Resolve the effective edge category (EdgeType) for a single edge.
 *
 * `edgeType` was removed from `EdgeBase` — the category now lives solely on
 * `EdgeSemantic.category`. Edges without a `semanticId`, or whose semantic is
 * absent from the map, fall back to `"association"`.
 */
export function resolveEdgeCategory(
  edge: EdgeData,
  edgeSemantics: ReadonlyMap<EdgeSemanticId, EdgeSemantic>,
): EdgeType {
  if (!edge.semanticId) return "association";
  return edgeSemantics.get(edge.semanticId)?.category ?? "association";
}

function getNodeFieldValue(node: NodeData, field: string): unknown {
  switch (field) {
    case "id":
      return node.id;
    case "title":
      return node.title;
    case "abstract":
      return node.abstract;
    case "permission":
      return node.permission;
    case "semanticId":
      return node.semanticId;
    case "tags":
      return node.tags;
    case "nodeType":
      return node.nodeType;
    case "createdAt":
      return node.createdAt;
    case "updatedAt":
      return node.updatedAt;
    default:
      return undefined;
  }
}

function getEdgeFieldValue(
  edge: EdgeData,
  field: string,
  edgeSemantics: ReadonlyMap<EdgeSemanticId, EdgeSemantic>,
): unknown {
  switch (field) {
    case "id":
      return edge.id;
    case "from":
      return edge.from;
    case "to":
      return edge.to;
    case "direction":
      return edge.direction;
    case "semanticId":
      return edge.semanticId;
    case "category":
      return resolveEdgeCategory(edge, edgeSemantics);
    case "weight":
      return edge.stateData?.server?.weight;
    case "createdAt":
      return edge.createdAt;
    case "updatedAt":
      return edge.updatedAt;
    default:
      return undefined;
  }
}

function compareValues(
  actual: unknown,
  operator: string,
  expected: unknown,
): boolean {
  if (operator === "null") {
    return actual === null || actual === undefined;
  }
  if (operator === "notNull") {
    return actual !== null && actual !== undefined;
  }

  if (actual === null || actual === undefined) {
    return false;
  }

  switch (operator) {
    case "=":
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );
    case ">=":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );
    case "<":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );
    case "<=":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase().includes(expected.toLowerCase());
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;
    case "notContains":
      if (typeof actual === "string" && typeof expected === "string") {
        return !actual.toLowerCase().includes(expected.toLowerCase());
      }
      if (Array.isArray(actual)) {
        return !actual.includes(expected);
      }
      return true;
    case "beginsWith":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase().startsWith(expected.toLowerCase());
      }
      return false;
    case "endsWith":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase().endsWith(expected.toLowerCase());
      }
      return false;
    case "in":
      if (Array.isArray(expected)) {
        return expected.includes(actual);
      }
      return false;
    case "notIn":
      if (Array.isArray(expected)) {
        return !expected.includes(actual);
      }
      return true;
    default:
      return false;
  }
}

function evaluateRule(
  rule: RuleObject,
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  edgeSemantics: ReadonlyMap<EdgeSemanticId, EdgeSemantic>,
): boolean {
  const { field, operator, value } = rule;

  const isNodeFilter =
    field in {} ||
    [
      "id",
      "title",
      "abstract",
      "permission",
      "semanticId",
      "tags",
      "nodeType",
      "createdAt",
      "updatedAt",
    ].includes(field);
  const isEdgeFilter = [
    "id",
    "from",
    "to",
    "direction",
    "semanticId",
    "category",
    "weight",
    "createdAt",
    "updatedAt",
  ].includes(field);

  if (isNodeFilter) {
    for (const node of nodes.values()) {
      const fieldValue = getNodeFieldValue(node, field);
      if (compareValues(fieldValue, operator, value)) {
        return true;
      }
    }
    return false;
  }

  if (isEdgeFilter) {
    for (const edge of edges.values()) {
      const fieldValue = getEdgeFieldValue(edge, field, edgeSemantics);
      if (compareValues(fieldValue, operator, value)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

function evaluateRuleGroup(
  ruleGroup: RuleGroupType,
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  edgeSemantics: ReadonlyMap<EdgeSemanticId, EdgeSemantic>,
): boolean {
  const { combinator, rules } = ruleGroup;

  if (!rules || rules.length === 0) {
    return true;
  }

  const results = rules.map((rule) => {
    if ("rules" in rule) {
      return evaluateRuleGroup(
        rule as RuleGroupType,
        nodes,
        edges,
        edgeSemantics,
      );
    }
    return evaluateRule(rule as RuleObject, nodes, edges, edgeSemantics);
  });

  if (combinator === "and") {
    return results.every((r) => r);
  } else {
    return results.some((r) => r);
  }
}

function shouldIncludeNode(
  nodeId: NodeId,
  node: NodeData,
  ruleGroup: RuleGroupType,
  edges: Map<EdgeId, EdgeData>,
  edgeSemantics: ReadonlyMap<EdgeSemanticId, EdgeSemantic>,
): boolean {
  const tempNodes = new Map<NodeId, NodeData>([[nodeId, node]]);
  return evaluateRuleGroup(ruleGroup, tempNodes, edges, edgeSemantics);
}

export function filterByViewFilterConfig(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  view?: View,
  edgeSemantics?: ReadonlyMap<EdgeSemanticId, EdgeSemantic>,
): FilterResult {
  const filterConfig = view?.filterConfig;
  const semantics = edgeSemantics ?? new Map<EdgeSemanticId, EdgeSemantic>();

  if (!filterConfig) {
    return { filteredNodes: new Map(nodes), filteredEdges: new Map(edges) };
  }

  const selectedSet =
    filterConfig.selectedNodes && filterConfig.selectedNodes.length > 0
      ? new Set(filterConfig.selectedNodes)
      : null;
  const hasRule = filterConfig.ruleGroup !== undefined;

  // Global view (no enumeration AND no filter) => everything.
  const isGlobal = !selectedSet && !hasRule;

  const filteredNodes = new Map<NodeId, NodeData>();
  nodes.forEach((node, nodeId) => {
    if (isGlobal) {
      filteredNodes.set(nodeId, node);
      return;
    }
    const inEnumeration = selectedSet ? selectedSet.has(nodeId) : false;
    const matchesRule = hasRule
      ? shouldIncludeNode(nodeId, node, filterConfig.ruleGroup!, edges, semantics)
      : false;
    if (inEnumeration || matchesRule) {
      filteredNodes.set(nodeId, node);
    }
  });

  const filteredEdges = new Map<EdgeId, EdgeData>();
  edges.forEach((edge, edgeId) => {
    const sourceIn = filteredNodes.has(edge.from);
    const targetIn = filteredNodes.has(edge.to);
    if (sourceIn && targetIn) {
      filteredEdges.set(edgeId, edge);
    }
  });

  return { filteredNodes, filteredEdges };
}
