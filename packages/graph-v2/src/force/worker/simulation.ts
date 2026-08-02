/**
 * d3-force simulation core (runs inside the WebWorker).
 *
 * Owns:
 *   - The `d3.Simulation` instance.
 *   - The internal node / link arrays (with d3-mutated `x`, `y`, `vx`,
 *     `vy`, `fx`, `fy`, `index` fields).
 *   - The internal selection / hover state used to compute the 7-state
 *     `UiState` for each node on every render frame.
 *   - Hit-testing (linear for n<2000, d3-quadtree for n>=2000, per
 *     worker/design.md §6.2).
 *
 * Cross-document contract: worker/design.md §3.1, §4 (forces), §6 (hit-test),
 * §7.2 (UI state mirror).
 *
 * NOTE: this file has zero DOM access. The only browser API it touches is
 * the `OffscreenCanvas` (held in `canvas.ts`) and `postMessage` (called by
 * `force.worker.ts`).
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  type Simulation,
  type SimulationLinkDatum,
} from "d3-force";
import { quadtree, type Quadtree } from "d3-quadtree";
import type { EdgeId, NodeId } from "@workspace/interfaces";
import type {
  ForceConfig,
  ForceLinkSeed,
  ForceNodeSeed,
  ProxiedDomEvent,
} from "../types";
import type { UiState } from "../types";
import { DEFAULT_FORCE_CONFIG } from "../styleConfig";

// -----------------------------------------------------------------------
// Internal mutable types (d3 mutates these in-place)
// -----------------------------------------------------------------------

/**
 * The d3 `SimulationNodeDatum` declares `fx` / `fy` as `number | null`.
 * `ForceNodeSeed` declares them as optional `number | undefined`. We
 * unify on `number | null` to satisfy d3's typing while still allowing
 * callers to omit them (omitted = `undefined` → we coerce to `null`).
 */
type PinCoord = number | null;

export interface SimNode extends Omit<ForceNodeSeed, "fx" | "fy"> {
  x?: number;
  y?: number;
  fx?: PinCoord;
  fy?: PinCoord;
  vx?: number;
  vy?: number;
  index?: number;
  /** Cached label text (truncated for canvas). */
  __label?: string;
}

export interface SimLink extends Omit<SimulationLinkDatum<SimNode>, "source" | "target"> {
  id: EdgeId;
  source: SimNode;
  target: SimNode;
  edgeType: ForceLinkSeed["edgeType"];
  direction: ForceLinkSeed["direction"];
  ui: UiState;
  semanticColor?: string;
  weight?: ForceLinkSeed["weight"];
}

// -----------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------

let sim: Simulation<SimNode, SimLink> | null = null;
let nodes: SimNode[] = [];
let links: SimLink[] = [];
let qt: Quadtree<SimNode> | null = null;

/** Cached simulation config — kept so we can rebuild forces after diff. */
let currentConfig: ForceConfig = { ...DEFAULT_FORCE_CONFIG };
let currentDims = { width: 800, height: 600 };

/** Hover / selection state. The worker owns these (main thread pushes them
 *  in via `setNodeFixed` / `setSelectionState`, see `api.ts`). */
let selectedNodeIds: Set<NodeId> = new Set();
let selectedEdgeIds: Set<EdgeId> = new Set();
let hoveredNodeId: NodeId | null = null;
let neighborNodeIds: Set<NodeId> = new Set();

/** Listeners that get fired on every `tick`. */
let tickListeners: Array<(alpha: number) => void> = [];

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Update the internal `ui` for every node based on hover / selection. */
function recomputeUiStates(): void {
  const hasSelection = selectedNodeIds.size > 0;
  for (const node of nodes) {
    if (selectedNodeIds.has(node.id)) {
      node.ui = "selected";
    } else if (hoveredNodeId === node.id) {
      node.ui = "hover";
    } else if (neighborNodeIds.has(node.id)) {
      node.ui = "neighborActive";
    } else if (hasSelection) {
      node.ui = "inactive";
    } else {
      node.ui = "default";
    }
  }
}

/** Compute the 1-degree neighbor set for the currently selected nodes. */
function recomputeNeighbors(): void {
  neighborNodeIds = new Set();
  if (selectedNodeIds.size === 0) return;
  for (const link of links) {
    if (selectedNodeIds.has(link.source.id)) {
      neighborNodeIds.add(link.target.id);
    }
    if (selectedNodeIds.has(link.target.id)) {
      neighborNodeIds.add(link.source.id);
    }
  }
  // Selected nodes themselves are not their own neighbors.
  for (const id of selectedNodeIds) neighborNodeIds.delete(id);
}

function rebuildQuadtree(): void {
  if (nodes.length < 2000) {
    qt = null;
    return;
  }
  qt = quadtree<SimNode>()
    .x((d) => d.x ?? 0)
    .y((d) => d.y ?? 0)
    .addAll(nodes);
}

function applyConfig(forceCfg: ForceConfig): void {
  if (!sim) return;
  const cfg = { ...DEFAULT_FORCE_CONFIG, ...forceCfg };
  currentConfig = cfg;

  sim
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(cfg.linkDistance ?? DEFAULT_FORCE_CONFIG.linkDistance),
    )
    .force(
      "charge",
      forceManyBody().strength(cfg.strength ?? DEFAULT_FORCE_CONFIG.strength),
    )
    .force(
      "collide",
      forceCollide<SimNode>().radius(
        (d) => (d.weight ?? 8) + (cfg.collisionRadius
          ? cfg.collisionRadius - 8
          : DEFAULT_FORCE_CONFIG.collisionRadius - 8),
      ),
    )
    .force(
      "center",
      forceCenter(
        cfg.centerX ?? currentDims.width / 2,
        cfg.centerY ?? currentDims.height / 2,
      ),
    )
    .alphaMin(cfg.alphaMin ?? DEFAULT_FORCE_CONFIG.alphaMin)
    .alphaDecay(cfg.alphaDecay ?? DEFAULT_FORCE_CONFIG.alphaDecay)
    .velocityDecay(
      cfg.velocityDecay ?? DEFAULT_FORCE_CONFIG.velocityDecay,
    );
}

// -----------------------------------------------------------------------
// Public lifecycle
// -----------------------------------------------------------------------

/**
 * Initialize / reset the simulation with a fresh dataset. Hot-reload of
 * d3-force: we mutate the existing node/link arrays in place where
 * possible, otherwise re-create the simulation.
 */
export function createOrUpdate(
  seeds: ForceNodeSeed[],
  linkSeeds: ForceLinkSeed[],
  dims: { width: number; height: number },
): void {
  currentDims = dims;

  // Build (or merge) the internal node list.
  const seedById = new Map<NodeId, ForceNodeSeed>();
  for (const seed of seeds) seedById.set(seed.id, seed);

  // Remove nodes that no longer exist in the seed set.
  nodes = nodes.filter((n) => seedById.has(n.id));

  // Upsert nodes.
  const nodeById = new Map<NodeId, SimNode>();
  for (const existing of nodes) nodeById.set(existing.id, existing);

  const next: SimNode[] = [];
  for (const seed of seeds) {
    const existing = nodeById.get(seed.id);
    if (existing) {
      // Update mutable fields in place.
      existing.title = seed.title;
      existing.ui = seed.ui;
      existing.semanticColor = seed.semanticColor;
      existing.nodeType = seed.nodeType ?? existing.nodeType;
      existing.viewId = seed.viewId ?? existing.viewId;
      if (typeof seed.weight === "number") existing.weight = seed.weight;
      // First-load coords override the running x/y (only on initial sync
      // — we detect "initial" by checking that fx/fy are both null AND
      // x/y are also null).
      if (
        typeof seed.x === "number" &&
        typeof seed.y === "number" &&
        (existing.x === undefined || Number.isNaN(existing.x)) &&
        existing.fx === null
      ) {
        existing.x = seed.x;
        existing.y = seed.y;
      }
      next.push(existing);
    } else {
      // New node.
      next.push({
        ...seed,
        x: seed.x,
        y: seed.y,
        fx: seed.fx ?? null,
        fy: seed.fy ?? null,
      });
    }
  }
  nodes = next;

  // Build the link list (forceLink expects objects whose source/target
  // are node references, but the d3 link force can also resolve ids at
  // initialization time when `link.id(d => d.id)` is set).
  const seedLinksById = new Map<EdgeId, ForceLinkSeed>();
  for (const seed of linkSeeds) seedLinksById.set(seed.id, seed);

  const nodeMap = new Map<NodeId, SimNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Drop links whose endpoints are not in the new node set.
  links = links.filter((l) =>
    seedLinksById.has(l.id) && nodeMap.has(l.source.id) && nodeMap.has(l.target.id)
  );

  const linkById = new Map<EdgeId, SimLink>();
  for (const l of links) linkById.set(l.id, l);

  const nextLinks: SimLink[] = [];
  for (const seed of linkSeeds) {
    const source = nodeMap.get(seed.source);
    const target = nodeMap.get(seed.target);
    if (!source || !target) continue; // skip orphan edges
    const existing = linkById.get(seed.id);
    if (existing) {
      existing.source = source;
      existing.target = target;
      existing.edgeType = seed.edgeType;
      existing.direction = seed.direction;
      existing.ui = seed.ui;
      existing.semanticColor = seed.semanticColor;
      existing.weight = seed.weight;
      nextLinks.push(existing);
    } else {
      nextLinks.push({
        id: seed.id,
        source,
        target,
        edgeType: seed.edgeType,
        direction: seed.direction,
        ui: seed.ui,
        semanticColor: seed.semanticColor,
        weight: seed.weight,
      });
    }
  }
  links = nextLinks;

  // (Re)create the simulation. d3's `forceSimulation` mutates its input
  // arrays, which is fine here.
  if (sim) {
    sim.nodes(nodes);
    (sim.force("link") as ReturnType<typeof forceLink<SimNode, SimLink>> | null)
      ?.links(links);
  } else {
    sim = forceSimulation<SimNode>(nodes)
      .on("tick", onTick);
  }
  applyConfig(currentConfig);

  // Build the quadtree lazily.
  rebuildQuadtree();

  // Restart with full alpha so the new dataset visibly settles.
  sim.alpha(1).restart();
}

/** Apply a diff (incremental) to the running simulation. */
export function applyDiff(
  payload: import("../types").ForceDiffPayload,
): void {
  if (!sim) return;

  // -- Nodes ----------------------------------------------------------
  if (payload.nodeRemovals && payload.nodeRemovals.length > 0) {
    const removeSet = new Set(payload.nodeRemovals);
    nodes = nodes.filter((n) => !removeSet.has(n.id));
    selectedNodeIds = new Set(
      [...selectedNodeIds].filter((id) => !removeSet.has(id)),
    );
    if (hoveredNodeId && removeSet.has(hoveredNodeId)) {
      hoveredNodeId = null;
    }
  }

  if (payload.nodeUpserts && payload.nodeUpserts.length > 0) {
    const seedById = new Map<NodeId, ForceNodeSeed>();
    for (const seed of payload.nodeUpserts) seedById.set(seed.id, seed);

    const nodeById = new Map<NodeId, SimNode>();
    for (const n of nodes) nodeById.set(n.id, n);

    for (const seed of payload.nodeUpserts) {
      const existing = nodeById.get(seed.id);
      if (existing) {
        existing.title = seed.title;
        existing.ui = seed.ui;
        existing.semanticColor = seed.semanticColor;
        existing.nodeType = seed.nodeType ?? existing.nodeType;
        existing.viewId = seed.viewId ?? existing.viewId;
        if (typeof seed.weight === "number") existing.weight = seed.weight;
      } else {
        nodes.push({
          ...seed,
          fx: seed.fx ?? null,
          fy: seed.fy ?? null,
        });
      }
    }
  }

  // -- Links ----------------------------------------------------------
  if (payload.linkRemovals && payload.linkRemovals.length > 0) {
    const removeSet = new Set(payload.linkRemovals);
    links = links.filter((l) => !removeSet.has(l.id));
    selectedEdgeIds = new Set(
      [...selectedEdgeIds].filter((id) => !removeSet.has(id)),
    );
  }

  if (payload.linkUpserts && payload.linkUpserts.length > 0) {
    const nodeMap = new Map<NodeId, SimNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const linkById = new Map<EdgeId, SimLink>();
    for (const l of links) linkById.set(l.id, l);

    for (const seed of payload.linkUpserts) {
      const source = nodeMap.get(seed.source);
      const target = nodeMap.get(seed.target);
      if (!source || !target) continue;
      const existing = linkById.get(seed.id);
      if (existing) {
        existing.source = source;
        existing.target = target;
        existing.edgeType = seed.edgeType;
        existing.direction = seed.direction;
        existing.ui = seed.ui;
        existing.semanticColor = seed.semanticColor;
        existing.weight = seed.weight;
      } else {
        links.push({
          id: seed.id,
          source,
          target,
          edgeType: seed.edgeType,
          direction: seed.direction,
          ui: seed.ui,
          semanticColor: seed.semanticColor,
          weight: seed.weight,
        });
      }
    }
  }

  sim.nodes(nodes);
  (sim.force("link") as ReturnType<typeof forceLink<SimNode, SimLink>> | null)
    ?.links(links);

  recomputeNeighbors();
  recomputeUiStates();
  rebuildQuadtree();

  // Small alpha bump so the new positions settle into the layout.
  sim.alphaTarget(0.1).restart();
}

// -----------------------------------------------------------------------
// Node mutation
// -----------------------------------------------------------------------

export function setNodeFixed(
  nodeId: NodeId,
  fixed: boolean,
  x?: number,
  y?: number,
): void {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !sim) return;
  if (typeof x === "number") node.x = x;
  if (typeof y === "number") node.y = y;
  node.fx = fixed ? (typeof x === "number" ? x : (node.x ?? 0)) : null;
  node.fy = fixed ? (typeof y === "number" ? y : (node.y ?? 0)) : null;
  if (fixed) {
    sim.alphaTarget(0.3).restart();
  } else {
    sim.alphaTarget(0).restart();
  }
}

export function setNodePosition(
  nodeId: NodeId,
  x: number,
  y: number,
): void {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !sim) return;
  node.x = x;
  node.y = y;
  sim.alpha(0.3).restart();
}

// -----------------------------------------------------------------------
// Selection / hover state
// -----------------------------------------------------------------------

export function setSelectedNodes(ids: NodeId[]): void {
  selectedNodeIds = new Set(ids);
  recomputeNeighbors();
  recomputeUiStates();
}

export function setSelectedEdges(ids: EdgeId[]): void {
  selectedEdgeIds = new Set(ids);
}

export function setHoveredNode(id: NodeId | null): void {
  if (hoveredNodeId === id) return;
  hoveredNodeId = id;
  recomputeUiStates();
}

export function getSelectionState() {
  return {
    selectedNodeIds: new Set(selectedNodeIds),
    selectedEdgeIds: new Set(selectedEdgeIds),
    hoveredNodeId,
    neighborNodeIds: new Set(neighborNodeIds),
  };
}

export function clearSelection(): void {
  selectedNodeIds = new Set();
  selectedEdgeIds = new Set();
  hoveredNodeId = null;
  recomputeNeighbors();
  recomputeUiStates();
}

// -----------------------------------------------------------------------
// Simulation control
// -----------------------------------------------------------------------

export function reheat(): void {
  if (!sim) return;
  sim.alpha(1).restart();
}

export function stopSimulation(): void {
  if (!sim) return;
  sim.stop();
  for (const cb of tickListeners) cb(sim.alpha());
}

export function resumeSimulation(): void {
  if (!sim) return;
  sim.alphaTarget(0).restart();
}

export function updateConfig(config: ForceConfig): void {
  currentConfig = { ...currentConfig, ...config };
  applyConfig(currentConfig);
  if (sim) sim.alpha(0.3).restart();
}

export function updateDims(width: number, height: number): void {
  currentDims = { width, height };
  applyConfig(currentConfig);
}

// -----------------------------------------------------------------------
// Tick + listener
// -----------------------------------------------------------------------

function onTick(): void {
  if (!sim) return;
  for (const cb of tickListeners) cb(sim.alpha());
  // Throttled quadtree rebuild — only useful when nodes move significantly.
  if (qt) rebuildQuadtree();
}

export function onTickListener(cb: (alpha: number) => void): () => void {
  tickListeners.push(cb);
  return () => {
    tickListeners = tickListeners.filter((c) => c !== cb);
  };
}

// -----------------------------------------------------------------------
// Hit-testing
// -----------------------------------------------------------------------

/**
 * Find the closest node within `radius` of the given simulation-coord
 * point. Uses d3-quadtree when node count >= 2000, brute-force otherwise.
 */
export function hitTest(
  x: number,
  y: number,
  radius: number = 10,
): SimNode | null {
  if (nodes.length === 0) return null;

  if (qt) {
    // Use the built-in find() with a search radius — it walks the tree
    // internally and returns the closest match.
    const found = qt.find(x, y, radius) as SimNode | undefined;
    return found ?? null;
  }

  // Brute force.
  let closest: SimNode | null = null;
  let minDist = Infinity;
  for (const n of nodes) {
    const dx = x - (n.x ?? 0);
    const dy = y - (n.y ?? 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist <= radius) {
      minDist = dist;
      closest = n;
    }
  }
  return closest;
}

// -----------------------------------------------------------------------
// DOM event handling (worker-internal, takes a ProxiedDomEvent)
// -----------------------------------------------------------------------

/**
 * Resolve a `ProxiedDomEvent` into a `WorkerEvent` (or null when the event
 * does not produce a domain event — e.g. pan/zoom modifies viewport state
 * without emitting anything back to the main thread).
 *
 * Note: pan/zoom/lasso are *state mutations* on the worker side. The main
 * thread owns the UI mirror (e.g. `useUIStore.selectedNodeIds`); the worker
 * only emits the high-level semantic events needed to drive that store.
 */
export function handleProxiedEvent(
  evt: ProxiedDomEvent,
  canvasViewport: { x: number; y: number; scale: number },
): void {
  switch (evt.type) {
    case "pointer-down": {
      if (evt.button === 2) return; // right click → handled by context-menu event
      const target = hitTest(evt.x, evt.y);
      if (target) {
        // Modifier semantics (from worker/design.md §4.3, force/design.md §4.3):
        //   Alt: do not start drag (let create-edge handle it). The main
        //        thread also surfaces the assist-edge flow, so we just
        //        leave selection unchanged.
        if (evt.modifiers.alt) return;
        if (evt.modifiers.ctrl) {
          // Lasso mode is handled at the canvas level; the worker
          // doesn't need to do anything special.
          return;
        }
        setSelectedNodes([target.id]);
        setNodeFixed(target.id, true, target.x, target.y);
        emit({ type: "node:drag-start", nodeId: target.id, x: target.x ?? 0, y: target.y ?? 0 });
      } else {
        // Click on empty canvas.
        clearSelection();
        emit({ type: "canvas:pointer-down", x: evt.x, y: evt.y, modifiers: evt.modifiers });
      }
      break;
    }
    case "pointer-move": {
      if (selectedNodeIds.size > 0 && !evt.modifiers.alt && !evt.modifiers.ctrl) {
        // Drag the first selected node (we treat multi-select drag the same
        // way — the main thread can compute per-node offsets).
        for (const id of selectedNodeIds) {
          const n = nodes.find((nn) => nn.id === id);
          if (!n) continue;
          setNodePosition(id, evt.x, evt.y);
          emit({ type: "node:drag", nodeId: id, x: evt.x, y: evt.y });
        }
      }
      const target = hitTest(evt.x, evt.y);
      if (target) {
        setHoveredNode(target.id);
        emit({ type: "node:pointer-enter", nodeId: target.id });
      } else if (hoveredNodeId) {
        const prev = hoveredNodeId;
        setHoveredNode(null);
        emit({ type: "node:pointer-leave", nodeId: prev });
      }
      emit({ type: "canvas:pointer-move", x: evt.x, y: evt.y });
      break;
    }
    case "pointer-up": {
      // Release pin for all selected nodes unless Ctrl is held (lasso
      // keep-position mode).
      const keepFixed = evt.modifiers.ctrl;
      for (const id of selectedNodeIds) {
        setNodeFixed(id, keepFixed);
        const n = nodes.find((nn) => nn.id === id);
        emit({
          type: "node:drag-end",
          nodeId: id,
          x: n?.x ?? 0,
          y: n?.y ?? 0,
        });
      }
      emit({ type: "canvas:pointer-up", x: evt.x, y: evt.y });
      // Up after a drag is also a click — emit canvas:click so the main
      // thread can clear preview / menus.
      emit({ type: "canvas:click", x: evt.x, y: evt.y });
      break;
    }
    case "wheel": {
      // Pure viewport handling lives in the main thread. We forward the
      // raw event so the orchestrator can run its own logic; for now
      // just emit a status event.
      emit({ type: "canvas:wheel", deltaX: evt.deltaX, deltaY: evt.deltaY, modifiers: evt.modifiers });
      break;
    }
    case "context-menu": {
      const target = hitTest(evt.x, evt.y);
      if (target) {
        emit({ type: "node:click", nodeId: target.id, modifiers: evt.modifiers });
      } else {
        emit({ type: "canvas:click", x: evt.x, y: evt.y });
      }
      break;
    }
    case "key-down":
    case "key-up":
      // No domain semantics for key events in the worker (the main thread
      // owns keyboard handling for mod-key tracking).
      break;
    default: {
      // Exhaustiveness check.
      const _exhaustive: never = evt;
      void _exhaustive;
    }
  }
  void canvasViewport; // currently unused — kept for future per-event viewport math
}

// -----------------------------------------------------------------------
// Event emission
// -----------------------------------------------------------------------

type EventListener = (event: import("../types").WorkerEvent) => void;
let eventHandler: EventListener | null = null;

export function setEventHandler(handler: EventListener | null): void {
  eventHandler = handler;
}

export function emit(event: import("../types").WorkerEvent): void {
  if (eventHandler) {
    try {
      eventHandler(event);
    } catch (err) {
      console.error("[simulation] eventHandler threw:", err);
    }
  }
}

// -----------------------------------------------------------------------
// Frame push (called by force.worker.ts after rAF tick to push a fresh
// ImageBitmap to the main thread).
// -----------------------------------------------------------------------

/**
 * Read-only access to the internal node/link arrays for the canvas
 * renderer. Returns references, not copies — callers must not mutate.
 */
export function readSimulationState() {
  return {
    nodes: nodes as ReadonlyArray<SimNode>,
    links: links as ReadonlyArray<SimLink>,
  };
}

// -----------------------------------------------------------------------
// Status
// -----------------------------------------------------------------------

export function getStatus(): "idle" | "running" | "stopped" {
  if (!sim) return "idle";
  // d3 doesn't expose a clean "stopped" flag; infer from alphaTarget.
  if (sim.alpha() < 0.001) return "stopped";
  return "running";
}

export function ping(): "pong" {
  return "pong";
}
