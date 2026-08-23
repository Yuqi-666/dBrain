# `@workspace/graph`

Next-generation graph visualization. Succeeded the legacy `@workspace/graph`
(v1, `@antv/g6`), which was removed when this package took over the name.
A single `<Graph />` component routes by `view.viewType` to either `ForceGraph`
(d3-force in a WebWorker, OffscreenCanvas) or `FlowGraph` (currently a
**placeholder shell** — the ReactFlow-based implementation was deleted in the
flow refactor and is under reconstruction).

**See root `AGENTS.md` for monorepo-wide context, conventions, and commands.**
This file is the package-internal ramp-up doc.

## ENTRY POINTS (read in this order)

1. `src/index.ts` — the only sanctioned public export. Scan re-exports to know what is reachable.
2. `src/graph.tsx` — the `<Graph />` router. ~191 lines. Builds `getDataSnapshot` / `subscribeDiff` / `filter` callbacks, then injects them + the shared `eventHandler` into either orchestrator.
3. `src/eventHandler.ts` — `useGraphEventHandler()`. The ONLY callback surface ForceGraph / FlowGraph receive. ~373 lines. Read this before touching any orchestrator.
4. `src/types.ts` — canonical home for cross-cutting types. Do not duplicate these elsewhere.
5. `src/force/ForceGraph.tsx` and `src/flow/FlowGraph.tsx` — the force orchestrator and the flow placeholder.

## ARCHITECTURE RULES (JSDoc-enforced)

These are not style preferences. Breaking them will silently desync the UI.

1. **Single event-handler surface.** `ForceGraph` and `FlowGraph` MUST NOT call `useUIStore.setXxx` or any `useGraph()` callback directly. Every gesture goes through `props.eventHandler.xxx(...)`.
   - **Two documented exceptions** (display concerns, not event routing):
     - `useUIStore.setContextMenu` is read in both orchestrators to pass to `<GraphContextMenu>` as a prop.
     - `useUIStore.previewBlock` + `useUIStore.closePreviewBlock` are read in `ForceGraph` only to forward to the mounted `<PreviewBlock>` overlay. `PreviewBlock` is mounted **only by ForceGraph** (intentional asymmetry — `eventHandler` writes the store on hover/leave/dblclick from both modes, but only force mode renders the preview).

2. **`force/*` and `flow/*` are siblings.** They MUST NOT import from each other. Cross-cutting types live in `src/types.ts`. The one exception: `src/eventHandler.ts` may import `WorkerEvent` from `force/types` because `handleWorkerEvent` is force-specific.

3. **`types.ts` is the canonical home** for `Modifiers`, `Theme`, `GraphSnapshot`, `SourceDiff`, `DiffCallback`. Do not re-define these. (`RenderState` is force-only — see below.)

4. **Re-exports follow ownership.** A type is re-exported from the module that DEFINES it, never from a module that merely uses it. See `src/index.ts:15-16`.

5. **`WorkerInbound` signatures must match `force/worker/api.ts` line-for-line.** This is an explicit contract (TypeScript enforces structurally, but stated as policy).

6. **Worker has zero DOM access.** All DOM events are captured on the main thread (`force/eventListener.ts`), serialized to `ProxiedDomEvent`, and forwarded via `api.proxyEvent()`.

7. **`AbortController` for StrictMode cleanup** in `force/eventListener.ts` — every listener is attached with `{ signal }`; cleanup is a single `ac.abort()`.

8. **Pin-coordinate coerce.** `ForceNodeSeed.fx/fy` is `number | undefined`, but d3's `SimulationNodeDatum` requires `number | null`. Coerce with `seed.fx ?? null` at the worker boundary. See `force/worker/simulation.ts:45-51`.

## DIRECTORY MAP

```
src/
├── index.ts              Public API only — single sanctioned entry point
├── graph.tsx             <Graph> router (191 lines)
├── types.ts              Cross-cutting types (canonical)
├── eventHandler.ts       useGraphEventHandler — the ONE callback surface
├── force/                PRIVATE — ForceGraph + d3-force worker
│   ├── ForceGraph.tsx          Main-thread orchestrator (forwardRef)
│   ├── types.ts                WorkerEvent, WorkerInbound, ProxiedDomEvent, …
│   ├── transform.ts            NodeData/EdgeData → ForceNodeSeed/ForceLinkSeed
│   ├── styleConfig.ts          NODE_RENDER_RULES, EDGE_RENDER_RULES, NODE_DEFAULTS, EDGE_DEFAULTS, DEFAULT_FORCE_CONFIG
│   ├── eventListener.ts        DOM → ProxiedDomEvent (AbortController cleanup)
│   └── worker/
│       ├── force.worker.ts     Worker entry (Comlink.expose + raw msg channel)
│       ├── api.ts              WorkerInbound implementation (signature contract)
│       ├── simulation.ts       d3-force, hit-test, internal SimNode/SimLink state
│       ├── canvas.ts           PixiJS WebGL facade (delegates to ./pixi/*)
│       └── pixi/               PixiJS rendering layers
│           ├── app.ts          Application lifecycle + stage hierarchy
│           ├── nodes.ts        Pooled Sprite rendering
│           ├── edges.ts        Style-bucketed edge + outline Graphics
│           ├── labels.ts       Budgeted Text pool with LOD
│           └── grid.ts         Viewport-anchored grid
└── flow/                 PRIVATE — placeholder shell (under reconstruction)
    └── FlowGraph.tsx          Keeps the FlowGraphProps contract so graph.tsx
                               routing + eventHandler surface compile unchanged.
                               Renders a static placeholder; no data pipeline,
                               no position/viewport persistence, no node/edge
                               registries. See git history for the deleted
                               ReactFlow implementation.
```

## CONVENTIONS (package-specific)

- **"use client"** at the top of every interactive file. Non-interactive files (`force/transform.ts`, all `force/*` types) do not need it.
- **All type-only imports use `import type`** (`verbatimModuleSyntax: true` is inherited from `@workspace/typescript-config`).
- **No build step.** `package.json` has only `lint`, `format`, `typecheck`. Consumers receive `.ts` source via `exports: { ".": "./src/index.ts" }`. Bundler-mode resolution required (Next.js / Webpack 5 / Turbopack / Vite).
- **No test infrastructure.** No vitest, jest, playwright, or `*.test.*` files. Don't add any without checking the root `AGENTS.md` anti-pattern note first.
- **`pnpm --filter=@workspace/graph typecheck`** is the closest thing to a CI check. Run it before claiming a task is done.

## COMMON TASKS — WHERE TO START

| Task | Start here | Pitfalls |
| --- | --- | --- |
| Rebuild flow mode | `src/flow/FlowGraph.tsx` (placeholder shell) | Preserve the `FlowGraphProps` contract — `graph.tsx` injects exactly these props; check git history for the original ReactFlow implementation |
| Change a force | `force/styleConfig.ts` (`DEFAULT_FORCE_CONFIG`) or `force/ForceGraph.tsx` (initial `ForceConfig` from `buildForceStyle` / `DEFAULT_FORCE_CONFIG`) | Worker reads `updateConfig` calls — changing defaults is fine; live-tweaking needs the api call |
| Change d3-force behavior | `force/worker/simulation.ts` | Worker file — no DOM access allowed |
| Add a new gesture / keybind (force) | `force/eventListener.ts` → forward to `eventHandler.xxx` | Use `AbortController` for any new listener in `eventListener.ts` |
| Add a new cross-cutting type | `src/types.ts` | Do NOT re-export from the using module — only re-export from `index.ts` |
| Wire a new event-handler method | `src/eventHandler.ts` | Match the flat-namespace imperative style (no `dispatch(event)` switch) |
| Touch filter / diff path | `graph.tsx` `filter` + `ForceGraph.subscribeStore` | `filter` is a generic predicate that takes `{ nodes, edges, view }` — the same predicate is reused for full snapshots AND for each diff bucket (added/updated). `removed` is forwarded untouched (worker owns the source-of-truth view) |

## WORKER PROTOCOL (4 raw channels + Comlink)

`force.worker.ts` exposes `WorkerInbound` via `Comlink.expose(api)`. Two non-Comlink message types ride the raw `postMessage` channel:

| Channel | Direction | Trigger | Why raw (not Comlink) |
| --- | --- | --- | --- |
| `__READY__` | worker → main | Worker boot | Main awaits this with 5s timeout before wrapping |
| `__SET_CANVAS__` | main → worker | After `transferControlToOffscreen()` | Comlink v4 cannot transfer `OffscreenCanvas` |
| `__PING__` / `__PONG__` | both | Health check (currently unused) | — |
| Comlink RPC | both | `initData`, `applyDiff`, `updateConfig`, `updateStyle`, `setNodeFixed`, `setNodePosition`, `reheat`, `stop`, `resume`, `setViewport`, `setDimensions`, `setEventHandler`, `proxyEvent` | Default Comlink path |

**Frame coalescing** uses `queueMicrotask`, NOT `requestAnimationFrame` — see `api.ts:80-82`. rAF is unreliable inside workers.

**Phase 2**: The OffscreenCanvas is transferred from the main thread via `transferControlToOffscreen()`. PixiJS renders directly into the page-visible canvas — zero-copy GPU compositing. No `ImageBitmap` copy, no `__FRAME__` channel, no `bitmap.close()`.

## d3-force DEFAULTS (`styleConfig.ts:175-182`)

| Force | Default |
| --- | --- |
| `forceLink` | `linkDistance: 80`, `.id(d => d.id)` |
| `forceManyBody` | `strength: -300` (repulsion) |
| `forceCollide` | `collisionRadius: 12` (per-node = `weight + 4`, weight default 8) |
| `forceCenter` | `centerX/Y = dims/2` |
| Simulation | `alphaMin: 0.001, alphaDecay: 0.0228, velocityDecay: 0.4` |

**Hit-test threshold** is hard-coded at 2000 nodes (`simulation.ts:138`): brute-force below, `d3-quadtree` at or above.

**Alpha control**: `createOrUpdate` → `alpha(1).restart()` (full); `applyDiff` → `alphaTarget(0.1).restart()` (gentle); `updateConfig` → `alpha(0.3).restart()`; `setNodeFixed(true)` → `alphaTarget(0.3)`.

## POSITION PERSISTENCE (force mode reads, flow mode is placeholder)

Schema: `NodeData.stateData.client.position: Array<{ viewId, x, y, mode }>` (an **array**, not a record).

- **Force mode** does NOT persist positions or viewport, but READS `stateData.client.position[viewId]` as x/y seeds on first load (so layout doesn't reset when switching views). See `force/ForceGraph.tsx` seed handling.
- **Flow mode** previously owned the full write path (drag-stop → `NodeService.upsert` with dual 200ms debounces; viewport writes 1000ms debounced). That implementation was deleted with the flow refactor — any future flow rebuild must restore it.

## 6-VALUE `RenderState` UNION (FORCE-ONLY)

**`RenderState` is force-mode private** — defined in `force/types.ts`, not exported from `src/index.ts`, and **not used by flow mode at all**. Flow has no equivalent concept; the flow placeholder doesn't render nodes.

Values: `default | hover | selected | active | neighbor | inactive`. The `NODE_RENDER_RULES` and `EDGE_RENDER_RULES` records in `styleConfig.ts` map each state to stroke/color/shadow adjustments.

| File | How it's used |
| --- | --- |
| `force/types.ts` | Defines `RenderState` (force-only) |
| `force/styleConfig.ts` | `NODE_RENDER_RULES` and `EDGE_RENDER_RULES` records + `getRenderAdjustment()` |
| `force/worker/simulation.ts` | Worker-internal `SimNode.renderState` / `SimLink.renderState` field; `recomputeWorkerState()` mirrors the active selection / hover into per-node state on every tick |

## CROSS-PACKAGE BOUNDARIES

| Package | How it's used | Critical constraint |
| --- | --- | --- |
| `@workspace/interfaces` | All NodeData/EdgeData/View types | `import type` mandatory (verbatimModuleSyntax) |
| `@workspace/store` | `useDataStore`, `useUIStore` | Treat as read+command bus via `.getState()`. Do NOT call as React selector in render path. `useDataStore.subscribe` + `state.clearDiff()` is the one-shot diff pattern. Mutations are immutable (`new Map(state.x)`). |
| `@workspace/ui` | `GraphContextMenu`, `GraphContextMenuProps` from `@workspace/ui/components/graph-context-menu/graph-context-menu`; `PreviewBlock` from `@workspace/ui/components/preview-block/preview-block` (ForceGraph only) | `@workspace/ui` has no `.` export — use explicit subpath |
| `@workspace/utils` | `filterByViewFilterConfig`, `debounce` | `filterByViewFilterConfig` returns NEW Map instances. `debounce` is trailing-edge only, no `cancel`/`flush`, loses `this` |
| `@workspace/hooks` | `useGraph()` (only in `eventHandler.ts:28`) | Client-only. `onCreateEdge` requires caller-supplied `setContextMenu` (5th arg). All mutators swallow errors with `console.error` |
| `@workspace/services` | `NodeService` (in `force/ForceGraph.tsx:71`) | Declared in `package.json`. Used to be the flow-mode `EdgeService`/`NodeService` client too — that coupling is gone with the flow refactor |

## KNOWN GOTCHAS

- **`tsconfig.lint.json`** includes a `turbo` directory that doesn't exist. Harmless dead config.
- **40+ JSDoc references to `docs/07-agent/graph-v2/src/design.md`** and `main design L###` line numbers — the `docs/` symlink target is `/mnt/f/dbrain` (external). The referenced path still uses the pre-rename directory name (`graph-v2`); these may not resolve in every environment.
- **Worker `self as unknown as Worker`** cast (`force.worker.ts:38`, `api.ts:67`) — `self` in a module worker is `DedicatedWorkerGlobalScope`, not `Worker`.
- **Force-mode modifier semantics are duplicated** in `force/eventListener.ts` (JSDoc) and `force/worker/simulation.ts:596-605` (switch case). There is no shared source of truth.
- **FlowGraph placeholder is inert** — it renders "Flow mode is under reconstruction" and ignores all data-feed props. Don't expect flow interactions until it's rebuilt.

## COMMANDS

```bash
# Lint
pnpm --filter=@workspace/graph lint

# Type-check (closest thing to CI)
pnpm --filter=@workspace/graph typecheck

# Format
pnpm --filter=@workspace/graph format
```

No `build`, `dev`, or `test` scripts. If you need to run the package in a host app, use the dev server of `apps/web` (port 3000) or `apps/desktop` (port 3001). `apps/web` declares `@workspace/graph` in its dependencies.

## WHEN TO UPDATE THIS FILE

Add a bullet when you discover:
- A new architectural constraint enforced only by JSDoc.
- A non-obvious gotcha (something that took you >5 minutes to figure out from the source).
- A latent bug or missing dependency that future contributors should know about.

Do NOT add:
- Generic React 19 / d3 usage advice (look it up).
- Re-statements of TypeScript / module syntax rules (the root `AGENTS.md` covers them).
- File-tree listings of files you haven't read.
