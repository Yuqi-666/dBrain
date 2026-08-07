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

/** Multi-select drag offsets (FIX 1.2). */
const dragOffsets = new Map<NodeId, { ox: number; oy: number }>();

/** Double-click detection (FIX 1.4). */
let lastClickTime = 0;
let lastClickNode: NodeId | null = null;

/** Listeners that get fired on every `tick`. */
let tickListeners: Array<(alpha: number) => void> = [];

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Update the internal `ui` for every node based on hover / selection. */
function recomputeUiStates(): void {
  const hasSelection = selectedNodeIds.size > 0 || selectedEdgeIds.size > 0;
  for (const node of nodes) {
    const isSelected = selectedNodeIds.has(node.id);
    const isHovered = hoveredNodeId === node.id;
    if (isSelected && isHovered) node.ui = "active";
    else if (isSelected) node.ui = "selected";
    else if (isHovered) node.ui = "hover";
    else if (neighborNodeIds.has(node.id)) node.ui = "neighborActive";
    else if (hasSelection) node.ui = "inactive";
    else node.ui = "default";
  }
  for (const link of links) {
    const isEdgeSelected = selectedEdgeIds.has(link.id);
    if (isEdgeSelected) {
      link.ui = "selected";
    } else {
      const srcSel = selectedNodeIds.has(link.source.id);
      const tgtSel = selectedNodeIds.has(link.target.id);
      if (srcSel && tgtSel) link.ui = "selected";
      else if (srcSel || tgtSel) link.ui = "neighborActive";
      else if (hasSelection) link.ui = "inactive";
      else link.ui = "default";
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
        (d) => (d.weight ?? 8) + (cfg.collisionRadius != null
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
  // Keep the pin in sync with the drag target — without this, d3-force
  // resets x/y back to the stale fx/fy on every tick.
  if (node.fx !== null) node.fx = x;
  if (node.fy !== null) node.fy = y;
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
  const prev = hoveredNodeId;
  hoveredNodeId = id;
  recomputeUiStates();
  if (id !== null) {
    emit({ type: "node:pointer-enter", nodeId: id });
  } else if (prev !== null) {
    emit({ type: "node:pointer-leave", nodeId: prev });
  }
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
  emit({ type: "selection:changed", selectedNodeIds: [], selectedEdgeIds: [] });
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
    const nx = Number.isFinite(n.x) ? n.x! : 0;
    const ny = Number.isFinite(n.y) ? n.y! : 0;
    const dx = x - nx;
    const dy = y - ny;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist <= radius) {
      minDist = dist;
      closest = n;
    }
  }
  return closest;
}

// -----------------------------------------------------------------------
// Edge hit-testing
// -----------------------------------------------------------------------

/**
 * Point-to-line-segment distance. Used for straight edges (hierarchy /
 * association).
 */
function pointToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Sample a cubic bezier at parameter `t` (0..1).
 */
function sampleCubic(
  t: number,
  sx: number, sy: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  tx: number, ty: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * sx + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * tx,
    y: u * u * u * sy + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * ty,
  };
}

/** Minimum distance from point to a quadratic bezier (sampled). */
function pointToQuadratic(
  px: number, py: number,
  sx: number, sy: number,
  mx: number, my: number,
  tx: number, ty: number,
): number {
  let min = Infinity;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const u = 1 - t;
    const x = u * u * sx + 2 * u * t * mx + t * t * tx;
    const y = u * u * sy + 2 * u * t * my + t * t * ty;
    min = Math.min(min, Math.hypot(px - x, py - y));
  }
  return min;
}

/** Minimum distance from point to a cubic bezier (sampled). */
function pointToCubic(
  px: number, py: number,
  sx: number, sy: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  tx: number, ty: number,
): number {
  let min = Infinity;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const p = sampleCubic(t, sx, sy, cx1, cy1, cx2, cy2, tx, ty);
    min = Math.min(min, Math.hypot(px - p.x, py - p.y));
  }
  return min;
}

/**
 * Hit-test all edges. Returns the closest edge within `threshold`
 * device pixels, or null.
 */
export function hitTestEdge(
  x: number,
  y: number,
  threshold: number = 10,
): { link: SimLink; dist: number } | null {
  let closest: SimLink | null = null;
  let minDist = Infinity;

  for (const link of links) {
    const sx = link.source.x ?? 0;
    const sy = link.source.y ?? 0;
    const tx = link.target.x ?? 0;
    const ty = link.target.y ?? 0;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) ||
        !Number.isFinite(tx) || !Number.isFinite(ty)) continue;

    let dist: number;
    const isBidirectional = link.direction === "bidirectional";
    const useCubic = isBidirectional || link.edgeType === "interaction";
    const useQuadratic = !useCubic && link.edgeType === "flow";

    if (useCubic) {
      const cx1 = sx + (tx - sx) * 0.4;
      const cy1 = sy;
      const cx2 = tx - (tx - sx) * 0.4;
      const cy2 = ty;
      dist = pointToCubic(x, y, sx, sy, cx1, cy1, cx2, cy2, tx, ty);
    } else if (useQuadratic) {
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2 - 40;
      dist = pointToQuadratic(x, y, sx, sy, mx, my, tx, ty);
    } else {
      dist = pointToSegment(x, y, sx, sy, tx, ty);
    }

    if (dist < minDist && dist <= threshold) {
      minDist = dist;
      closest = link;
    }
  }
  return closest ? { link: closest, dist: minDist } : null;
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
export function handleProxiedEvent(evt: ProxiedDomEvent): void {
  switch (evt.type) {
    case "pointer-down": {
      if (evt.button === 2) return;
      const target = hitTest(evt.x, evt.y, 10);

      // Double-click detection (FIX 1.4)
      const now = Date.now();
      if (target && target.id === lastClickNode && now - lastClickTime < 300) {
        clearSelection();
        setSelectedNodes([target.id]);
        recomputeUiStates();
        emit({ type: "node:dblclick", nodeId: target.id });
        lastClickTime = 0;
        lastClickNode = null;
        return;
      }
      if (target) {
        lastClickTime = now;
        lastClickNode = target.id;
      }
      if (target) {
        if (evt.modifiers.alt) return;
        if (evt.modifiers.ctrl) return;
        if (evt.modifiers.shift) {
          const next = new Set(selectedNodeIds);
          if (next.has(target.id)) next.delete(target.id);
          else next.add(target.id);
          const idsArr = [...next];
          setSelectedNodes(idsArr);
          for (const id of idsArr) {
            const n = nodes.find((nn) => nn.id === id);
            if (n) dragOffsets.set(id, { ox: (n.x ?? 0) - evt.x, oy: (n.y ?? 0) - evt.y });
          }
          emit({ type: "selection:changed", selectedNodeIds: idsArr, selectedEdgeIds: [] });
          return;
        }
        setSelectedNodes([target.id]);
        for (const id of selectedNodeIds) {
          const n = nodes.find((nn) => nn.id === id);
          if (n) dragOffsets.set(id, { ox: (n.x ?? 0) - evt.x, oy: (n.y ?? 0) - evt.y });
        }
        emit({ type: "selection:changed", selectedNodeIds: [target.id], selectedEdgeIds: [] });
        setNodeFixed(target.id, true, target.x, target.y);
        emit({ type: "node:drag-start", nodeId: target.id, x: target.x ?? 0, y: target.y ?? 0 });
      } else {
        // No node hit — try edge hit-test before falling back to canvas.
        const edgeTarget = hitTestEdge(evt.x, evt.y, 10);
        if (edgeTarget) {
          clearSelection();
          setSelectedEdges([edgeTarget.link.id]);
          recomputeUiStates();
          emit({ type: "edge:click", edgeId: edgeTarget.link.id, modifiers: evt.modifiers });
        } else {
          clearSelection();
          recomputeUiStates();
          emit({ type: "canvas:pointer-down", x: evt.x, y: evt.y, modifiers: evt.modifiers });
        }
      }
      break;
    }
    case "pointer-move": {
      // Only drag when the primary button is held — without this check,
      // clicking a node (press+release) then moving the mouse would
      // continue to drag the selected node.
      if (
        (evt.buttons & 1) !== 0 &&
        selectedNodeIds.size > 0 &&
        !evt.modifiers.alt &&
        !evt.modifiers.ctrl
      ) {
        for (const id of selectedNodeIds) {
          const n = nodes.find((nn) => nn.id === id);
          if (!n) continue;
          const offset = dragOffsets.get(id) ?? { ox: 0, oy: 0 };
          setNodePosition(id, evt.x + offset.ox, evt.y + offset.oy);
          emit({ type: "node:drag", nodeId: id, x: evt.x + offset.ox, y: evt.y + offset.oy });
        }
      }
      const target = hitTest(evt.x, evt.y);
      setHoveredNode(target?.id ?? null);
      emit({ type: "canvas:pointer-move", x: evt.x, y: evt.y });
      break;
    }
    case "pointer-up": {
      // Right-click: the context-menu handler owns hit-test + selection.
      // If we emit canvas:click here, it would race with the deferred
      // context menu and close it immediately.
      if (evt.button === 2) break;

      const wasDragging = selectedNodeIds.size > 0;
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
      if (!wasDragging) {
        const upTarget = hitTest(evt.x, evt.y);
        if (upTarget) break;
        // No node hit — check edge before treating as canvas click.
        // Without this, clicking an edge then releasing emits canvas:click,
        // which clears the edge selection we just made in pointer-down.
        const upEdge = hitTestEdge(evt.x, evt.y);
        if (upEdge) break;
        emit({ type: "canvas:click", x: evt.x, y: evt.y });
      }
      break;
    }
    case "wheel": {
      // Viewport pan/zoom is owned by the main thread (eventListener.ts
      // wheel handler → onViewportChange → api.setViewport). The worker
      // never receives wheel events through this path; the ProxiedDomEvent
      // "wheel" variant exists solely to satisfy the exhaustive union type.
      break;
    }
    case "context-menu": {
      const target = hitTest(evt.x, evt.y, 10);
      if (target) {
        clearSelection();
        setSelectedNodes([target.id]);
        recomputeUiStates();
        emit({ type: "context-menu:node", nodeId: target.id, clientX: evt.clientX, clientY: evt.clientY });
      } else {
        const edgeHit = hitTestEdge(evt.x, evt.y, 10);
        if (edgeHit) {
          clearSelection();
          setSelectedEdges([edgeHit.link.id]);
          recomputeUiStates();
          emit({ type: "context-menu:edge", edgeId: edgeHit.link.id, clientX: evt.clientX, clientY: evt.clientY });
        } else {
          clearSelection();
          recomputeUiStates();
          emit({ type: "context-menu:canvas", clientX: evt.clientX, clientY: evt.clientY });
        }
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
