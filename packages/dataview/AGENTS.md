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

**Current status: shell only.** `<DataViewRoot />` (toolbar, routing, config
panel, view CRUD), the source adapters and the cell resolver are implemented;
**all seven view renderers and config editors are placeholders** that render
`<DataViewPlaceholder>` / `<DataViewConfigPlaceholder>`. No third-party view
library (VTable, FullCalendar, VChart, dnd-kit, @workspace/graph) is a
dependency yet — each view pulls its library only when it is implemented.

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
│   ├── data-view-placeholder.tsx        # placeholder body every view renders today
│   ├── data-view-config-placeholder.tsx # placeholder body every config editor renders today
│   ├── empty-state.tsx
│   ├── theme-tokens.ts          # literal light/dark tokens for canvas libraries
│   ├── use-row-filter.ts
│   └── use-row-selection.ts
└── views/
    ├── table/       table-data-view.tsx + config-editor.tsx
    ├── kanban/      kanban-data-view.tsx + config-editor.tsx
    ├── calendar/    calendar-data-view.tsx + config-editor.tsx
    ├── gantt/       gantt-data-view.tsx + config-editor.tsx
    ├── gallery/     gallery-data-view.tsx + config-editor.tsx
    ├── chart/       chart-data-view.tsx + config-editor.tsx
    └── node-graph/  node-graph-data-view.tsx + config-editor.tsx   (no hyphens in the type: `nodeGraph`)
```

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
   node-content decides how to persist (today: `NodeService.upsert`).
3. **`readOnly` means "the data is read-only"** (collection projections), *not*
   "views cannot be managed". View management is enabled by the host passing
   `onViewsChange`.
4. **The registry is the only dispatch table.** `DataViewRoot`, the toolbar and
   the config panel never `switch` on `DataViewType`.
5. **`nodeTypes` enforces the capability matrix** (`README.md` §7): `nodeGraph`
   is collection-only; everything else works on both hosts. A persisted view
   whose type is not allowed for the current host is dropped on mount.
6. **Lazy loading is intentional.** `registry.ts` wraps every renderer/config
   editor in `React.lazy`; `DataViewRoot` provides the `<Suspense>` boundaries.
   Keep new view deps out of the package's static import graph.
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
/>
```

When `views` is empty, `DataViewRoot` synthesizes one default view (table, for
both hosts) with the deterministic id `dv_default_<nodeId>` and reports it
through `onViewsChange` once per mount, so the host can persist it.

## HOW TO ADD / IMPLEMENT A VIEW

1. Replace the body of `src/views/<name>/<name>-data-view.tsx` with the real
   renderer, keeping the `DataViewRendererProps<XViewConfig>` signature.
2. Do the same for `config-editor.tsx` (`DataViewConfigEditorProps<XViewConfig>`).
3. Add the view's library to `package.json` **as a dynamic import only**; do not
   import it from `registry.ts` or `index.ts`.
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
- Test infrastructure: **none**, consistent with the rest of the monorepo.
