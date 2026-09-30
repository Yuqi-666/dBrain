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

**Current status: shell + the table and kanban views.** `<DataViewRoot />` (view
tab strip, routing, view CRUD), the source adapters, the cell resolver, **the
`table` view** (VTable `ListTable`: rendering, editing, sorting, filtering,
grouping, search, export, row CRUD/reorder, **field CRUD with column groups,
conditional colouring, and 单选/多选 capsule cells whose options are picked from
an anchored dropdown**) and **the `kanban` view** (vendored ReUI board on
`@dnd-kit`: lanes from a 单选/多选 field, cross-lane drag write-back, lane
reorder/rename/collapse, new-card and card menu, four toolbar panels) are
implemented. The other **five view renderers and config editors are still
placeholders** that render `<DataViewPlaceholder>` /
`<DataViewConfigPlaceholder>`, and their libraries (FullCalendar, VChart,
@workspace/graph) are not dependencies yet — each view pulls its library only
when it is implemented. The kanban's own deps (`@dnd-kit/core` +
`@dnd-kit/sortable` + `@dnd-kit/utilities`, plus `radix-ui` for the vendored
`Slot`) are installed.

**There is no side config panel.** The design change in
`docs/propmt/dataview-table-1.md` moved view configuration into each view's own
toolbar as buttons + dropdown menus, **config left / functions right**; a later
change moved the shell's view actions (更多: 设为默认 / 复制 / 删除视图) into that
same function group, so the tab strip above is pure navigation. Every renderer
draws a `ViewToolbar`, which appends the 更多 slot automatically. `ViewConfigMenu` (the generic "视图配置" popover
over the registry's lazy `configEditor`) **is not used by the table** — all seven
of its controls have dedicated menus — and only remains for views that have no
dedicated menu yet; a descriptor may therefore omit `configEditor` entirely.

## STRUCTURE

```
src/
├── index.ts                     # Public API — the only sanctioned entry point
├── data-view-root.tsx           # <DataViewRoot /> shell (tab strip + router)
├── registry.ts                  # DATA_VIEW_REGISTRY: type → descriptor (lazy renderer/configEditor)
├── defaults.ts                  # createDefaultConfig / createDefaultDataView / seedDataViewId
├── toolbar/
│   ├── data-view-toolbar.tsx    # view tab strip + "new view" menu (navigation only)
│   ├── view-actions.tsx         # 更多 (default/duplicate/delete view) + slot context
│   └── view-switcher.tsx        # tab strip, inline rename (double-click), "new view" menu
├── source/
│   ├── types.ts                 # re-exports the persisted model + renderer props contract
│   ├── database-source.ts       # DatabaseContent → DataViewSource
│   ├── collection-source.ts     # node projection → DataViewSource (fixed __schema)
│   ├── cell-resolver.ts         # DatabaseCell → text/scalar/date/number/color/node ids
│   ├── row-utils.ts             # createDataRowId / emptyCellForField / createEmptyDataRow
│   └── field-utils.ts           # primary/date/number/select field pickers
├── shared/
│   ├── view-toolbar.tsx         # ViewToolbar strip + ViewConfigMenu popover (config-in-toolbar)
│   ├── field-meta.tsx           # field-type labels/icons, option + fill palettes, field search
│   ├── data-view-placeholder.tsx        # placeholder body the five unimplemented views render
│   ├── data-view-config-placeholder.tsx # placeholder body their config editors render
│   ├── empty-state.tsx
│   ├── theme-tokens.ts          # literal light/dark tokens for canvas libraries
│   ├── use-row-filter.ts
│   └── use-row-selection.ts
└── views/
    ├── table/       table-data-view.tsx        # the shell — the only entry `registry.ts` imports
    │                ├── core/     schema.ts + column-ops.ts + filter.ts + editors.ts
    │                ├── canvas/   theme.ts + pill.ts
    │                ├── toolbar/  toolbar.tsx + search-bar.tsx
    │                ├── menus/    field-menu.tsx + filter-menu.tsx + condition-menu.tsx
    │                │              + condition-controls.tsx + color-menu.tsx + select-menu.tsx
    │                └── fields/   picker.tsx + editor.tsx
    ├── kanban/      kanban-data-view.tsx + reui/kanban.tsx     (implemented — see below)
    │                ├── core/     board.ts + config.ts
    │                ├── board/    kanban-board.tsx + kanban-card.tsx + lane-option-editor.tsx
    │                ├── fields/   field-select.tsx
    │                └── toolbar/  kanban-toolbar.tsx
    ├── calendar/    calendar-data-view.tsx + config-editor.tsx  (placeholder)
    ├── gantt/       gantt-data-view.tsx + config-editor.tsx     (placeholder)
    ├── gallery/     gallery-data-view.tsx + config-editor.tsx   (placeholder)
    ├── chart/       chart-data-view.tsx + config-editor.tsx     (placeholder)
    └── node-graph/  node-graph-data-view.tsx + config-editor.tsx   (no hyphens in the type: `nodeGraph`)
```

### table view internals (the reference implementation)

| Group   | File                           | Responsibility                                                                                                                                                                                                                                         |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| —       | `table-data-view.tsx`          | the imperative `ListTable` lifecycle and every event→callback mapping; its view root and canvas container are `overflow-hidden` (see the canvas-clipping gotcha). The only file `registry.ts` imports                                                  |
| core    | `core/schema.ts`               | `fields`→columns (self-healing, grouped), `rows`→records (`__rowId`), edited value→`DatabaseCell`, colour lookups, field reconcile                                                                                                                     |
| core    | `core/column-ops.ts`           | pure 字段配置 operations: reorder, group/ungroup, show/hide, add/remove field                                                                                                                                                                          |
| core    | `core/filter.ts`               | runtime shape + evaluation of `config.filterState` (condition list + legacy reader)                                                                                                                                                                    |
| core    | `core/editors.ts`              | VTable editors for the two edit-in-place types: input (text/number/url) and date. 单选/多选 have **no** editor — `createTableEditor` returns `undefined` so a double-click does not open a text box                                                    |
| canvas  | `canvas/theme.ts`              | `DataViewThemeTokens` → VTable `ITableThemeDefine`                                                                                                                                                                                                     |
| canvas  | `canvas/pill.ts`               | 单选/多选 capsules: canvas text metrics, capsule layout, `contrastTextColor`, and the active cell's clickable "×" / chevron `icon` elements (`PILL_REMOVE_ICON_PREFIX`, `PILL_OPEN_ICON`)                                                              |
| toolbar | `toolbar/toolbar.tsx`          | the view toolbar: config left, functions right (fixed-size, always-present controls only)                                                                                                                                                              |
| toolbar | `toolbar/search-bar.tsx`       | the search row that appears under the toolbar while 搜索 is engaged; owns Esc for its own row (see the capture-phase gotcha)                                                                                                                           |
| menus   | `menus/field-menu.tsx`         | 字段配置 dropdown: search, list, collapsible group blocks, drag, visibility, per-field menu (opens right), 新增字段; 编辑字段 swaps the same menu body to the editor; 创建编组/重命名编组 expand an inline naming form and take over the caret handoff |
| menus   | `menus/filter-menu.tsx`        | 筛选 dropdown: condition rows                                                                                                                                                                                                                          |
| menus   | `menus/condition-menu.tsx`     | 分组 + 排序 dropdowns (field + direction, multi-level)                                                                                                                                                                                                 |
| menus   | `menus/color-menu.tsx`         | 填色 dropdown: colour + target (cell/row/column) + condition                                                                                                                                                                                           |
| menus   | `menus/select-menu.tsx`        | the 单选/多选 option dropdown: 查找或创建选项 search + capsule rows + 创建 row; 单选 closes on a pick, 多选 stays open                                                                                                                                 |
| menus   | `menus/condition-controls.tsx` | shared condition controls: type-aware value input, order toggle                                                                                                                                                                                        |
| fields  | `fields/picker.tsx`            | searchable field dropdown shared by 筛选/分组/排序/填色                                                                                                                                                                                                |
| fields  | `fields/editor.tsx`            | the 标题 / 字段类型 / 选项内容 / 默认值 form, plus `FieldEditorMenuContent` — the form as a `DropdownMenuContent` body (no rect maths)                                                                                                                 |
| —       | —                              | the table has **no** `config-editor.tsx`: its configuration is its toolbar                                                                                                                                                                             |

**The grouping is a dependency order, not a label.** `core/*` and `canvas/*` import
no React (only VTable _types_) and are pure functions/data; `canvas/*` may reach
into `shared/field-meta.tsx` for the palettes; `menus/*` and `fields/*` may import
`core/*` + `canvas/*`; `toolbar/*` wires the menus; **nothing inside the folder
imports `table-data-view.tsx`** — the shell only assembles. Keep it that way: a
`core/*` file that starts importing a `.tsx` component has broken the layer.

### kanban view internals

| Group   | File                           | Responsibility                                                                                                                                                                                                    |
| ------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —       | `kanban-data-view.tsx`         | the shell: board state (re-seeded from the source during render), the write path (lane change → `onCellChange`), host-capability gates, and the missing-group-field guidance. The only file `registry.ts` imports |
| vendor  | `reui/kanban.tsx`              | the vendored ReUI board primitives (`Kanban` / `KanbanBoard` / `KanbanColumn` / `KanbanColumnHandle` / `KanbanColumnContent` / `KanbanItem` / `KanbanItemHandle` / `KanbanOverlay`). Keep it close to upstream    |
| core    | `core/board.ts`                | `buildKanbanBoard` (rows + group field → lanes/cards), `moveCardToLane`, `findCardByKey`, `cardKey`, `countCards`. No React                                                                                       |
| core    | `core/config.ts`               | config self-healing (`resolveGroupField` / `resolveTitleField` / `resolveCardFields`), `orderLaneOptions`, `optionColor`, `cellForLane`, `patchFieldOption`. No React                                             |
| board   | `board/kanban-board.tsx`       | `<Kanban>` root + lane strip + overlay; maps REUI's `onValueCommit` onto "cross-lane = write, same-lane = local order, column = `laneOrder`"                                                                      |
| board   | `board/kanban-card.tsx`        | the card body (title + chips + meta rows) and the card menu (打开 / 移动到). Also what the drag overlay renders                                                                                                   |
| board   | `board/lane-option-editor.tsx` | 编辑选项: rename + recolour one option (mounted per popover open, so its draft state re-seeds)                                                                                                                    |
| fields  | `fields/field-select.tsx`      | the field picker: one shadcn `Select` over a field list (all three pickers live inside a popover, so a plain Select beats popover+Command here)                                                                   |
| toolbar | `toolbar/kanban-toolbar.tsx`   | 分组 / 卡片 / 排序 / 显示 panels on the left (via `ViewToolbar`), lane/card count on the right                                                                                                                    |
| —       | —                              | no `config-editor.tsx`: the four panels cover every `KanbanViewConfig` key, so the descriptor omits `configEditor`                                                                                                |

Layering matches the table's: `core/*` is pure, `board/*` composes REUI + shadcn,
`toolbar/*` only reads config and reports `onConfigChange`, and **nothing imports
`kanban-data-view.tsx`**.

### UI conventions (applies to every view)

**Config lives in the view toolbar, not a side panel.** A renderer draws one
`ViewToolbar` strip with **configuration on the left and functions on the
right**; every control is a button or a dropdown menu. Do not add a side panel
back, and do not add a generic "视图配置" catch-all to a view whose settings all
have dedicated menus (the table's and the kanban's did, so both views' buttons
and their registry `configEditor` entries are gone).

A view whose settings are a **form** (a `Select`, a checkbox list, switches)
takes a `Popover` panel; a list of **commands** takes a `DropdownMenu`. The
kanban's 分组/卡片/排序/显示 panels are popovers for exactly that reason — a
menu's roving focus is the wrong tool for a body full of inputs.

The chrome is built from `@workspace/ui` shadcn primitives only — no hand-rolled
`<select>` / `<input type="checkbox">` / bare floating panels:

| Need                                            | Use                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| Dropdown / picker                               | `select` (`Select`, `SelectTrigger`, `SelectItem`)               |
| Searchable field list                           | `popover` + `command` (cmdk)                                     |
| Boolean setting row                             | `switch`; column-visibility style multi-select                   | `checkbox` |
| 2–4 mutually exclusive options (sort direction) | `toggle` / `toggle-group`                                        |
| Counts and status chips                         | `badge`                                                          |
| Search field with inner actions                 | `input-group` (`InputGroupAddon` / `InputGroupButton`)           |
| Floating panel, menu, tooltip, scroller         | `popover`, `dropdown-menu` (incl. sub), `tooltip`, `scroll-area` |
| Split between control groups                    | `separator` (vertical, `h-4 self-center`)                        |

Layout rules to keep:

- one control row per strip: strip `min-h-9`, every control `h-7`, icon buttons
  `size-7`; gaps 4px inside a group, 6–8px between groups;
- **the strip never wraps as a whole.** The outer row is nowrap `items-start`; the
  configuration group is `flex-1 min-w-0 flex-wrap` (it reflows _inside itself_)
  and the function group is `h-7 shrink-0` pinned to the right. Wrapping the
  outer row made the right-hand buttons flip between line 1 and line 2 near the
  threshold — they visibly jumped while the window was resized, or whenever a
  button appeared on that side (删除选中). See `docs/dataview/table.md` §5.3.1;
- **every function-group control is fixed-size and always present.** The group is
  right-anchored, and in a flex row an item's x depends only on its own width and
  the widths of the items _after_ it — so a control that appears/disappears or
  resizes on re-render shoves itself and its left-hand neighbours around. That is
  what used to happen on every keystroke (the search field's addon + match
  counter) and on every selection change (删除 N 行). Variable-width readouts go
  at the **left end** of the group (the row/column count), input-like controls get
  their own row (the table's search bar), and a destructive action that depends on
  state belongs in a context menu instead of the toolbar;
- **the shell's view actions (更多) render inside the view toolbar's function
  group, not in the tab strip.** `DataViewRoot` publishes the menu through the
  `toolbar/view-actions.tsx` slot context; `ViewToolbar` appends it automatically
  and a view with its own toolbar (the table) calls `useViewActions()` and puts it
  last. A view that renders no toolbar simply has no 更多;
- **the shell's renderer box is fixed-size and never scrolls.** `DataViewRoot`
  gives each renderer an `overflow-hidden` box of exactly the space left under the
  tab strip, and **the renderer owns its own scrolling** (the table scrolls its
  VTable canvas, `DataViewPlaceholder` carries its own inner `overflow-auto`). A
  renderer that spills past its box would otherwise make that box show a
  scrollbar, which steals space from the renderer itself and feeds back into it —
  the 10px width/height flicker documented in the gotchas;
- **`--primary` is spent only on state the user has engaged** (active filter or
  grouping chip, checked switch/checkbox, selection border, focused input).
  Navigation (view tabs) is neutral: the active tab is the raised one in a
  recessed `bg-muted/60` track, never tinted;
- **a 单选/多选 cell is a two-step gesture, and its whole editing surface is the
  option dropdown** (`menus/select-menu.tsx`): the first click activates the cell
  (each capsule grows an "×", the cell grows a chevron), the second click — or the
  chevron — opens `查找或创建选项` under the cell. 单选 closes on a pick, 多选
  stays open (caret back in the search box) because that is the only way to
  assemble a set; typing a name the field does not have offers a 创建 row. These
  cells deliberately register **no** VTable editor, and the activated cell is
  kept in a ref (not state) so repainting it does not re-render the toolbar;
- labels are 12px sentence case, hints 11px `text-muted-foreground`; numbers use
  `tabular-nums`; no ALL-CAPS tracked eyebrows;
- an empty state is an invitation (muted panel + what to do), not a mood.

## WHERE TO LOOK

| Task                                    | Location                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Change the shell / routing              | `src/data-view-root.tsx`                                                                  |
| Add or re-label a view type             | `src/registry.ts` + `src/defaults.ts`                                                     |
| Tweak default configs                   | `src/defaults.ts`                                                                         |
| Change how database rows are read       | `src/source/database-source.ts`                                                           |
| Change the collection projection schema | `src/source/collection-source.ts` (`COLLECTION_FIELD_IDS`)                                |
| Cell → text/color/date/number           | `src/source/cell-resolver.ts`                                                             |
| Implement a view                        | `src/views/<name>/` (replace the placeholder body)                                        |
| Group rows into lanes / cards           | `src/views/kanban/core/board.ts`                                                          |
| Kanban config self-heal / lane order    | `src/views/kanban/core/config.ts`                                                         |
| Kanban drag write-back                  | `src/views/kanban/board/kanban-board.tsx`                                                 |
| Vendored ReUI board                     | `src/views/kanban/reui/kanban.tsx`                                                        |
| Host integration                        | `packages/ui/src/components/dialog/editor/content/{database,collection}-node-content.tsx` |
| Persisted model                         | `packages/interfaces/src/models/data-view.ts`                                             |

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
   holds for view config the user edits _on the canvas_ (a header sort, a column
   resize): the renderer reports it through `onConfigChange` and `DataViewRoot`
   persists it — a renderer never calls `onViewsChange` itself.
3. **Schema changes use the same rule.** Field add/edit/delete/retype is reported
   as `onFieldsChange(fields, rows?)` — the whole next schema, plus the rows when
   cells had to be rewritten (a deleted field's cells, a retyped or
   default-valued one) _or when adding the field minted the table's first row_
   (an empty table with a schema but no row reads as "the table did not appear").
   The renderer computes rows with `reconcileRowsForFields`; the host persists
   both halves in one upsert.
4. **The host must patch the _freshest_ content, not the render's copy.**
   One gesture can produce two writes (adding a field writes its column config
   _and_ the field), and a patch built from a snapshot taken before the first
   write silently drops it — this is how a field's column config used to be lost.
   `database-node-content.tsx` reads the node back from the store
   (`patchContent`), which works because `NodeService.upsert` updates the store
   optimistically and synchronously.
   **The host must also serialise its writes for one node.** PocketBase's SDK
   cancels a pending request when another one for the same `requestKey` starts
   (our repositories key by record id), so two overlapping `node.update`s abort
   the first one — the store rolls back and the new row flashes and vanishes with
   `TRPCClientError: The request was aborted (most likely autocancelled…)`.
   `database-node-content.tsx` queues patches and drains them one write at a
   time on a microtask, which also merges a gesture's two patches into a single
   upsert. The server-side client additionally runs with
   `autoCancellation(false)` (backend `PocketBaseClient`) because one instance is
   shared by every concurrent API request.
5. **`readOnly` means "the data is read-only"** (collection projections), _not_
   "views cannot be managed". View management is enabled by the host passing
   `onViewsChange`; `onConfigChange` is only handed to a renderer when it is, and
   field CRUD additionally needs `onFieldsChange` (so a read-only collection
   offers no 新增字段 and no trailing "+" column, while still allowing column
   hide/reorder/group/sort/filter/colour).
6. **The registry is the only dispatch table.** `DataViewRoot`, the toolbar and
   the config menus never `switch` on `DataViewType`.
7. **`nodeTypes` enforces the capability matrix** (`README.md` §7): `nodeGraph`
   is collection-only; everything else works on both hosts. A persisted view
   whose type is not allowed for the current host is dropped on mount.
8. **Lazy loading is intentional.** `registry.ts` wraps every renderer/config
   editor in `React.lazy`; `DataViewRoot` provides the `<Suspense>` boundaries.
   Keep new view deps out of the package's static import graph — the table view
   imports `@visactor/vtable*` at the top of its own `views/table/*` modules,
   which is fine precisely because those modules are only reachable lazily.
9. **`node-graph/` is the only hyphenated directory**; the type literal is
   `nodeGraph`.

## HOST CONTRACT

```tsx
<DataViewRoot
  key={node.id}                 // host MUST remount per node: internal view state seeds once
  source={source}               // built by an adapter, never by hand
  views={content.views}         // optional; seeds a default view when empty
  readOnly={isCollection}       // data read-only
  onViewsChange={(views) => patchContent({ views })}   // presence enables view CRUD
  // every callback patches the LIVE node, never the render's `content` — see 4
  onCellChange={(rowId, fieldId, cell) => …}
  onOpenNode={(nodeId) => useUIStore.getState().handleNodeEdit(nodeId)}
  // —— optional, table view (database hosts) ——
  onRowInsert={(row) => …}      // append a row the renderer minted (row.id included)
  onRowDelete={(rowIds) => …}
  onRowReorder={(rowIds) => …}  // full row-id order; only emitted with no active filter
  onFieldsChange={(fields, rows) => …}  // schema write; rows present when cells changed too
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
   **`views/table/` is the reference implementation** for a _canvas_ view — copy
   its split (`core/` pure logic, `canvas/` theme + custom render, `toolbar/`,
   `menus/`, `fields/`, and the lifecycle shell at the view root) rather than
   growing one file; the layering rule in § _table view internals_ applies to
   every view. **`views/kanban/` is the reference for a DOM view** whose library
   is external source: vendor it under `reui/` unchanged, keep the data model in
   `core/`, compose the library + shadcn in `board/`, and let the shell own the
   state + write path.
2. Only if the view has settings without a dedicated toolbar menu: add
   `config-editor.tsx` (`DataViewConfigEditorProps<XViewConfig>`) and register it
   as `configEditor`. A view whose toolbar covers everything (the table, the
   kanban) leaves the descriptor's `configEditor` undefined and gets no 视图配置
   button.
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
  see the root `AGENTS.md` § _dataview → Persistence (views)_ before touching any
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
- **A canvas renderer must clip its own box, and the shell's renderer box must
  not scroll.** VTable writes its own size back onto the `.vtable` element it
  creates — `style.width = parentElement.offsetWidth`, i.e. the **rounded**
  parent size — so with a fractional parent (browser zoom, HiDPI, an `80vh`
  dialog) the child is up to a pixel larger than the box it lives in. While the
  shell's renderer box (`data-view-root.tsx`) was `overflow: auto`, that hairline
  spill made it show **both** scrollbars at once; each one is 10px in a
  `deviceScaleFactor: 2` window, so the renderer lost 10px of width _and_ height,
  the table's toolbar re-wrapped at the narrower width, the container height
  changed, the spill changed — and the table's inline size flickered between two
  values 10px apart, forever (measured: `784×589 ↔ 774×579`, 2.5s of 50ms
  samples, before; a single state after). The renderer box is `overflow-hidden`
  now — **each renderer owns its scrolling** (the table's VTable canvas scrolls
  itself, the placeholders carry their own inner `overflow-auto`) — and the table
  additionally clips its view root and its canvas container, so it cannot move
  its own box even inside a host that scrolls. Do not put `overflow-auto` back on
  that box, and clip any new canvas-based renderer the same way. VTable's HTML
  context menu and in-cell editors are unaffected: VTable confines them to the
  table's box (`confine: true`), verified in the browser.
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
  - **A grouped column has a multi-row header**, so "which field is this visual
    column" must be resolved from the _deepest_ header row upwards
    (`headerFieldIdAt`, using `table.columnHeaderLevelCount`) — reading level 0
    only returns the group define, and column drag/resize write-back silently
    loses grouped columns.
  - **The trailing "+" column is synthetic** (`TABLE_ADD_FIELD_COLUMN_ID`, a
    44px header-only define whose bare "+" glyph is drawn with
    `headerCustomRender`). It must stay out of `resolveTableColumns`,
    `readColumnLayout` (guarded by the `known` set), the row-order probe and
    export (`formatExportOutput` blanks it) — and its header click
    (`cellLocation === "columnHeader"`) is what opens the 新增字段 dropdown,
    anchored to the glyph's square (`ADD_FIELD_BUTTON_SIZE`, centred in a cell
    that `autoFillWidth` stretches to the table's right edge). The glyph is
    **text only** — no chip, no fill, no stroke: the header band is already
    `muted`, so a bordered/filled chip was a second surface floating on it, and
    `headerStyle.cursor` plus the whole-cell hit area are what make it read as a
    control.
  - **A canvas-anchored floating panel needs a viewport rect and a trigger that
    outlives the close.** Both panels (`menus/select-menu.tsx`, and
    `menus/field-menu.tsx`'s 新增字段) hang off a portalled invisible
    `position: fixed` span, because a canvas cell has no DOM node to trigger
    from (every other entry point is a real button). Two rules, each of which
    was a user-visible bug:
    - take the rect from `getCellRelativeRect` (viewport), **never**
      `getCellRect` (the table's own unscrolled space) — the entry points are
      exactly the cells you had to scroll to (the "+" column lives off the right
      edge until you scroll there), so the anchor landed a whole `scrollLeft`
      away and Radix's collision padding parked the panel at the window edge
      instead of under the button (measured: `scrollLeft = 436` → the glyph at
      x ≈ 890, the anchor claiming 1317);
    - keep the **last** rect in a ref and render the trigger whenever an anchor
      is known, not only while the request is live — Radix holds the content
      mounted through `data-closed:animate-out`, and a trigger that unmounted in
      the same commit left floating-ui measuring a detached node (all zeros), so
      the panel flashed in the page's top-left corner (`0,0` / `0,4`) for the
      ~130 ms fade before vanishing. The leftover span is empty and
      `aria-hidden`; its coordinates go stale once the table scrolls, but the
      panel is already closed by then.
  - **单选/多选 capsules are canvas-drawn** (`canvas/pill.ts` + `customRender`)
    and get their colours from raw option **ids** stored beside the display names
    under `optionIdsKey(field.id)` — the record value is the option _name_
    (that is what search matches), so the id cannot be recovered from it
    reliably. There is no measurement hook inside `customRender`, so the capsule
    sizes itself with an offscreen 2D context whose font must come from
    `resolveCanvasFontFamily(tokens)`.
  - **A canvas cell's little buttons must be VTable `icon` elements, not
    coordinate maths.** `customRender` emitting
    `{type:"icon", svg, name, clickable:true}` makes VTable create a pickable
    graphic with `role: "icon-custom"`, and a tap on it fires the table's
    `icon_click` carrying that `name` (measured: the active capsule cell's
    `dv_pill_remove:<optionId>` / `dv_pill_open` both arrive). The tap also fires
    `click_cell` **first**, with `args.targetIcon` already populated — a
    `click_cell` handler that ignores `targetIcon` is what keeps "delete this
    option" from also opening the dropdown. The `svg` is a colour-baked string
    (icons do not inherit `fill`), so each colour gets its own cached SVG and any
    persisted option colour goes through `sanitizeSvgColor` first.
  - **`scroll` is fired for VTable's own bookkeeping too.** The `setRecords`
    after a write re-stamps the same scroll position and emits ten `scroll`
    events with `dx/dy = 0` and `args.event === undefined`; only a real gesture
    (wheel / scrollbar drag) carries `args.event`. Closing the option dropdown on
    every `scroll` made the 多选 panel disappear after each pick, so close it on
    `args.event` only — Radix cannot follow a scroll that happens inside the
    canvas anyway.
  - **"Create this option" is two writes and the order is load-bearing.** It
    changes the field's `options` _and_ the cell; the host merges the patches of
    one gesture into a single upsert where the **later** `rows` patch wins, so
    `onFieldsChange(fields)` must go first and `onCellChange(...)` second —
    `DatabaseContent` rejects a cell referencing an option its field does not
    declare, which is exactly the intermediate state the other order creates.
  - **A conditional fill needs a contrasting text colour.** A `填色` rule sets
    only `bgColor`, while the text colour comes from the theme; a pale palette
    swatch under light-on-dark text is unreadable, so the style callback pairs
    the fill with `contrastTextColor(fill)` (now in `canvas/pill.ts`).
- **The 字段编辑 form lives inside a `DropdownMenuContent`** (`FieldEditorMenuContent`).
  Radix's menu focuses its own content on open and re-focuses it when the pointer
  leaves an item — which is exactly what happens when 编辑字段 swaps the item list
  for the form — so the form's own `autoFocus` is not enough: pass
  `onOpenAutoFocus` to keep the caret in the 标题 input (that prop is honoured by
  Radix but _stripped from the public `DropdownMenuContent` type_ —
  `MenuRootContentTypeProps` omits the private props — hence the `KEEP_FORM_FOCUS`
  spread). Radix only intercepts arrow keys while the content node itself is
  focused, and its typeahead only searches the menu's own `[role=menuitem]`
  children, of which a form body has none, so typing / Tab / caret keys behave
  normally and nested `Select` / colour `Popover` layers work inside the menu.
- **A menu item that hands the panel over to an inline form must own the caret
  handoff.** 创建编组 / 重命名编组 do not open a second floating panel: they expand
  a 编组名称 input inside the already-open 字段配置 popover, so two Radix
  behaviours fight it — (a) on close Radix restores focus to the menu's trigger
  in a `setTimeout(…, 0)`, and after 创建编组 that trigger has been re-parented
  into the new group; (b) while the content animates out it is **still mounted
  with a focus trap**, so the form's own `autoFocus` gets yanked back to the menu
  item (measured: focus sat on the "…" item for ~300 ms and then fell to `<body>`
  when the menu unmounted). The fix is a ref flag set by the item plus an
  `onCloseAutoFocus` on every such menu (`handleMenuCloseAutoFocus`) that
  `preventDefault()`s **and explicitly focuses the input** — the unmount cleanup
  is the first tick at which the trap is gone. Two corollaries: a menu's
  `onOpenChange` must not clear the pending inline form when it _closes_ (a close
  is the tail of a handoff — clearing it there is why 创建编组 used to create the
  group and then never show the input, and why 删除字段's confirm row never
  appeared); and because Radix handles Escape with a **capture** listener on
  `document`, "Esc cancels the naming but keeps the panel" can only be expressed
  in `PopoverContent`'s `onEscapeKeyDown`.
- **Esc inside the search bar must not reach the node-editor `Dialog`.** Radix
  dismisses a layer from a `keydown` listener on `document` in the **capture**
  phase, registered when the dialog mounted — long before the search row exists —
  so a handler on the input cannot keep the key local: React's listeners sit on
  the root container, below `document` in the capture path (measured: Esc in the
  search box closed the whole node editor). `TableSearchBar` therefore owns Esc
  from a `window` **capture** listener — the only earlier stop on the path — and
  only vetoes keys whose target is inside its own row, so the dialog (a second
  Esc closes it) and any menu above the dialog keep their own Escape behaviour.
  Three paths close the row, because the key is not always ours to receive: the
  `window` listener (keydown **and** keyup, matching `key` or `code`), the
  input's own React handler as a fallback, and a **blur with no destination**.
  The last one is not decoration — a keyboard-driven browser extension in
  "insert mode" (Vimium and friends), some IMEs and some hosts consume Escape
  _while a text field has focus_, so the page never sees a key at all and only
  observes the caret being dropped: `focusout` with `relatedTarget === null` and
  no `pointerdown` behind it. That shape is the Esc signature; a click always
  leaves a destination (the canvas, the rows' focus control, a button), so
  clicking around the table still keeps the search open.
- **Selection is not React state.** The table no longer subscribes to
  `selected_cell` / `selected_changed` to keep a count in state (the toolbar has no
  selection-driven control any more); row deletion reads
  `table.getSelectedCellRanges()` on demand from the cell context menu. Adding a
  `useState` back into that path re-renders the whole toolbar on every event of a
  drag — and that is what made the function group visibly jitter.
- **`config.filterState` round-trips through `readFilterState`, so an empty
  `fieldId: ""` is load-bearing**: it is the row 添加条件 just created. Treating it
  as "not a usable condition" (the old `!resolvedFieldId` check) dropped the row on
  the very next read, so clicking 添加条件 looked like it did nothing. Only a
  _missing_ field id (a legacy record keyed by field) is unusable;
  `sanitizeFilterState` still drops a row whose field was deleted.
- **Tailwind does not scan this package by default.** Its classes reach the app
  through a symlink in a consumer's `node_modules`, which Tailwind's automatic
  content detection skips, so a class used _only_ here is silently absent from
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
- **The kanban is a vendored board over `@dnd-kit`, and four of its rules are
  load-bearing** (all verified in a real browser; see `docs/dataview/kanban.md`
  §0):
  - **Item ids are `laneId + "::" + rowId`.** ReUI requires item ids that are
    unique across _all_ columns and distinct from column ids; a `multiSelect`
    grouping legitimately puts one row in several lanes. Never recover the row id
    by parsing the key — read it off the card (`findCardByKey`).
  - **The drag activator is the handle, not the item.** `KanbanItem` carries the
    ARIA attributes, `KanbanItemHandle` carries the pointer/keyboard listeners.
    "Not draggable" therefore means **rendering no handle**, not `disabled`:
    ReUI greys a disabled item out (`disabled && "opacity-50"`), and a read-only
    collection board should not look broken. The card's "…" menu is a _sibling_
    of the handle (absolutely positioned over the card) so a press on it never
    starts a drag — dnd-kit v6's pointer sensor does not exclude nested buttons.
  - **`DndContext` needs a stable `id`.** dnd-kit builds the id behind
    `aria-describedby` from a module-level counter unless the context is given
    one, and a counter differs between the server render and hydration: React
    keeps the server's `aria-describedby` and logs a mismatch, so the drag
    instructions point at an id that does not exist. The board passes React's
    `useId()`; that is the one behavioural change to the vendored source.
  - **`onValueCommit` is how a drop is classified.** In ReUI's default mode
    `dragOver` already moved the card in the value, so only the commit's
    `activeContainer` / `overContainer` say whether this was a cross-lane write, a
    lane-internal reorder (kept in local state — nothing persists it), or a
    column reorder (`laneOrder`). `restoreOnCancel` is on, so Escape undoes the
    preview instead of committing it.
- Test infrastructure: **none**, consistent with the rest of the monorepo. The
  table view was verified by driving a temporary `apps/web` page with headless
  Chromium over CDP (`ListTable` exposes itself as `canvas.__vtable__`), and the
  kanban the same way (drag, menu move, new card, lane rename/reorder/collapse,
  the four panels, read-only and both guidance states, plus a switch back to the
  table) — not by an in-repo test suite.
