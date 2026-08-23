# PROJECT KNOWLEDGE BASE

**Branch:** develop

## OVERVIEW

dBrain is a hybrid monorepo combining a Tauri desktop app + Next.js web frontend with a TypeScript backend. Uses Turborepo + pnpm for JS/TS. **The backend is TypeScript DDD layers, NOT Rust** — only the Tauri desktop app is Rust.

## STRUCTURE

```
dBrain/
├── apps/
│   ├── desktop/     # Tauri 2.x + Next.js (port 3001)
│   ├── web/         # Next.js 16 web app (port 3000)
│   ├── server/      # Placeholder (exports empty object)
│   └── docs/        # Symlink to /mnt/f/dbrain (external)
├── packages/        # Shared npm packages
│   ├── ui/          # shadcn/ui component library
│   ├── graph/       # @antv/g6-based graph (v1, legacy)
│   ├── graph-v2/    # d3-force graph (v2, current; flow mode is a placeholder shell)
│   ├── editor/      # Tiptap Pro rich text editor (Yjs collab)
│   ├── interfaces/  # Type definitions & models
│   ├── store/       # Zustand v5 state management
│   ├── services/    # Optimistic mutation layer (NodeService, EdgeService, ...)
│   ├── hooks/       # Custom React hooks (useGraph, useNodeEditor)
│   ├── api-client/  # tRPC API client
│   ├── utils/       # Pure utilities (filter, debounce, file)
│   ├── dev/         # Mock data for development
│   ├── eslint-config/   # Flat ESLint configs
│   └── typescript-config/ # Shared TS configs
├── backend/         # TypeScript DDD backend (NOT Rust)
│   ├── domain/         # Domain entities (no framework deps)
│   ├── application/    # Use cases, services
│   ├── infrastructure/ # PocketBase repos, mappers, event bus
│   ├── adapter-back/   # REST API adapter
│   ├── adapter-front/  # Frontend adapter
│   └── adapter-tauri/  # Tauri IPC adapter
└── pb/              # PocketBase binary + data (local dev)
```

`crates/` **does not exist** — backend code is in `backend/`.

## WHERE TO LOOK

| Task                     | Location                                     | Notes                                |
| ------------------------ | -------------------------------------------- | ------------------------------------ |
| UI components            | packages/ui/src/components                   | shadcn/ui + custom                   |
| Graph (v1, legacy)       | packages/graph/src                           | @antv/g6 — still consumed by apps/web |
| **Graph (v2, current)**  | packages/graph-v2/src                        | d3-force (worker); flow mode is a placeholder shell — see dedicated section below |
| Rich text editor         | packages/editor/                             | Tiptap Pro + Yjs, Notion-like editor |
| Type definitions         | packages/interfaces/src                      | Models, nodes, API types             |
| State management         | packages/store/src                           | Zustand v5                           |
| Service layer            | packages/services/src/graph/                 | Optimistic upsert/delete/sync        |
| Desktop app              | apps/desktop/src                             | Tauri + Next.js                      |
| Web app                  | apps/web/src                                 | Next.js 16, React 19                 |
| Backend domain           | backend/domain/src                           | Entities, VOs, repository interfaces |
| Backend infra            | backend/infrastructure/src                   | PocketBase repos, mappers, event bus  |
| Backend adapter          | backend/adapter-back/src                     | DAOs, DI factory                     |

**Per-package AGENTS.md** with deeper conventions exist at:
- `packages/services/AGENTS.md` — service API (upsert/delete/sync)
- `packages/editor/AGENTS.md` — Tiptap setup
- `packages/api-client/AGENTS.md` — tRPC client patterns
- `packages/interfaces/src/AGENTS.md`, `packages/store/src/AGENTS.md`, `packages/ui/src/AGENTS.md`
- `backend/{domain,application,infrastructure,adapter-back,adapter-front,adapter-tauri}/AGENTS.md`

`packages/utils/` and `packages/hooks/` have **no** AGENTS.md.

## CONVENTIONS

- **Package scope:** `@workspace/*` (not `@repo/*`)
- **ESLint:** Flat config, `eslint-plugin-only-warn` (errors→warnings)
- **TS:** `strict: true`, `verbatimModuleSyntax: true`, `alwaysStrict: false`
- **Rust:** Edition 2024 (except Tauri uses 2021)
- **No root Cargo.toml** — each crate is standalone
- **Format:** Prettier (no .editorconfig)
- **Imports:** Type-only imports MUST use `import type` (verbatimModuleSyntax). Root-level `"use client"` required in interactive files in shared packages.

## ANTI-PATTERNS (THIS PROJECT)

- **NO test infrastructure for JS/TS** (no Jest/Vitest configs anywhere; no `*.test.*` files)
- **NO CI/CD checked in** (no GitHub Actions, no Dockerfile)
- `docs/` is symlinked to external path — may cause tooling issues
- `@workspace/*` path aliases in apps/web point to node_modules (unusual — `tsc --noEmit` and editor "find references" may diverge)
- `@workspace/ui` has **no root `.` export** — always import via explicit subpath (`@workspace/ui/components/...`)

## UNIQUE STYLES

- Hybrid TypeScript+Rust monorepo (TypeScript backend DDD + Tauri desktop app)
- Clean architecture applied to TypeScript backend layers
- Tailwind CSS v4 with shadcn/ui
- Zustand v5 for state, React 19, Next.js 16
- Module workers via `new Worker(new URL(..., import.meta.url), { type: 'module' })` (used by graph-v2)

## COMMANDS

```bash
pnpm build         # Build all via turbo
pnpm dev           # Dev all via turbo (note: most packages have no dev script; turbo will skip)
pnpm dev:full      # Run pb (PocketBase) + web + server concurrently
pnpm lint          # Lint all
pnpm format        # Prettier format
pnpm check-types   # TypeScript check all

# Individual apps
pnpm --filter=web dev      # Web app (port 3000)
pnpm --filter=desktop dev  # Desktop app (port 3001)
pnpm --filter=desktop tauri # Tauri CLI

# Single package typecheck
pnpm --filter=@workspace/graph-v2 typecheck
pnpm --filter=@workspace/editor typecheck

# Backend layers (cd into package first)
cd backend/domain && pnpm typecheck
cd backend/infrastructure && pnpm typecheck
cd backend/adapter-back && pnpm typecheck
```

## NOTES

- Desktop app uses Tauri 2.x with Next.js frontend
- PocketBase is the local backend (`pb/` directory contains the binary and dev data)
- No actual Rust backend — backend is TypeScript DDD layers
- `apps/web/app/(main)/graph/page.tsx` imports `@workspace/graph-v2` (v1 `@workspace/graph` is commented out). The demo page exercises the v2 `<Graph />` router.

---

## graph-v2 (current architecture)

`packages/graph-v2/` is the next-generation, in-progress graph visualization package that will replace `@workspace/graph` (v1, @antv/g6). It exposes a single `<Graph />` component that routes by `view.viewType` to one of two orchestrators:

- **`ForceGraph`** — d3-force simulation running in a dedicated `WebWorker` with an `OffscreenCanvas` 2D renderer; IPC via `comlink`.
- **`FlowGraph`** — **placeholder shell only.** The ReactFlow-based implementation (9 node variants, 4 edge variants, transforms, position persistence) was deleted in the flow refactor. `FlowGraph.tsx` keeps the props contract so routing compiles, and renders a static placeholder. Rebuild starts from that file; see git history for the deleted implementation.

### Top-level structure

```
src/
├── index.ts              # Public API — single sanctioned entry point
├── graph.tsx             # <Graph> router (viewType → ForceGraph | FlowGraph)
├── types.ts              # Cross-cutting types (Modifiers, Theme, GraphSnapshot, SourceDiff)
├── eventHandler.ts       # The single shared GraphEventHandler (bridge layer)
├── force/                # Force-mode PRIVATE (d3-force + worker)
│   ├── ForceGraph.tsx    # Main-thread orchestrator (forwardRef)
│   ├── types.ts          # WorkerEvent, WorkerInbound, ForceNodeSeed, etc.
│   ├── transform.ts      # NodeData/EdgeData → ForceNodeSeed/ForceLinkSeed
│   ├── styleConfig.ts    # LIGHT_THEME, DARK_THEME, NODE_STATE_STYLES, DEFAULT_FORCE_CONFIG
│   ├── eventListener.ts  # DOM → ProxiedDomEvent (with AbortController cleanup)
│   └── worker/
│       ├── force.worker.ts  # Worker entry (Comlink.expose + raw msg channel)
│       ├── api.ts           # WorkerInbound implementation
│       ├── simulation.ts    # d3-force setup, hit-test (n<2000 brute, n>=2000 quadtree)
│       └── canvas.ts        # OffscreenCanvas 2D rendering
└── flow/                 # Flow-mode PRIVATE (placeholder shell)
    └── FlowGraph.tsx     # Props-contract shell only — static placeholder, no data pipeline
```

### Architectural rules (codified in JSDoc — do not break)

1. **Single event-handler surface** — children (ForceGraph / FlowGraph) MUST NOT touch `useUIStore` setters or call `useGraph()` callbacks directly. Every gesture routes through the imperative `eventHandler.xxx(...)` method bag that the parent `Graph` builds once via `useGraphEventHandler()`. The documented exception is: `useUIStore.setContextMenu` is read as a prop for `<GraphContextMenu>` (display concern, not event routing). (`FlowGraph` is currently a placeholder and routes no gestures.)

2. **`force/*` and `flow/*` are siblings — they MUST NOT import from each other.** Anything both sides need lives in `src/types.ts`. The single exception is `eventHandler.ts`, which IS allowed to import `WorkerEvent` from `force/types` because `handleWorkerEvent` is force-specific by design.

3. **`types.ts` is the canonical home for cross-cutting types** (`Modifiers`, `Theme`, `GraphSnapshot`, `SourceDiff`). `UiState` is force-only and lives in `force/types.ts` — flow mode does not express UI state.

4. **Re-exports follow ownership** — a type is re-exported from the module that DEFINES it, never from a module that merely uses it. See `src/index.ts:15-16`.

5. **`WorkerInbound` signatures must match `force/worker/api.ts` line-for-line** (TypeScript structural typing enforces this, but it's stated as an explicit contract).

6. **Worker has zero DOM access** — DOM events are captured on the main thread (`eventListener.ts`), serialized to `ProxiedDomEvent`, and forwarded via `api.proxyEvent()`.

7. **`AbortController` for StrictMode cleanup** in `eventListener.ts` — single `abort()` removes every listener attached with `{ signal }`.

8. **Pin-coordinate coerce** at the worker boundary: `ForceNodeSeed.fx/fy` is `number | undefined` (callers may omit) but d3's `SimulationNodeDatum` requires `number | null`; coerce with `seed.fx ?? null` (see `worker/simulation.ts:45-51`).

### Worker boot / message protocol (4 raw channels + Comlink RPC)

| Channel | Direction | Message | Notes |
|---|---|---|---|
| `__READY__` | worker → main | `{ type: "\_\_READY\_\_" }` | Posted at worker boot (`force.worker.ts:70`); main awaits it with a 5s timeout (`ForceGraph.tsx:187`). |
| `__SET_CANVAS__` | main → worker | `{ type: "\_\_SET_CANVAS\_\_", canvas: OffscreenCanvas, width, height }` | Sent via raw `postMessage` with the canvas in the transfer list — Comlink v4 cannot transfer OffscreenCanvas by default. |
| `__PING__` / `__PONG__` | both | health check | Worker is exposed on `self` for direct call; `WorkerOutbound` is declared but not currently used. |
| `__FRAME__` | worker → main | `{ type: "\_\_FRAME\_\_", bitmap: ImageBitmap }` | Sent via raw `postMessage` with the bitmap in the transfer list. `ImageBitmap` is not a default Comlink Transferable. Main thread calls `bitmap.close()` after `drawImage` to release GPU memory. |
| Comlink RPC | both | everything else | `Comlink.expose(api)` on worker; `Comlink.wrap<WorkerInbound>(worker)` on main. Event sink registered with `Comlink.proxy(onWorkerEvent)`. |

**Frame coalescing** uses `queueMicrotask` (not `requestAnimationFrame`) — see `api.ts:80-82`. This is deliberate, since rAF is unreliable inside workers.

### d3-force configuration (defaults from `styleConfig.ts:175-182`)

| Force | Default | Notes |
|---|---|---|
| `forceLink` | `linkDistance: 80` | `.id(d => d.id)` — source/target resolve as NodeId strings |
| `forceManyBody` | `strength: -300` | Negative = repulsion |
| `forceCollide` | `collisionRadius: 12` | Per-node radius: `weight + 4` (weight defaults to 8) |
| `forceCenter` | `centerX/Y = dims/2` | Updated on init + resize |
| Simulation | `alphaMin: 0.001, alphaDecay: 0.0228, velocityDecay: 0.4` | |

**Hit-test** uses `d3-quadtree` when `nodes.length >= 2000`, brute-force linear scan otherwise (threshold hard-coded in `simulation.ts:138`).

**Alpha control**: `createOrUpdate` calls `alpha(1).restart()`; `applyDiff` calls `alphaTarget(0.1).restart()`; `updateConfig` calls `alpha(0.3).restart()`; `setNodeFixed(true)` sets `alphaTarget(0.3)`.

**Position backfill** on first load: reads `stateData.client.position[currentViewId]` from the store. If absent, leaves x/y undefined so d3-force falls back to its phyllotaxis initializer. The persisted x/y override the running position only when `existing.fx === null` (don't snap a node mid-drag).

### Modifier-key policy (per `eventListener.ts:8-15`)

- **Alt**: drag inhibited on the worker; main thread handles create-edge + assist-edge visuals.
- **Ctrl**: drag inhibited; main thread starts lasso-select.
- **Shift**: reserved for additive selection in the main thread.

### Position persistence

Schema: `NodeData.stateData.client.position: Array<{ viewId, x, y, mode }>` (an array, not a record).

**Force mode** does NOT persist viewport (per design.md §5.1/§6.1.1) and does not write positions back — but reads `stateData.client.position[viewId]` as x/y seeds on first load (so layout doesn't reset when switching views).

**Flow mode** previously owned the full write path: drag-stop → `NodeService.upsert` with dual 200ms debounces, plus 1000ms-debounced viewport writes to `useDataStore.getState().upsertView(next)`. That implementation was deleted with the flow refactor — any future flow rebuild must restore it.

### 7-state UI enum (`UiState`, force-only)

`UiState` is **force-mode private** — defined in `force/types.ts`, not exported from `src/index.ts`, and **not used by flow mode at all** (flow is a placeholder shell with no UI-state concept).

Values: `default | hover | selected | active | neighborActive | inactive | disabled`. Order is significant — `force/styleConfig.ts` keys the `NODE_STATE_STYLES` and `EDGE_STATE_STYLES` records off it.

Used in:
- `force/styleConfig.ts` — `NODE_STATE_STYLES` and `EDGE_STATE_STYLES` records (both byte-identical)
- `force/transform.ts` — `defaultState?: UiState` option for seed generation
- `force/worker/simulation.ts` — worker-internal `SimNode.ui` / `SimLink.ui` field; `recomputeUiStates()` mirrors the active selection / hover into per-node state on every tick

### Cross-package contract map (graph-v2 → workspace)

| Workspace package | Symbols used | Notes |
|---|---|---|
| `@workspace/interfaces` | All NodeData/EdgeData/View types (type-only imports only) | `verbatimModuleSyntax` → `import type` mandatory |
| `@workspace/store` | `useDataStore`, `useUIStore` | Treat as read+command bus via `.getState()`; do NOT call as React selector in render path. `useDataStore.subscribe` + `state.clearDiff()` is the one-shot diff pattern. Mutations are immutable (`new Map(state.x)`). |
| `@workspace/ui` | `GraphContextMenu`, `GraphContextMenuProps` (only from `@workspace/ui/components/graph-context-menu/graph-context-menu`) | `@workspace/ui` has no `.` export — use explicit subpaths. Component is client-only. |
| `@workspace/utils` | `filterByViewFilterConfig`, `debounce` | `filterByViewFilterConfig` returns NEW Map instances. `debounce` is trailing-edge only, no `cancel`/`flush`, loses `this`. |
| `@workspace/hooks` | `useGraph()` (from `eventHandler.ts:28` only) | Client-only. `onCreateEdge` requires a caller-supplied `setContextMenu` (5th arg). All mutators swallow errors with `console.error`. |
| `@workspace/services` | `NodeService` (used in `force/ForceGraph.tsx:71`) | Declared in `package.json`. The flow-mode `NodeService`/`EdgeService` usage was removed with the flow refactor. |

### Latent issues / gotchas

- **`apps/web/tsconfig.json` has NO path alias for `@workspace/graph-v2`** — it only has `@workspace/graph` (v1). The v2 import resolves via pnpm symlink + `exports` field. Editor "find references" and `tsc --noEmit` may diverge.
- **`tsconfig.lint.json` includes a `turbo` directory that doesn't exist** — harmless dead config.
- **`tsconfig.json` has no `outDir` and `noEmit` is true** (inherited). The package has no `build` script. Consumers receive `.ts` source via `exports: { ".": "./src/index.ts" }`.
- **`FlowGraph` is a placeholder shell** — renders a static message and ignores all data-feed props. Rebuild starts from `flow/FlowGraph.tsx`; see git history for the deleted ReactFlow implementation (which also removes the old `onConnect` hard-coding, `(0,0)` dagre fallback, and `Controls`/`MiniMap` overlap gotchas).
- **40+ JSDoc references to design.md files that may not resolve in every environment** — the most-referenced path is `docs/07-agent/graph-v2/src/design.md` (the `docs/` symlink target is `/mnt/f/dbrain`, external). Many JSDoc lines also cite `main design L###` line numbers from an external spec doc with no path.

### Commands (graph-v2 only)

```bash
pnpm --filter=@workspace/graph-v2 typecheck   # tsc --noemit
pnpm --filter=@workspace/graph-v2 lint        # eslint
pnpm --filter=@workspace/graph-v2 format      # prettier
```

No `build` / `dev` / `test` scripts exist.

### Test infrastructure

**None.** No `*.test.*`, no `__tests__/`, no vitest/jest config. The only scripts are `lint`, `format`, `typecheck`. Consistent with the rest of the JS/TS monorepo (per anti-pattern note above).
