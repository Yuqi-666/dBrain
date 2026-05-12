// NodeSemantic queries
export interface GetNodeSemanticByIdQuery { id: string; }
export interface ListNodeSemanticsQuery {}
export interface GetNodeSemanticByNameQuery { name: string; }
export interface GetNodeSemanticsByColorQuery { color: string; }

// EdgeSemantic queries
export interface GetEdgeSemanticByIdQuery { id: string; }
export interface ListEdgeSemanticsQuery {}
export interface GetEdgeSemanticByNameQuery { name: string; }
export interface GetEdgeSemanticsByCategoryQuery { category: string; }

// NodeTag queries
export interface GetNodeTagByIdQuery { id: string; }
export interface ListNodeTagsQuery {}
export interface GetNodeTagByNameQuery { name: string; }
export interface GetNodeTagsByIdsQuery { ids: string[]; }