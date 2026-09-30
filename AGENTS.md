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
│   ├── graph/       # d3-force graph (worker); flow mode is a placeholder shell
│   ├── dataview/    # Multi-shape data views (table + kanban + calendar implemented; gantt/gallery/chart/nodeGraph placeholders); used by database & collection node content
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

| Task             | Location                     | Notes                                                                                                                                                                           |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI components    | packages/ui/src/components   | shadcn/ui + custom                                                                                                                                                              |
| Graph            | packages/graph/src           | d3-force (worker); flow mode is a placeholder shell — see dedicated section below                                                                                               |
| Data views       | packages/dataview/src        | Multi-shape data browsing for database/collection nodes; the table, kanban and calendar views are implemented and the other four are placeholders — see dedicated section below |
| Rich text editor | packages/editor/             | Tiptap Pro + Yjs, Notion-like editor                                                                                                                                            |
| Type definitions | packages/interfaces/src      | Models, nodes, API types                                                                                                                                                        |
| State management | packages/store/src           | Zustand v5                                                                                                                                                                      |
| Service layer    | packages/services/src/graph/ | Optimistic upsert/delete/sync                                                                                                                                                   |
| Desktop app      | apps/desktop/src             | Tauri + Next.js                                                                                                                                                                 |
| Web app          | apps/web/src                 | Next.js 16, React 19                                                                                                                                                            |
| Backend domain   | backend/domain/src           | Entities, VOs, repository interfaces                                                                                                                                            |
| Backend infra    | backend/infrastructure/src   | PocketBase repos, mappers, event bus                                                                                                                                            |
| Backend adapter  | backend/adapter-back/src     | DAOs, DI factory                                                                                                                                                                |

**Per-package AGENTS.md** with deeper conventions exist at:

- `packages/services/AGENTS.md` — service API (upsert/delete/sync)
- `packages/editor/AGENTS.md` — Tiptap setup
- `packages/dataview/AGENTS.md` — data view shell, registry, adapters
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
- **Tailwind content scanning:** only `packages/ui/src`, `apps/**` and the paths
  explicitly listed in `packages/ui/src/styles/globals.css` are scanned. A
  workspace package reaches the app through a symlink in `node_modules`, which
  Tailwind's automatic detection skips — a class used _only_ in that package is
  silently missing from the stylesheet. Add an `@source` line for it (`dataview`
  has one); never widen a glob to `apps/**`, which drags in `.next` and stalls
  the dev-server compile.
- **shadcn first:** `packages/ui/src/components/ui` gained `badge`, `checkbox`,
  `switch`, `toggle` and `toggle-group` (built on the already-present
  `radix-ui`). Feature UI composes these instead of native `<select>` /
  `<input type="checkbox">` or hand-rolled popovers.

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
- Module workers via `new Worker(new URL(..., import.meta.url), { type: 'module' })` (used by graph)

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
pnpm --filter=@workspace/graph typecheck
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
- `apps/web/app/(main)/graph/page.tsx` imports `<Graph />` from `@workspace/graph`. The demo page exercises the graph `<Graph />` router.

---

## graph (current architecture)

`packages/graph/` is the graph visualization package (succeeded the legacy
`@antv/g6`-based v1 implementation, which was removed when this package took
over the name). It exposes a single `<Graph />` component that routes by `view.viewType` to one of two orchestrators:

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

| Channel                 | Direction     | Message                                                                  | Notes                                                                                                                                                                                             |
| ----------------------- | ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__READY__`             | worker → main | `{ type: "\_\_READY\_\_" }`                                              | Posted at worker boot (`force.worker.ts:70`); main awaits it with a 5s timeout (`ForceGraph.tsx:187`).                                                                                            |
| `__SET_CANVAS__`        | main → worker | `{ type: "\_\_SET_CANVAS\_\_", canvas: OffscreenCanvas, width, height }` | Sent via raw `postMessage` with the canvas in the transfer list — Comlink v4 cannot transfer OffscreenCanvas by default.                                                                          |
| `__PING__` / `__PONG__` | both          | health check                                                             | Worker is exposed on `self` for direct call; `WorkerOutbound` is declared but not currently used.                                                                                                 |
| `__FRAME__`             | worker → main | `{ type: "\_\_FRAME\_\_", bitmap: ImageBitmap }`                         | Sent via raw `postMessage` with the bitmap in the transfer list. `ImageBitmap` is not a default Comlink Transferable. Main thread calls `bitmap.close()` after `drawImage` to release GPU memory. |
| Comlink RPC             | both          | everything else                                                          | `Comlink.expose(api)` on worker; `Comlink.wrap<WorkerInbound>(worker)` on main. Event sink registered with `Comlink.proxy(onWorkerEvent)`.                                                        |

**Frame coalescing** uses `queueMicrotask` (not `requestAnimationFrame`) — see `api.ts:80-82`. This is deliberate, since rAF is unreliable inside workers.

### d3-force configuration (defaults from `styleConfig.ts:175-182`)

| Force           | Default                                                   | Notes                                                      |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `forceLink`     | `linkDistance: 80`                                        | `.id(d => d.id)` — source/target resolve as NodeId strings |
| `forceManyBody` | `strength: -300`                                          | Negative = repulsion                                       |
| `forceCollide`  | `collisionRadius: 12`                                     | Per-node radius: `weight + 4` (weight defaults to 8)       |
| `forceCenter`   | `centerX/Y = dims/2`                                      | Updated on init + resize                                   |
| Simulation      | `alphaMin: 0.001, alphaDecay: 0.0228, velocityDecay: 0.4` |                                                            |

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

### Cross-package contract map (graph → workspace)

| Workspace package       | Symbols used                                                                                                             | Notes                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@workspace/interfaces` | All NodeData/EdgeData/View types (type-only imports only)                                                                | `verbatimModuleSyntax` → `import type` mandatory                                                                                                                                                                      |
| `@workspace/store`      | `useDataStore`, `useUIStore`                                                                                             | Treat as read+command bus via `.getState()`; do NOT call as React selector in render path. `useDataStore.subscribe` + `state.clearDiff()` is the one-shot diff pattern. Mutations are immutable (`new Map(state.x)`). |
| `@workspace/ui`         | `GraphContextMenu`, `GraphContextMenuProps` (only from `@workspace/ui/components/graph-context-menu/graph-context-menu`) | `@workspace/ui` has no `.` export — use explicit subpaths. Component is client-only.                                                                                                                                  |
| `@workspace/utils`      | `filterByViewFilterConfig`, `debounce`                                                                                   | `filterByViewFilterConfig` returns NEW Map instances. `debounce` is trailing-edge only, no `cancel`/`flush`, loses `this`.                                                                                            |
| `@workspace/hooks`      | `useGraph()` (from `eventHandler.ts:28` only)                                                                            | Client-only. `onCreateEdge` requires a caller-supplied `setContextMenu` (5th arg). All mutators swallow errors with `console.error`.                                                                                  |
| `@workspace/services`   | `NodeService` (used in `force/ForceGraph.tsx:71`)                                                                        | Declared in `package.json`. The flow-mode `NodeService`/`EdgeService` usage was removed with the flow refactor.                                                                                                       |

### Latent issues / gotchas

- **`tsconfig.lint.json` includes a `turbo` directory that doesn't exist** — harmless dead config.
- **`tsconfig.json` has no `outDir` and `noEmit` is true** (inherited). The package has no `build` script. Consumers receive `.ts` source via `exports: { ".": "./src/index.ts" }`.
- **`FlowGraph` is a placeholder shell** — renders a static message and ignores all data-feed props. Rebuild starts from `flow/FlowGraph.tsx`; see git history for the deleted ReactFlow implementation (which also removes the old `onConnect` hard-coding, `(0,0)` dagre fallback, and `Controls`/`MiniMap` overlap gotchas).
- **40+ JSDoc references to design.md files that may not resolve in every environment** — the most-referenced path is `docs/07-agent/graph-v2/src/design.md` (the `docs/` symlink target is `/mnt/f/dbrain`, external). Many JSDoc lines also cite `main design L###` line numbers from an external spec doc with no path.

### Commands (graph only)

```bash
pnpm --filter=@workspace/graph typecheck   # tsc --noemit
pnpm --filter=@workspace/graph lint        # eslint
pnpm --filter=@workspace/graph format      # prettier
```

No `build` / `dev` / `test` scripts exist.

### Test infrastructure

**None.** No `*.test.*`, no `__tests__/`, no vitest/jest config. The only scripts are `lint`, `format`, `typecheck`. Consistent with the rest of the JS/TS monorepo (per anti-pattern note above).

---

## dataview (current architecture)

`packages/dataview/` is the multi-shape data browsing layer embedded in the
`database` and `collection` node contents (design:
`docs/dataview/README.md` + one file per view). It exposes a single
`<DataViewRoot />` that takes one normalized `DataViewSource` (`fields` +
`rows`) and renders it through switchable views:

- **Shell — implemented:** `<DataViewRoot />` (view tab strip with new/rename,
  the per-view 更多 actions — default/duplicate/delete — published to the view
  toolbar, lazily-loaded renderer routing), the source adapters
  (`databaseToDataViewSource`, `collectionToDataViewSource`), `CellResolver`, the
  view registry, and default config builders.
- **Config lives in the view toolbar, not a side panel.** Each renderer draws a
  `ViewToolbar` strip — **configuration left, functions right**, every control a
  button or dropdown menu. The strip itself never wraps: the configuration group
  wraps _inside_ its own box while the function group stays pinned to the right,
  so the right-hand buttons cannot jump between lines as the window is resized.
  The table uses _only_ dedicated menus (添加记录 /
  字段配置 / 筛选 / 分组 / 排序 / 行高 / 填色), the kanban its own four panels
  (分组 / 卡片 / 排序 / 显示) and the calendar its own four (字段 / 视图 / 交互 /
  显示), so none of them has a generic 视图配置 popover and none registers a
  `configEditor`; `ViewConfigMenu` in
  `shared/view-toolbar.tsx` remains for views that have no dedicated menu yet.
  The panel chrome and the in-popover field picker are shared
  (`shared/settings-panel.tsx`, `shared/field-select.tsx`).
- **View actions (更多) live in that function group too**, not on the tab strip:
  the shell (`toolbar/view-actions.tsx`) publishes 设为默认/复制/删除视图 through a
  slot context, `ViewToolbar` appends it, and a view with its own toolbar (the
  table) calls `useViewActions()` and puts it last — so the tab strip is pure
  navigation. **Every function-group control must be fixed-size and always
  present**: the group is right-anchored, so a control that resizes or
  appears/disappears on re-render pushes itself and its left-hand neighbours
  around (that was the visible toolbar jitter: the 删除选中 button that appeared
  with a selection, and the search field whose inner counter/addon changed on
  every keystroke). Variable-width readouts sit at the left end of the group, and
  input-like controls get their own row — the table's search is a **button** in the
  toolbar with a `TableSearchBar` row that opens underneath it.
- **Table view — implemented:** `@visactor/vtable` `ListTable` with cell editing
  (input / date / checkbox; 单选/多选 are edited from their own option dropdown
  rather than in place), header + context-menu
  sorting, a condition-list 筛选 menu, multi-level 分组, search, CSV/Excel export,
  row insert/delete (从单元格右键菜单：删除此行 / 删除选中的 N 行)/
  drag-reorder, **field CRUD (a trailing "+" column and
  字段配置 → 新增字段, both opening the 字段编辑 form as the body of a shadcn
  `DropdownMenu`; 编辑字段 reuses the row's own "…" menu, so the form lands exactly
  where that menu was, with
  标题/字段类型/选项内容/默认值, 字段配置 with search/collapsible group
  blocks/drag/hide/delete), column groups (VTable group headers), 单选/多选
  colour capsules whose active cell grows a per-capsule "×" and a chevron that
  opens a 查找或创建选项 dropdown (单选 closes on a pick, 多选 stays open), and
  conditional 填色 (cell/row/column)**, plus 行高. `views/table/` is itself split by
  responsibility — `table-data-view.tsx` (the shell, the only entry the registry
  imports) plus `core/` (pure logic: `schema`, `column-ops`, `filter`,
  `editors`), `canvas/` (`theme`, `pill`), `toolbar/` (`toolbar`, `search-bar`),
  `menus/` (`field-menu`, `filter-menu`, `condition-menu`,
  `condition-controls`, `color-menu`, `select-menu`) and `fields/` (`picker`,
  `editor`); the shared field vocabulary (type labels/icons, option + fill
  palettes) lives in `shared/field-meta.tsx` because the kanban's lane editor
  needs the same option colours. `core/` and `canvas/` import no React, and
  nothing inside the folder imports the shell.
- **UI shell + table chrome are shadcn-composed:** every picker is a `Select`,
  every setting a `Switch`/`Checkbox`/`ToggleGroup`, every chip a `Badge`, the
  search box an `InputGroup` and the searchable field list a `Command`; `--primary`
  is reserved for state the user engaged (active filter/group/sort/colour, checked
  control, selection). The canvas theme mirrors the same tokens
  (`shared/theme-tokens.ts` → `canvas/theme.ts`). Full conventions in
  `packages/dataview/AGENTS.md` § _UI conventions_.
- **Kanban view — implemented** (`views/kanban/`): a vendored ReUI board
  (`reui/kanban.tsx`, the radix-variant registry item) over `@dnd-kit`, with the
  data model in `core/` (`board.ts` lanes/cards, `config.ts` self-heal) and the
  composition in `board/` (lane strip + card + 编辑选项). Cross-lane drops write
  the group field through `onCellChange`, lane reorders write `config.laneOrder`,
  lane renames write `onFieldsChange`, and the four settings panels (分组 / 卡片 /
  排序 / 显示) live in its toolbar — so, like the table, it registers **no**
  `configEditor`. A `multiSelect` grouping renders read-only cards (one row in
  several lanes → no unambiguous drop target), and lane-internal order is never
  persisted. See `docs/dataview/kanban.md`.
- **Calendar view — implemented** (`views/calendar/`): a FullCalendar (v6.1.21)
  surface — 月 / 周 / 日 / 列表 / 多月, with the pure layer in `core/`
  (`config.ts` self-heal + `headerToolbar` ⇄ "today + view buttons" + the
  `multiMonth`→`multiMonthYear` mapping, `schema.ts` rows→events and
  gesture→cells holding the **only** exclusive-`end` ±1 day conversion,
  `theme.ts` → `--fc-*` variables), the one `memo`-wrapped `<FullCalendar>` plus
  the hover-tooltip / click-popover anchors in `board/`, and the four settings
  panels (字段 / 视图 / 交互 / 显示) in its toolbar — so, like the table and the
  kanban, it registers **no** `configEditor`. Drag / resize / 框选 / 双击 bubble
  up as `onCellChange` / `onRowInsert`; `eventClick` is 打开记录 / 详情弹层 /
  不响应. See `docs/dataview/calendar.md` §0 for its load-bearing gotchas.
- **The other 4 view renderers + config editors — placeholder only:** `gantt`,
  `gallery`, `chart`, `nodeGraph`. Each renders
  `<DataViewPlaceholder />` and names the library it is planned to use (their
  placeholder toolbars still carry the generic 视图配置 popover, since they have
  no dedicated menus yet).

### Top-level structure

```
src/
├── index.ts          # Public API — <DataViewRoot /> + types + adapters
├── data-view-root.tsx # view tab strip + lazy renderer
├── registry.ts       # DATA_VIEW_REGISTRY (type → descriptor, React.lazy renderers)
├── defaults.ts       # createDefaultConfig / createDefaultDataView / seedDataViewId
├── toolbar/          # view tab strip + new-view menu, 更多 actions slot (view-actions.tsx)
├── source/           # types (re-export), database/collection adapters, cell-resolver, row-utils, field-utils
├── shared/           # view-toolbar (ViewToolbar/ViewConfigMenu), field-meta, field-select (in-popover picker),
│                     #   settings-panel (SettingsPanel/PanelSection/SwitchRow), color (contrastTextColor),
│                     #   placeholders, empty-state, theme-tokens, row filter/selection
└── views/<name>/     # <name>-data-view.tsx (+ config-editor.tsx when the view needs one)
                      #   table/    = implemented, split into core/ canvas/ toolbar/ menus/ fields/; no config-editor
                      #   kanban/   = implemented, split into reui/ core/ board/ toolbar/; no config-editor
                      #   calendar/ = implemented, split into core/ board/ toolbar/; no config-editor
                      #   the other four = placeholders
```

### Architectural rules (do not break)

1. **Persisted types live in `@workspace/interfaces`** (`models/data-view.ts`),
   never in the package — `DatabaseContent.views` / `CollectionContent.views`
   are node content. `source/types.ts` only re-exports them plus the React
   renderer/config-editor props contract.
2. **Renderers never write.** Data changes bubble up via `onCellChange`; the
   host node-content persists (today `NodeService.upsert`). The same applies to
   view config edited on the canvas (header sort, column resize): it goes through
   `onConfigChange`, which the root only forwards when the host passed
   `onViewsChange`. **Schema changes follow the same rule** through
   `onFieldsChange(fields, rows?)` — the renderer reconciles rows with
   `reconcileRowsForFields` and the host writes both halves in one upsert.
3. **`readOnly` = data is read-only, not views are frozen.** View management is
   enabled by the host passing `onViewsChange`; a read-only collection
   projection still supports adding/renaming/configuring views and still allows
   column hide/reorder/group/sort/filter/colour. Field CRUD additionally needs
   `onFieldsChange`, so a collection offers no 新增字段 and no column-end "+".
4. **The registry is the single dispatch table** — the root, the toolbar and the
   config menus never `switch` on `DataViewType`. `descriptor.nodeTypes` encodes
   the capability matrix (nodeGraph is collection-only).
5. **Lazy by construction** — every renderer/config editor is `React.lazy`;
   view libraries must only be reachable through those dynamic imports.
6. **Config is in the view toolbar, never a side panel** — one strip per view,
   configuration controls left, function controls right
   (`docs/propmt/dataview-table-1.md`).

### Host integration

| Host         | File                                                                         | Behaviour                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database`   | `packages/ui/src/components/dialog/editor/content/database-node-content.tsx` | editable; cell writes → `NodeService.upsert(nodeId, { content })`; also supplies `onRowInsert` / `onRowDelete` / `onRowReorder` / `onFieldsChange` and a lazy `resolveNodeTitle`      |
| `collection` | `.../content/collection-node-content.tsx`                                    | read-only projection of selected graph nodes; `onOpenNode` → `useUIStore.getState().handleNodeEdit(nodeId)`; no row/field callbacks, so the table offers no editing and no field CRUD |

`node-content-editor.tsx` routes `case "database"` / `case "collection"`.
Hosts must mount with `key={node.id}` (the root seeds its view state once per
mount).

### Persistence (views)

`content.views` is persisted end to end (README §5.2). The chain, top to bottom:

| Layer  | Where                                           | Shape                                                                                                                                                                                                                                                                         |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| column | `pb/pb_migrations/1700000000_initial_schema.js` | `nodes.views` (json), shared by `database` + `collection`, alongside `fields`/`rows`/`filterConfig`                                                                                                                                                                           |
| domain | `backend/domain/.../value-objects.ts`           | `CollectionContent` / `DatabaseContent` carry `views`; `normalizeViews` is the validation boundary (unique ids, non-empty `name`, `type` ∈ `DATA_VIEW_TYPES`, object `config`); `withFilter` / `withViews` and `DatabaseNode.rebuildContent` are the only sanctioned rebuilds |
| app    | `node-command.service.ts`                       | `filterConfig` and `views` are **independent halves**: a patch naming one leaves the other alone                                                                                                                                                                              |
| DTO    | `dto/node-dto.mapper.ts`                        | both content literals name `views` explicitly — anything unnamed there is dropped                                                                                                                                                                                             |
| infra  | `database/mappers/node.mapper.ts`               | `views` column ↔ `content.views` (a missing column reads as `[]`)                                                                                                                                                                                                             |
| API    | `adapter-front/.../router/node.ts`              | `views` declared on both content schemas as `z.array(z.custom<DataView>(…))`                                                                                                                                                                                                  |

Two traps when touching this:

- **`z.object` would silently strip views.** Views go through `z.custom`, which
  validates identity and passes the payload through byte-for-byte. Do not swap it
  for a `z.object` (strips unknown keys, e.g. everything inside `config`), and do
  not add `.passthrough()` either — its index signature makes the parsed type
  unassignable from `NodeData`, which breaks `NodeService.upsert`'s typecheck.
- **Inside the domain, rebuild content through the `with*` helpers.** A bare
  `new DatabaseContent(fields, rows)` defaults `views` to `[]`, so every column /
  row mutation in `DatabaseNode` goes through the private `rebuildContent`.

Because the `views` column was added to the **0-numbered** migration, an existing
`pb_data` will not pick it up (PocketBase dedupes migrations by filename only) —
delete `pb/pb_data` to rebuild, or writes fail with `unknown field`.

### Known gaps

The **table**, **kanban** and **calendar** views are real; **the other four views
are still placeholders** — no `gantt` / `gallery` / `chart` / `nodeGraph`
renderer draws data yet. Within the table view, relation cells are read-only
(clicking one opens the referenced node instead of offering a picker), bulk field
edits are not implemented, column groups do not nest, and
`TableColumnConfig.format.dateFormat` / `numberFormat` and `cellTypeOverride`
have no UI yet. See `docs/dataview/table.md` §9/§10. The kanban draws no card
entry for an option that has none (its 编辑选项 can rename/recolour an option but
deliberately not delete it), and a card's lane-internal position is not
persisted; see `docs/dataview/kanban.md` §8. The calendar has no recurring
events, no resource/people view (premium), no event legend, and no
time-of-day events — a `date` cell is a calendar day, so every event is all-day;
its `timeZone` config key is persisted but pinned to `local`; see
`docs/dataview/calendar.md` §9.

### Commands (dataview only)

```bash
pnpm --filter=@workspace/dataview typecheck   # tsc --noemit (clean)
pnpm --filter=@workspace/dataview lint        # eslint (clean)
pnpm --filter=@workspace/dataview format      # prettier
```

No `build` / `dev` / `test` scripts exist. Consumers receive `.ts` source via
`exports`, and must add the package to `transpilePackages` + tsconfig paths
(`apps/web` and `packages/ui` already do).
