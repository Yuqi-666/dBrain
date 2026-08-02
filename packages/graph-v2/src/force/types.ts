/**
 * Force mode PRIVATE types
 *
 * Authoritative definitions for the Comlink RPC surface between the main
 * thread orchestrator (`force/ForceGraph.tsx`) and the WebWorker
 * (`force/worker/force.worker.ts`). The worker exposes `WorkerInbound` and
 * pushes `WorkerEvent`s back to the main thread.
 *
 * Cross-document contract (per `docs/07-agent/graph-v2/src/design.md` §3.1):
 *   - Method names + signatures here MUST match `force/worker/api.ts` exactly.
 *
 * Architectural rule (PRIVATE module): this module DEFINES its own
 * force-specific types (WorkerInbound / WorkerEvent / ForceNodeSeed /
 * ForceLinkSeed / ForceConfig / ForceStyle / ForceDiffPayload / etc.)
 * and USES shared types (`UiState` / `Modifiers`) imported from `../types`.
 *
 * `flow/*` MUST NOT import from this module. Anything both sides share
 * lives in `../types`.
 */

import type {
  EdgeDirection,
  EdgeId,
  EdgeType,
  EdgeWeight,
  NodeDataType,
  NodeId,
} from "@workspace/interfaces";
import type { Modifiers } from "../types";

// -----------------------------------------------------------------------
// ProxiedDomEvent
// -----------------------------------------------------------------------

/**
 * Serialized DOM events forwarded from the main thread orchestrator to the
 * worker. The worker has no DOM access (Comlink cannot transfer DOM nodes)
 * so all pointer/wheel/contextmenu/key events are first captured by the
 * main thread `eventListener.ts`, then converted into a `ProxiedDomEvent`
 * and shipped through the Comlink RPC.
 *
 * Spec: force/design.md §4.1, worker/design.md §6.1
 */
export type ProxiedDomEvent =
  | {
      type: "pointer-down";
      x: number;
      y: number;
      button: number;
      modifiers: Modifiers;
    }
  | {
      type: "pointer-move";
      x: number;
      y: number;
      buttons: number;
      modifiers: Modifiers;
    }
  | {
      type: "pointer-up";
      x: number;
      y: number;
      button: number;
      modifiers: Modifiers;
    }
  | {
      type: "wheel";
      deltaX: number;
      deltaY: number;
      modifiers: Modifiers;
    }
  | {
      type: "context-menu";
      x: number;
      y: number;
      modifiers: Modifiers;
    }
  | {
      type: "key-down";
      key: string;
      code: string;
      modifiers: Modifiers;
    }
  | {
      type: "key-up";
      key: string;
      code: string;
      modifiers: Modifiers;
    };

// -----------------------------------------------------------------------
// 3. Force UI state (force-mode private — flow does not use this)
// -----------------------------------------------------------------------

/**
 * 7-state UI state machine used by force mode (per main design
 * L159-167 and L194-201). Order is significant — `styleConfig.ts`
 * uses it as a key for the `NODE_STATE_STYLES` / `EDGE_STATE_STYLES`
 * records.
 *
 * PRIVATE to `force/*`. Flow mode does not express UI state — its node
 * variants rely on ReactFlow's built-in `selected` prop for the only
 * selected visual (the `rf-selected` class).
 */
export type UiState =
  | "default"
  | "hover"
  | "selected"
  | "active"
  | "neighborActive"
  | "inactive"
  | "disabled";

// -----------------------------------------------------------------------
// 4. Force seeds (main → worker transport DTOs)
// -----------------------------------------------------------------------

/**
 * Lightweight DTO for shipping node data from main → worker.
 *
 * Notes:
 *   - `x` / `y` are initial coordinates read from
 *     `stateData.position[currentViewId]` (cross-mode position backfill,
 *     main design L432). When absent, d3-force uses phyllotaxis fallback
 *     automatically.
 *   - `fx` / `fy` are *pin coordinates* — set only when the user is
 *     actively dragging a node.
 *   - `weight` is the visual radius (also reused as collide radius).
 *   - The worker fills in internal d3 fields (`vx`, `vy`, `index`) on
 *     mutation. Do not pass them here.
 */
export interface ForceNodeSeed {
  id: NodeId;
  /** First-load x from `stateData.position[viewId]` (optional). */
  x?: number;
  /** First-load y from `stateData.position[viewId]` (optional). */
  y?: number;
  /** Pin x (drag in progress). Worker may also auto-pin via setNodeFixed. */
  fx?: number;
  /** Pin y (drag in progress). */
  fy?: number;
  /** 7-state UI classification. Worker-internal hover is tracked separately. */
  ui: UiState;
  /** Semantic color (overrides theme default). */
  semanticColor?: string;
  /** Node display title (used for the canvas label). */
  title: string;
  /** Visual radius — also used for forceCollide. Defaults to 8. */
  weight?: number;
  /** Node type (used by edge weight calc / future custom rendering). */
  nodeType?: NodeDataType;
  /** View id this node belongs to (camelCase). */
  viewId?: string;
}

/**
 * Lightweight DTO for shipping edge data from main → worker.
 *
 * `source` / `target` are *NodeId strings*, not object references —
 * the worker resolves them against its internal node map.
 */
export interface ForceLinkSeed {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  edgeType: EdgeType;
  direction: EdgeDirection;
  ui: UiState;
  semanticColor?: string;
  weight?: EdgeWeight;
}

// -----------------------------------------------------------------------
// 4. Configs, diffs, payloads
// -----------------------------------------------------------------------

/** d3-force simulation configuration (worker → d3 force factories). */
export interface ForceConfig {
  /** forceManyBody.strength (negative = repulsion). */
  strength?: number;
  /** forceCollide radius (typically `weight + 4`). */
  collisionRadius?: number;
  /** forceLink distance. */
  linkDistance?: number;
  /** forceCenter.x. */
  centerX?: number;
  /** forceCenter.y. */
  centerY?: number;
  /** d3 simulation alphaMin. */
  alphaMin?: number;
  /** d3 simulation alphaDecay. */
  alphaDecay?: number;
  /** d3 simulation velocityDecay. */
  velocityDecay?: number;
}

/**
 * Visual style bundle. Sits alongside `ForceConfig` but is
 * conceptually separate — the worker applies it to the OffscreenCanvas
 * rendering. The shape is identical to `ForceStyle` in `styleConfig.ts`
 * (the design splits these intentionally — see force/glossary §11).
 */
export interface ForceStyle {
  theme: "light" | "dark";
  /** Light background. */
  backgroundColor: string;
  /** Light default node fill. */
  nodeColor: string;
  /** Light default edge stroke. */
  edgeColor: string;
  /** Light/dark label color. */
  labelColor: string;
  /** Node default radius (matches `weight` default). */
  nodeRadius: number;
  /** Edge default line width. */
  edgeLineWidth: number;
  /** Edge dash for `association` type. */
  edgeDash: number[];
}

/**
 * Incremental diff payload (main → worker) for hot-reload of node/link sets.
 *
 * Note: this struct follows the orchestrator-level `Diff` from
 * `@workspace/store/dataStore.ts` but flattens it into 4 typed fields
 * suitable for serialization over Comlink.
 */
export interface ForceDiffPayload {
  /** Nodes to insert or update by id. */
  nodeUpserts?: ForceNodeSeed[];
  /** Node ids to remove. Unknown ids are silently ignored. */
  nodeRemovals?: NodeId[];
  /** Links to insert or update by id. */
  linkUpserts?: ForceLinkSeed[];
  /** Edge ids to remove. Unknown ids are silently ignored. */
  linkRemovals?: EdgeId[];
}

// -----------------------------------------------------------------------
// 5. WorkerEvent (worker → main)
// -----------------------------------------------------------------------

/**
 * Events emitted by the worker to the main thread. Forwarded via Comlink
 * `proxy` callback (registered with `setEventHandler`) **except** for
 * `frame`, which uses the raw `postMessage` channel because ImageBitmap
 * is not a default Comlink Transferable (worker/design.md §2.3).
 */
export type WorkerEvent =
  | { type: "node:click"; nodeId: NodeId; modifiers: Modifiers }
  | { type: "node:dblclick"; nodeId: NodeId }
  | { type: "node:pointer-enter"; nodeId: NodeId }
  | { type: "node:pointer-leave"; nodeId: NodeId }
  | {
      type: "node:drag-start";
      nodeId: NodeId;
      x: number;
      y: number;
    }
  | { type: "node:drag"; nodeId: NodeId; x: number; y: number }
  | { type: "node:drag-end"; nodeId: NodeId; x: number; y: number }
  | { type: "edge:click"; edgeId: EdgeId; modifiers: Modifiers }
  | { type: "canvas:click"; x: number; y: number }
  | {
      type: "canvas:pointer-down";
      x: number;
      y: number;
      modifiers: Modifiers;
    }
  | { type: "canvas:pointer-move"; x: number; y: number }
  | { type: "canvas:pointer-up"; x: number; y: number }
  | {
      type: "canvas:wheel";
      deltaX: number;
      deltaY: number;
      modifiers: Modifiers;
    }
  | {
      type: "selection:changed";
      selectedNodeIds: NodeId[];
      selectedEdgeIds: EdgeId[];
    }
  | { type: "frame"; bitmap: ImageBitmap }
  | { type: "tick"; alpha: number }
  | { type: "status"; status: "idle" | "running" | "stopped" };

// -----------------------------------------------------------------------
// 6. WorkerInbound (Comlink.expose surface — main → worker)
// -----------------------------------------------------------------------

/**
 * The authoritative set of methods exposed by the worker via
 * `Comlink.expose`. Method names, parameters, and return types MUST match
 * `force/worker/api.ts` line-for-line.
 */
export interface WorkerInbound {
  /** One-time initialization with full snapshot. */
  initData(
    nodes: ForceNodeSeed[],
    links: ForceLinkSeed[],
    dims: { width: number; height: number },
  ): Promise<void>;

  /** Apply incremental diff. */
  applyDiff(diff: ForceDiffPayload): Promise<void>;

  /** Update d3-force simulation parameters. */
  updateConfig(config: ForceConfig): Promise<void>;

  /** Update visual style. */
  updateStyle(style: ForceStyle): Promise<void>;

  /** Pin/unpin a node. When fixed=true and x/y given, the node is moved. */
  setNodeFixed(
    nodeId: NodeId,
    fixed: boolean,
    x?: number,
    y?: number,
  ): Promise<void>;

  /** Update a node's position directly (without pinning). */
  setNodePosition(nodeId: NodeId, x: number, y: number): Promise<void>;

  /** Restart the simulation with alpha=1. */
  reheat(): Promise<void>;

  /** Stop the simulation. */
  stop(): Promise<void>;

  /** Resume the simulation. */
  resume(): Promise<void>;

  /** Update the canvas viewport (translation + scale). */
  setViewport(x: number, y: number, scale: number): Promise<void>;

  /** Update the canvas dimensions (after resize). */
  setDimensions(width: number, height: number): Promise<void>;

  /**
   * Register a callback for the worker to push `WorkerEvent`s back to the
   * main thread. Pass `null` to unregister.
   */
  setEventHandler(
    handler: ((event: WorkerEvent) => void) | null,
  ): Promise<void>;

  /** Forward a DOM event captured on the main thread. */
  proxyEvent(event: ProxiedDomEvent): Promise<void>;
}

// -----------------------------------------------------------------------
// 7. WorkerOutbound (main → worker health check, optional)
// -----------------------------------------------------------------------

/**
 * Reverse RPC: methods the main thread exposes on the worker side. Not
 * used by the current implementation but documented for future health
 * checks.
 */
export interface WorkerOutbound {
  ping(): Promise<"pong">;
  getStatus(): Promise<"idle" | "running" | "stopped">;
}

// -----------------------------------------------------------------------
// 8. Viewport + canvas types
// -----------------------------------------------------------------------

/** Camera state (translation + uniform scale). */
export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

/** Plain dimensions helper. */
export interface Dimensions {
  width: number;
  height: number;
}

// -----------------------------------------------------------------------
// 9. Render context (re-export of canvas.ts internals for main thread)
// -----------------------------------------------------------------------

/**
 * The current selection snapshot the worker re-pushes whenever the
 * orchestrator-driven selection changes (via `setNodeFixed` /
 * `setNodePosition` → worker computes neighborActive internally).
 */
export interface SelectionState {
  selectedNodeIds: Set<NodeId>;
  selectedEdgeIds: Set<EdgeId>;
  hoveredNodeId: NodeId | null;
  neighborNodeIds: Set<NodeId>;
}
