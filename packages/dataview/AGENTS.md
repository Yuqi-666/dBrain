# AGENTS.md — @workspace/dataview

**Path:** `packages/dataview`
**Parent:** `/home/lyq/workspace/projects/dBrain/AGENTS.md`
**Design doc:** `docs/dataview/README.md` (plus `table.md`, `calendar.md`, `kanban.md`, `gantt.md`, `gallery.md`, `chart.md`, `node-graph.md`)

## OVERVIEW

`packages/dataview/` is the multi-shape data browsing layer embedded in the
`database` and `collection` node contents. It takes one normalized
`DataViewSource` (`fields` + `rows`) and renders it through switchable views
(table / kanban / calendar / gantt / gallery / chart / nodeGraph), each with its
own config.

**Current status: shell + the table view.** `<DataViewRoot />` (toolbar, routing,
config panel, view CRUD), the source adapters, the cell resolver and **the
`table` view** (VTable `ListTable`: rendering, editing, sorting, filtering,
grouping, search, export, row CRUD/reorder, config editor) are implemented. The
other **six view renderers and config editors are still placeholders** that
render `<DataViewPlaceholder>` / `<DataViewConfigPlaceholder>`, and their
libraries (FullCalendar, VChart, dnd-kit, @workspace/graph) are not dependencies
yet — each view pulls its library only when it is implemented.

## STRUCTURE

```
src/
├── index.ts                     # Public API — the only sanctioned entry point
├── data-view-root.tsx           # <DataViewRoot /> shell (toolbar + router + config panel)
├── registry.ts                  # DATA_VIEW_REGISTRY: type → descriptor (lazy renderer/configEditor)
├── defaults.ts                  # createDefaultConfig / createDefaultDataView / seedDataViewId
├── toolbar/
│   ├── data-view-toolbar.tsx    # tab strip + view actions menu + panel toggle
│   └── view-switcher.tsx        # tab strip, inline rename (double-click), "new view" menu
├── config-panel/
│   └── data-view-config-panel.tsx
├── source/
│   ├── types.ts                 # re-exports the persisted model + renderer props contract
│   ├── database-source.ts       # DatabaseContent → DataViewSource
│   ├── collection-source.ts     # node projection → DataViewSource (fixed __schema)
│   ├── cell-resolver.ts         # DatabaseCell → text/scalar/date/number/color/node ids
│   └── field-utils.ts           # primary/date/number/select field pickers
├── shared/
│   ├── data-view-placeholder.tsx        # placeholder body the six unimplemented views render
│   ├── data-view-config-placeholder.tsx # placeholder body their config editors render
│   ├── empty-state.tsx
│   ├── theme-tokens.ts          # literal light/dark tokens for canvas libraries
│   ├── use-row-filter.ts
│   └── use-row-selection.ts
└── views/
    ├── table/       table-data-view.tsx + table-schema.ts + table-editors.ts
    │                + table-theme.ts + table-filter.ts + table-toolbar.tsx + config-editor.tsx
    ├── kanban/      kanban-data-view.tsx + config-editor.tsx    (placeholder)
    ├── calendar/    calendar-data-view.tsx + config-editor.tsx  (placeholder)
    ├── gantt/       gantt-data-view.tsx + config-editor.tsx     (placeholder)
    ├── gallery/     gallery-data-view.tsx + config-editor.tsx   (placeholder)
    ├── chart/       chart-data-view.tsx + config-editor.tsx     (placeholder)
    └── node-graph/  node-graph-data-view.tsx + config-editor.tsx   (no hyphens in the type: `nodeGraph`)
```

### table view internals (the reference implementation)

| File | Responsibility |
| --- | --- |
| `table-schema.ts` | `fields`→columns (self-healing), `rows`→records (`__rowId`), edited value→`DatabaseCell` |
| `table-editors.ts` | VTable editors: input / date / list, plus a hand-written `multiSelect` checkbox list |
| `table-theme.ts` | `DataViewThemeTokens` → VTable `ITableThemeDefine` |
| `table-filter.ts` | runtime shape + evaluation of the loose `config.filterState` blob |
| `table-toolbar.tsx` | search, column filters, grouping, density, row insert/delete, export |
| `table-data-view.tsx` | the imperative `ListTable` lifecycle and every event→callback mapping |
| `config-editor.tsx` | column visibility/width/order, behaviour toggles, presentation options |

### UI conventions (applies to every view)

The chrome is built from `@workspace/ui` shadcn primitives only — no hand-rolled
`<select>` / `<input type="checkbox">` / bare floating panels:

| Need | Use |
| --- | --- |
| Dropdown / picker | `select` (`Select`, `SelectTrigger`, `SelectItem`) |
| Boolean setting row | `switch`; column-visibility style multi-select | `checkbox` |
| 2–4 mutually exclusive options (row density, theme) | `toggle` / `toggle-group` |
| Counts and status chips | `badge` |
| Search field with inner actions | `input-group` (`InputGroupAddon` / `InputGroupButton`) |
| Floating panel, menu, tooltip, scroller | `popover`, `dropdown-menu`, `tooltip`, `scroll-area` |
| Split between control groups | `separator` (vertical, `h-4 self-center`) |

Layout rules to keep:

- one control row per strip: strip `min-h-9`, every control `h-7`, icon buttons
  `size-7`; gaps 4px inside a group, 6–8px between groups;
- **`--primary` is spent only on state the user has engaged** (active filter or
  grouping chip, checked switch/checkbox, selection border, focused input).
  Navigation (view tabs) is neutral: the active tab is the raised one in a
  recessed `bg-muted/60` track, never tinted;
- labels are 12px sentence case, hints 11px `text-muted-foreground`; numbers use
  `tabular-nums`; no ALL-CAPS tracked eyebrows;
- an empty state is an invitation (muted panel + what to do), not a mood.

## WHERE TO LOOK

| Task | Location |
| --- | --- |
| Change the shell / routing | `src/data-view-root.tsx` |
| Add or re-label a view type | `src/registry.ts` + `src/defaults.ts` |
| Tweak default configs | `src/defaults.ts` |
| Change how database rows are read | `src/source/database-source.ts` |
| Change the collection projection schema | `src/source/collection-source.ts` (`COLLECTION_FIELD_IDS`) |
| Cell → text/color/date/number | `src/source/cell-resolver.ts` |
| Implement a view | `src/views/<name>/` (replace the placeholder body) |
| Host integration | `packages/ui/src/components/dialog/editor/content/{database,collection}-node-content.tsx` |
| Persisted model | `packages/interfaces/src/models/data-view.ts` |

## DATA FLOW (do not break)

```
node.content (fields/rows/views)
   → adapter (databaseToDataViewSource | collectionToDataViewSource)
   → <DataViewRoot source views activeViewId onViewsChange onCellChange onOpenNode />
        → rowFilter → registry[type].renderer (lazy)
```

1. **Types live in `@workspace/interfaces`** (`models/data-view.ts`), not here —
   `DatabaseContent.views` / `CollectionContent.views` are part of node content.
   `src/source/types.ts` only re-exports them and adds the React props contract.
2. **Renderers never write.** A change bubbles up as `onCellChange`; the host
   node-content decides how to persist (today: `NodeService.upsert`). The same
   holds for view config the user edits *on the canvas* (a header sort, a column
   resize): the renderer reports it through `onConfigChange` and `DataViewRoot`
   persists it — a renderer never calls `onViewsChange` itself.
3. **`readOnly` means "the data is read-only"** (collection projections), *not*
   "views cannot be managed". View management is enabled by the host passing
   `onViewsChange`; `onConfigChange` is only handed to a renderer when it is.
4. **The registry is the only dispatch table.** `DataViewRoot`, the toolbar and
   the config panel never `switch` on `DataViewType`.
5. **`nodeTypes` enforces the capability matrix** (`README.md` §7): `nodeGraph`
   is collection-only; everything else works on both hosts. A persisted view
   whose type is not allowed for the current host is dropped on mount.
6. **Lazy loading is intentional.** `registry.ts` wraps every renderer/config
   editor in `React.lazy`; `DataViewRoot` provides the `<Suspense>` boundaries.
   Keep new view deps out of the package's static import graph — the table view
   imports `@visactor/vtable*` at the top of its own `views/table/*` modules,
   which is fine precisely because those modules are only reachable lazily.
7. **`node-graph/` is the only hyphenated directory**; the type literal is
   `nodeGraph`.

## HOST CONTRACT

```tsx
<DataViewRoot
  key={node.id}                 // host MUST remount per node: internal view state seeds once
  source={source}               // built by an adapter, never by hand
  views={content.views}         // optional; seeds a default view when empty
  readOnly={isCollection}       // data read-only
  onViewsChange={(views) => persist({ ...content, views })}   // presence enables view CRUD
  onCellChange={(rowId, fieldId, cell) => …}
  onOpenNode={(nodeId) => useUIStore.getState().handleNodeEdit(nodeId)}
  // —— optional, table view (database hosts) ——
  onRowInsert={(row) => …}      // append a row the renderer minted (row.id included)
  onRowDelete={(rowIds) => …}
  onRowReorder={(rowIds) => …}  // full row-id order; only emitted with no filter / row limit
  resolveNodeTitle={(nodeId) => useDataStore.getState().nodes.get(nodeId)?.title}
/>
```

When `views` is empty, `DataViewRoot` synthesizes one default view (table, for
both hosts) with the deterministic id `dv_default_<nodeId>` and reports it
through `onViewsChange` once per mount, so the host can persist it.

`resolveNodeTitle` exists so `relation` cells can show node titles without this
package depending on `@workspace/store`; the database host supplies it lazily
via `getState()` (a store selector would re-render the node on every unrelated
node change).

## HOW TO ADD / IMPLEMENT A VIEW

1. Replace the body of `src/views/<name>/<name>-data-view.tsx` with the real
   renderer, keeping the `DataViewRendererProps<XViewConfig>` signature.
   **`views/table/` is the reference implementation** — copy its split (schema /
   editors / theme / toolbar / lifecycle shell) rather than growing one file.
2. Do the same for `config-editor.tsx` (`DataViewConfigEditorProps<XViewConfig>`).
3. Add the view's library to `package.json` **as a dynamic import only**; do not
   import it from `registry.ts` or `index.ts`. Top-level imports inside
   `views/<name>/*` are fine — those modules are already behind `React.lazy`.
4. If the view needs a different default config, edit `createDefaultConfig` in
   `src/defaults.ts`.
5. Filling in the config schema itself means editing
   `packages/interfaces/src/models/data-view.ts` first (the persisted shape).

## COMMANDS

```bash
pnpm --filter=@workspace/dataview typecheck   # tsc --noemit
pnpm --filter=@workspace/dataview lint        # eslint (clean today)
pnpm --filter=@workspace/dataview format      # prettier
```

No `build` / `dev` / `test` scripts. Consumers receive `.ts` source via
`exports`.

## GOTCHAS

- **Views are persisted.** `content.views` round-trips through the domain value
  objects, the `nodes.views` JSON column, the DTO mapper and the tRPC schemas —
  see the root `AGENTS.md` § *dataview → Persistence (views)* before touching any
  of them. Inside the domain, only `CollectionContent.withViews` /
  `withFilter` and `DatabaseNode`'s private `rebuildContent` may rebuild content;
  a bare `new DatabaseContent(fields, rows)` defaults `views` to `[]` and
  silently drops them.
- **`resolveCollectionNodeIds` is a UNION**, not an intersection: a collection's
  `selectedNodes` and its `ruleGroup` combine exactly like a graph view's
  (`inEnumeration || matchesRule`), because the whole resolution is delegated to
  the canonical `filterByViewFilterConfig`. Rows come back in store order, and a
  rule on a field the evaluator does not know matches everything.
- **`@workspace/ui` ↔ `@workspace/dataview` is a circular package dependency**
  (ui mounts `DataViewRoot`, dataview uses ui primitives). This mirrors the
  existing `ui ↔ editor` cycle; keep new imports one-directional where possible.
- Consumers must add the package to their `transpilePackages` / tsconfig paths —
  `apps/web` and `packages/ui` already do.
- `collectionToDataViewSource` needs `nodes` + (optionally) `nodeSemantics` /
  `nodeTags` maps so select options can show names; without them, option values
  fall back to raw ids.
- **VTable traps the table view already works around** (all verified in a real
  browser, see `docs/dataview/table.md` §10):
  - `heightMode: 'adaptive'` re-computes row heights to fill the container, which
    stretches four rows across a whole pane. The table uses `'standard'` so the
    density setting is respected; it still fills the pane once content exceeds it.
  - VTable only triggers its built-in sort from the header **sort icon**, so the
    view also wires the column context menu (`dropdown_menu_click`).
  - A row drag started from the row-number handle reports
    `movingColumnOrRow === undefined`; identify it with
    `table.isSeriesNumber(source.col, source.row)` — and note that
    `isSeriesNumber` returns `false` unless **both** col and row are passed.
  - VTable keeps a 1×1 transparent `input.table-focus-control` in the container;
    do not mistake it for an open cell editor.
  - `getCellIcons()` returning an icon does not mean it is clickable where you
    think: the row drag handle only occupies the left ~18px of the row-number cell.
- **Tailwind does not scan this package by default.** Its classes reach the app
  through a symlink in a consumer's `node_modules`, which Tailwind's automatic
  content detection skips, so a class used *only* here is silently absent from
  the stylesheet (symptom: correct markup, bizarre layout — e.g. a `w-[4.5rem]`
  input that renders `w-full` and squeezes the field name to 0px). The fix lives
  in `packages/ui/src/styles/globals.css`, which carries an explicit
  `@source "../../../dataview/src/**/*.{ts,tsx}"`. When you add a new view
  package, add its source there too — and never widen that glob to `apps/**`
  (it drags in `.next` and stalls the dev-server compile).
- **Canvas fonts need a real family list.** `fontFamily: "inherit"` is not valid
  in a canvas font shorthand, so VTable silently keeps the previous font; the
  tokens carry `"inherit"` as a sentinel and `buildTableTheme` resolves it through
  `resolveCanvasFontFamily()` (`shared/theme-tokens.ts`), which reads the computed
  stack off `<body>` (that is how `next/font`'s family reaches the canvas).
- Test infrastructure: **none**, consistent with the rest of the monorepo. The
  table view was verified by driving a temporary `apps/web` page with headless
  Chromium over CDP (`ListTable` exposes itself as `canvas.__vtable__`), not by
  an in-repo test suite.
