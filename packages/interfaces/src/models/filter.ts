/**
 * Shared Filter Model
 *
 * Unified filter types for views, collection nodes, and future search functionality.
 *
 * Field applicability:
 * - Basic fields: type, tags, createdAt, updatedAt (available in all contexts)
 * - Collection-specific: customProperty
 * - View-specific: permission, incomingEdges, outgoingEdges, referenceCount
 *
 * Operator applicability:
 * - Basic operators: equals, contains, startsWith, endsWith, gt, lt, between (available in all contexts)
 * - View-specific: notEquals, in
 */

/**
 * Unified filter field types
 * - Views use all fields
 * - Collections use: type, tags, createdAt, updatedAt, customProperty
 * - Search can use all fields
 */
export type FilterField =
  | "type"
  | "tags"
  | "createdAt"
  | "updatedAt"
  | "permission"
  | "customProperty"
  | "incomingEdges"
  | "outgoingEdges"
  | "referenceCount";

/**
 * Unified filter operator types
 * - Views use all operators
 * - Collections use: equals, contains, startsWith, endsWith, gt, lt, between
 * - Search can use all operators
 */
export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "lt"
  | "between"
  | "in";

/**
 * Single filter rule combining field, operator, and value
 */
export interface FilterRule {
  field: FilterField;
  operator: FilterOperator;
  value: string | number | string[];
}

/**
 * Filter logic for combining multiple rules
 */
export type FilterLogic = "and" | "or" | "not";

/**
 * Unified filter configuration
 * Can be used by views (with edgeFilters) and collections (without edgeFilters)
 */
export interface FilterConfig {
  /** Filter rules for nodes */
  nodeFilters?: FilterRule[];
  /** Filter rules for edges (optional, used by views) */
  edgeFilters?: FilterRule[];
  /** Logic for combining multiple filter rules */
  logic?: FilterLogic;
}

/**
 * Metadata: Which fields are applicable to which contexts
 */
export const FILTER_FIELD_META: Record<
  FilterField,
  { views: boolean; collections: boolean; search: boolean; description: string }
> = {
  type: {
    views: true,
    collections: true,
    search: true,
    description: "Filter by node/edge type",
  },
  tags: {
    views: true,
    collections: true,
    search: true,
    description: "Filter by tags",
  },
  createdAt: {
    views: true,
    collections: true,
    search: true,
    description: "Filter by creation date",
  },
  updatedAt: {
    views: true,
    collections: true,
    search: true,
    description: "Filter by last updated date",
  },
  permission: {
    views: true,
    collections: false,
    search: true,
    description: "Filter by permission level",
  },
  customProperty: {
    views: true,
    collections: true,
    search: true,
    description: "Filter by custom property",
  },
  incomingEdges: {
    views: true,
    collections: false,
    search: true,
    description: "Filter by number of incoming edges",
  },
  outgoingEdges: {
    views: true,
    collections: false,
    search: true,
    description: "Filter by number of outgoing edges",
  },
  referenceCount: {
    views: true,
    collections: false,
    search: true,
    description: "Filter by reference count",
  },
};

/**
 * Metadata: Which operators are applicable to which contexts
 */
export const FILTER_OPERATOR_META: Record<
  FilterOperator,
  { views: boolean; collections: boolean; search: boolean; description: string }
> = {
  equals: {
    views: true,
    collections: true,
    search: true,
    description: "Exact match",
  },
  notEquals: {
    views: true,
    collections: false,
    search: true,
    description: "Not equal to",
  },
  contains: {
    views: true,
    collections: true,
    search: true,
    description: "Contains substring",
  },
  startsWith: {
    views: true,
    collections: true,
    search: true,
    description: "Starts with",
  },
  endsWith: {
    views: true,
    collections: true,
    search: true,
    description: "Ends with",
  },
  gt: {
    views: true,
    collections: true,
    search: true,
    description: "Greater than",
  },
  lt: {
    views: true,
    collections: true,
    search: true,
    description: "Less than",
  },
  between: {
    views: true,
    collections: true,
    search: true,
    description: "Between two values (inclusive)",
  },
  in: {
    views: true,
    collections: false,
    search: true,
    description: "Matches any value in array",
  },
};

/**
 * Helper type: Get fields applicable to a specific context
 */
export type FilterFieldsForContext<
  T extends "views" | "collections" | "search",
> = T extends "views"
  ? FilterField
  : T extends "collections"
    ? "type" | "tags" | "createdAt" | "updatedAt" | "customProperty"
    : FilterField;

/**
 * Helper type: Get operators applicable to a specific context
 */
export type FilterOperatorsForContext<
  T extends "views" | "collections" | "search",
> = T extends "views"
  ? FilterOperator
  : T extends "collections"
    ?
        | "equals"
        | "contains"
        | "startsWith"
        | "endsWith"
        | "gt"
        | "lt"
        | "between"
    : FilterOperator;
