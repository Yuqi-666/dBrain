/**
 * Domain Repository Interfaces (Ports)
 *
 * These interfaces define the contract for data access.
 * Implementations (Adapters) reside in the infrastructure layer.
 *
 * Following DDD conventions:
 * - Repository interfaces are defined in the domain layer (ports)
 * - Repository implementations are in the infrastructure layer (adapters)
 * - All methods return domain entities or value objects
 * - Query objects are plain objects for flexibility
 */

import type {
  Node,
  TextNode,
  ImageNode,
  PdfNode,
  VideoNode,
  AudioNode,
  WebpageNode,
  WebsiteNode,
  CollectionNode,
  RichTextNode,
  DatabaseNode,
} from "../models/node/entities";
import type {
  NodeId,
  Permission,
  NodeType,
} from "../models/node/value-objects";

type NodeSemanticId = string;
type NodeTagId = string;

import { Edge } from "../models/edge/entities";
import type {
  EdgeId,
  EdgeSemanticId,
  EdgeDirection,
  EdgeType,
} from "../models/edge/value-objects";

import { View } from "../models/view/entities";
import type { ViewId, ViewType } from "../models/view/value-objects";

import type {
  NodeSemantic,
  EdgeSemantic,
  NodeTag,
} from "../models/semantic/entities";
import type { SemanticId, TagId } from "../models/semantic/value-objects";

// ============================================================
// Query Objects (Plain objects for flexible querying)
// ============================================================

/**
 * Node query object for flexible filtering.
 * Plain object - not a value object to keep domain pure.
 */
export interface NodeQuery {
  nodeType?: NodeType["value"];
  semanticId?: NodeSemanticId;
  tags?: NodeTagId[];
  isPinned?: boolean;
  searchTerm?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  permission?: Permission["value"];
  workspaceId?: string;
}

/**
 * Edge query object for flexible filtering.
 */
export interface EdgeQuery {
  from?: NodeId;
  to?: NodeId;
  semanticId?: EdgeSemanticId;
  direction?: EdgeDirection;
  workspaceId?: string;
}

/**
 * View query object for flexible filtering.
 */
export interface ViewQuery {
  isPinned?: boolean;
  viewType?: ViewType["value"];
  workspaceId?: string;
}

// ============================================================
// INodeRepository - Node Aggregate Root
// ============================================================

/**
 * Repository port for Node aggregate root.
 *
 * Single repository handles all 10 node types (TextNode, ImageNode, …,
 * DatabaseNode) Type-specific finders return exact types for type safety.
 */
export interface INodeRepository {
  // ----- Single Entity Operations -----

  /**
   * Find a node by its ID.
   * Returns the base Node type - use type-specific finders for exact types.
   */
  findById(id: NodeId): Promise<Node | null>;

  /**
   * Save (create or update) a node.
   */
  save(node: Node): Promise<Node>;

  /**
   * Delete a node by ID.
   */
  delete(id: NodeId): Promise<void>;

  // ----- Type-Specific Finders -----

  findTextNode(id: NodeId): Promise<TextNode | null>;
  findImageNode(id: NodeId): Promise<ImageNode | null>;
  findPdfNode(id: NodeId): Promise<PdfNode | null>;
  findVideoNode(id: NodeId): Promise<VideoNode | null>;
  findAudioNode(id: NodeId): Promise<AudioNode | null>;
  findWebpageNode(id: NodeId): Promise<WebpageNode | null>;
  findWebsiteNode(id: NodeId): Promise<WebsiteNode | null>;
  findCollectionNode(id: NodeId): Promise<CollectionNode | null>;
  findRichTextNode(id: NodeId): Promise<RichTextNode | null>;
  findDatabaseNode(id: NodeId): Promise<DatabaseNode | null>;

  // ----- Collection Operations -----

  /**
   * Find all nodes matching query (no pagination).
   */
  findAll(query?: NodeQuery): Promise<Node[]>;

  /**
   * Find multiple nodes by their IDs.
   * Preserves order of input IDs in result.
   */
  findByIds(ids: NodeId[]): Promise<Node[]>;

  /**
   * Count nodes matching query.
   */
  count(query?: NodeQuery): Promise<number>;

  // ----- Batch Operations -----

  /**
   * Save multiple nodes in batch.
   * Implementations should use bulk insert/update for performance.
   */
  saveMany(nodes: Node[]): Promise<Node[]>;

  /**
   * Delete multiple nodes in batch.
   */
  deleteMany(ids: NodeId[]): Promise<void>;

  /**
   * Update tags for multiple nodes.
   */
  updateTags(ids: NodeId[], tags: NodeTagId[]): Promise<Node[]>;

  // ----- Quick Access Operations -----

  /**
   * Find all pinned nodes.
   */
  findPinned(): Promise<Node[]>;

  /**
   * Find recently updated nodes.
   * @param limit Maximum number of results
   */
  findRecentlyUpdated(limit: number): Promise<Node[]>;
}

// ============================================================
// IEdgeRepository - Edge Aggregate
// ============================================================

/**
 * Repository port for Edge entities.
 */
export interface IEdgeRepository {
  // ----- Single Entity Operations -----

  findById(id: EdgeId): Promise<Edge | null>;

  save(edge: Edge): Promise<Edge>;

  delete(id: EdgeId): Promise<void>;

  // ----- Collection Operations -----

  /**
   * Find all edges matching query (no pagination).
   */
  findAll(query?: EdgeQuery): Promise<Edge[]>;

  findByIds(ids: EdgeId[]): Promise<Edge[]>;

  /**
   * Find all edges connected to a specific node (as source or target).
   */
  findByNodeId(nodeId: NodeId): Promise<Edge[]>;

  /**
   * Find edges between two specific nodes.
   */
  findByEndpoints(from: NodeId, to: NodeId): Promise<Edge[]>;

  count(query?: EdgeQuery): Promise<number>;

  // ----- Batch Operations -----

  saveMany(edges: Edge[]): Promise<Edge[]>;

  deleteMany(ids: EdgeId[]): Promise<void>;
}

// ============================================================
// IViewRepository - View Aggregate
// ============================================================

/**
 * Repository port for View entities.
 */
export interface IViewRepository {
  // ----- Single Entity Operations -----

  findById(id: ViewId): Promise<View | null>;

  save(view: View): Promise<View>;

  delete(id: ViewId): Promise<void>;

  // ----- Collection Operations -----

  /**
   * Find all views matching query (no pagination).
   */
  findAll(query?: ViewQuery): Promise<View[]>;

  /**
   * Find all views that contain a specific node in their filter config.
   */
  findByNodeId(nodeId: NodeId): Promise<View[]>;

  /**
   * Find all pinned views.
   */
  findPinned(): Promise<View[]>;

  count(query?: ViewQuery): Promise<number>;

  // ----- Batch Operations -----

  saveMany(views: View[]): Promise<View[]>;

  deleteMany(ids: ViewId[]): Promise<void>;
}

// ============================================================
// Semantic Repositories
// ============================================================

/**
 * Query object for filtering node semantics.
 */
export interface NodeSemanticQuery {
  workspaceId?: string;
}

/**
 * Query object for filtering edge semantics.
 */
export interface EdgeSemanticQuery {
  workspaceId?: string;
}

/**
 * Query object for filtering node tags.
 */
export interface NodeTagQuery {
  workspaceId?: string;
}

/**
 * Repository port for NodeSemantic entities.
 */
export interface INodeSemanticRepository {
  findById(id: SemanticId): Promise<NodeSemantic | null>;

  save(semantic: NodeSemantic): Promise<NodeSemantic>;

  delete(id: SemanticId): Promise<void>;

  findAll(query?: NodeSemanticQuery): Promise<NodeSemantic[]>;

  /**
   * Find semantic by exact name match.
   */
  findByName(name: string): Promise<NodeSemantic | null>;

  /**
   * Find semantics that match a color.
   */
  findByColor(color: string): Promise<NodeSemantic[]>;
}

/**
 * Repository port for EdgeSemantic entities.
 */
export interface IEdgeSemanticRepository {
  findById(id: SemanticId): Promise<EdgeSemantic | null>;

  save(semantic: EdgeSemantic): Promise<EdgeSemantic>;

  delete(id: SemanticId): Promise<void>;

  findAll(query?: EdgeSemanticQuery): Promise<EdgeSemantic[]>;

  /**
   * Find semantic by exact name match.
   */
  findByName(name: string): Promise<EdgeSemantic | null>;

  /**
   * Find all semantics of a specific category.
   */
  findByCategory(category: EdgeType["value"]): Promise<EdgeSemantic[]>;
}

/**
 * Repository port for NodeTag entities.
 */
export interface INodeTagRepository {
  findById(id: TagId): Promise<NodeTag | null>;

  save(tag: NodeTag): Promise<NodeTag>;

  delete(id: TagId): Promise<void>;

  findAll(query?: NodeTagQuery): Promise<NodeTag[]>;

  /**
   * Find tag by exact name match.
   */
  findByName(name: string): Promise<NodeTag | null>;

  /**
   * Find multiple tags by their IDs.
   */
  findByIds(ids: TagId[]): Promise<NodeTag[]>;
}

// ============================================================
// IUserRepository - User Aggregate
// ============================================================

import { User } from "../models/user";
import { Email } from "../models/user/value-objects";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;

  /**
   * Read a user by id using the supplied JWT as the request identity.
   * `users.viewRule = id = @request.auth.id`, so an unauthenticated client
   * (the shared singleton) is denied with 404. Use for `auth.me` lookups that
   * hold a server-verified token.
   */
  findByIdWithToken(id: string, token: string): Promise<User | null>;

  findByEmail(email: Email): Promise<User | null>;

  save(user: User): Promise<User>;

  verifyPassword(
    email: Email,
    password: string,
  ): Promise<{ valid: boolean; user: User | null; token?: string }>;

  createUser(
    email: Email,
    password: string,
    nickname: string,
  ): Promise<User>;
}

// ============================================================
// IWorkspaceRepository - Workspace Aggregate
// ============================================================

import { Workspace, WorkspaceMember } from "../models/workspace";
import { WorkspaceId, WorkspaceMemberId } from "../models/workspace/value-objects";

export interface IWorkspaceRepository {
  findById(id: WorkspaceId): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<Workspace>;
  delete(id: WorkspaceId): Promise<void>;
  findAll(): Promise<Workspace[]>;
  findByOwnerId(ownerId: string): Promise<Workspace[]>;
}

export interface IWorkspaceMemberRepository {
  findById(id: WorkspaceMemberId): Promise<WorkspaceMember | null>;
  save(member: WorkspaceMember): Promise<WorkspaceMember>;
  delete(id: WorkspaceMemberId): Promise<void>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceMember[]>;
  findByUserId(userId: string): Promise<WorkspaceMember[]>;
  findByWorkspaceAndUser(
    workspaceId: WorkspaceId,
    userId: string,
  ): Promise<WorkspaceMember | null>;
}
