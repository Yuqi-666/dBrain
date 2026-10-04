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

**Current status: shell + the table, kanban, calendar, gallery and gantt views +
the unified record surface and the unified card.** Every view opens the same
**record editor** (a column of the host's own box, built on the shared field controls) on
click and the same **record context menu** on right-click; the common items come
from `shared/record-menu.tsx`, a view appends its own. The page is rendered by the
**host node-content** (the shell only reports `onOpenRecord`), the menu by the
shell. Values are rendered by the
shared `shared/field-value.tsx` (单选/多选 → shadcn `Badge`) and edited by
`shared/field-input.tsx` (日期 → the shadcn `Calendar` in a `Popover`). The
kanban and the gallery additionally share **one card** (`shared/card.tsx` +
`shared/card-cover.tsx` + `shared/card-ops.ts`) and **one 卡片配置 menu**
(`shared/card-config.tsx`) over the `DataCardConfig` fragment both persist, so a
record looks and configures the same on a board and on a wall.
`<DataViewRoot />` (view tab strip, routing, view CRUD), the source adapters, the
cell resolver, **the `table` view** (VTable `ListTable`: rendering, editing,
sorting, filtering, grouping, search, export, row CRUD/reorder, **field CRUD with
column groups, conditional colouring, and 单选/多选 capsule cells whose options
are picked from an anchored dropdown**), **the `kanban` view** (vendored ReUI
board on `@dnd-kit`: lanes from a 单选/多选 field, cross-lane drag write-back,
lane reorder/rename/collapse, new-card, three toolbar panels),
**the `calendar` view** (FullCalendar: 月/周/日/列表/多月, field mapping,
drag/resize date write-back, 框选/双击 row creation, hover tooltip, two toolbar
panels — 字段配置 / 视图 — with the presentation fixed by `CALENDAR_FIXED`) and
**the `gallery` view** (a self-built card wall, **redesigned**: 网格/瀑布流/列表,
a card size that owns the minimum tile width — the column count is _measured_ from
the pane, never configured — a real virtual window for 网格/列表 and incremental
paging for 瀑布流, keyboard navigation over a roving tabindex with Shift range
select, the shared record right-click menu, selection with bulk delete, the shared
`DataCard`, and a toolbar of 添加记录 / 卡片配置 / 布局 with nothing on the right
but the shell's 更多) and **the `gantt` view** (VTable-Gantt: a flat record list
with 日/周/月 时间轴, drag/resize date write-back, 今日线/周末/行高, self-built
分组 with folding header rows, a pointer-anchored hover readout, and two toolbar
panels — 字段配置 / 视图)
are implemented. The other **two view renderers and their config editors are
still placeholders** that render `<DataViewPlaceholder>` /
`<DataViewConfigPlaceholder>`, and their libraries (VChart, @workspace/graph)
are not dependencies yet — each view pulls its library only when it is
implemented. The kanban's own deps
(`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, plus `radix-ui`
for the vendored `Slot`) and the calendar's (`@fullcalendar/core|react|daygrid|
timegrid|list|multimonth|interaction`, all `6.1.21`) are installed; **the gallery
added no dependency at all** (the design's optional `react-virtuoso` was not
needed), and the gantt added one (`@visactor/vtable-gantt` `^1.26.8`, the same
version as the table's `@visactor/vtable`, so there is one copy of VTable).

**There is no side config panel.** The design change in
`docs/propmt/dataview-table-1.md` moved view configuration into each view's own
toolbar as buttons + dropdown menus, **config left / functions right**; a later
change moved the shell's view actions (更多: 设为默认 / 复制 / 删除视图) into that
same function group, so the tab strip above is pure navigation. Every renderer
draws a `ViewToolbar`, which appends the 更多 slot automatically. `ViewConfigMenu` (the generic "视图配置" popover
over the registry's lazy `configEditor`) **is used by none of the five implemented
views** — every one of their controls has a dedicated menu — and only remains for
views that have no dedicated menu yet; a descriptor may therefore omit
`configEditor` entirely. **A view toolbar's function group holds verbs, not
readouts**: the kanban, the calendar and the gallery all dropped their
「N 泳道 · N 卡片」/「N 事件」/「N 张卡片」badge, because the board, the day cells and
the cards themselves say it — and a readout that follows the data would resize the
right-anchored group (see § _UI conventions_).

**The record surface is shared, not per-view.** `DataViewRoot` renders one
`RecordMenuAtPoint` and provides `shared/record-actions.tsx`'s context; a renderer
only calls `useRecordActions().openRecord(rowId, { hiddenFieldIds })` and wraps its
record element in `<RecordContextMenu rowId hiddenFieldIds sections>`. That is what
makes "click a record" and "right-click a record" identical in all five views. A
view adds its own menu items through `sections` (the kanban's 移动到, the gallery's
选择 + 删除选中). **The record _editing page_ is not the shell's**: `openRecord`
reports up through `DataViewRoot`'s `onOpenRecord`, and the host node-content
renders `<RecordEditor>` with its own live callbacks
(`database-node-content.tsx` / `collection-node-content.tsx`), because a record's
data and write path live there. The shell is therefore still the one place that
decides _what_ "open a record" means for every view, while the page itself stays
host-owned — and out of every lazy view chunk. It is laid out **inside the host's
box** (`absolute inset-y-0 right-0` + a scrim), because a node-content is mounted
full-screen _or_ inside the node editor's dialog window; the host marks whatever
the page covers as `inert`. The scrim dismisses only on a click it also saw a
`pointerdown` for: the touch that opens the page from a canvas bar/event makes the
browser dispatch a compatibility `click` **after** the page mounted, which used to
close it the instant it opened (mouse has no such sequence).

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
│   ├── database-source.ts       # DatabaseContent → DataViewSource (+ nodeId / nodeTitle provenance)
│   ├── collection-source.ts     # node projection → DataViewSource (fixed __schema, nodeTitle = the node's own name)
│   ├── cell-resolver.ts         # DatabaseCell → text/scalar/date/number/color/node ids
│   ├── row-utils.ts             # createDataRowId / emptyCellForField / createEmptyDataRow
│   │                            #   + createDatabaseFieldId / reconcileRowsForFields (shared field CRUD)
│   └── field-utils.ts           # primary/date/number/select field pickers
├── shared/
│   ├── view-toolbar.tsx         # ViewToolbar strip + ViewConfigMenu popover (config-in-toolbar)
│   ├── field-meta.tsx           # field-type labels/icons, option + fill palettes, field search
│   ├── field-select.tsx         # the in-popover field picker (shadcn Select; kanban + calendar)
│   ├── field-picker.tsx         # the searchable field dropdown a condition row picks with (table + kanban 排序)
│   ├── condition-menu.tsx       # THE 字段 + 方向 condition menu (table 分组/排序 + kanban 排序) and its
│   │                            #   order toggle / readout helpers
│   ├── settings-panel.tsx       # SettingsPanel / PanelSection / SwitchRow / CheckboxOptionList
│   ├── color.ts                 # contrastTextColor + tintColor (chips/fills on a themed surface)
│   ├── card.tsx                 # THE card body: DataCard (cover + title + tinted chips + value lines,
│   │                            #   four layouts) — the kanban and the gallery draw the same card
│   ├── card-cover.tsx           # THE card cover box: a cell URL, a node's preview, or a monogram
│   ├── card-ops.ts              # pure card layer: settings (incl. the legacy badgeFields/metaFields
│   │                            #   migration), title/cover/field resolution, cover source, field CRUD
│   ├── card-config.tsx          # THE 卡片配置 menu (标题/封面 config items / 展示模式 / 卡片字段 list) — kanban + gallery
│   ├── field-config-list.tsx    # THE field list (search, eye, per-field "…", 新增字段) — the table's
│   │                            #   字段配置 minus column groups; rows only ANNOTATE a role (badge/lock)
│   ├── field-value.tsx          # THE read-only value renderer: OptionBadge (tinted shadcn Badge),
│   │                            #   FieldValue, cellOptionBadges, date helpers — used by every DOM surface
│   ├── field-input.tsx          # the editable control per field type (quiet inputs, Switch, pickers)
│   ├── option-picker.tsx        # 单选/多选 editor: Popover + Command (查找或创建选项), badge trigger
│   ├── date-picker.tsx          # 日期 editor: the shadcn Calendar inside a Popover
│   ├── field-editor.tsx         # 标题/字段类型/选项内容/默认值 form (+ FieldEditorMenuContent for the
│   │                            #   table's dropdown); moved out of views/table/fields/editor.tsx
│   ├── record-actions.tsx       # the record surface's context (openRecord / openRecordMenu) + menu types
│   ├── body-layer.tsx           # ports an interaction layer (hover readout / menu-at-point) into
│   │                            #   document.body — a fixed anchor inside a transformed ancestor
│   │                            #   (the node editor dialog) is measured from that ancestor, not the viewport
│   ├── record-menu.tsx          # the unified record menu: buildRecordSections, RecordContextMenu,
│   │                            #   RecordMenuItems (dropdown), RecordMenuAtPoint (imperative) + duplicateRow
│   ├── record-editor.tsx        # the record page: a column of the HOST's own box (title, field
│   │                            #   rows, 隐藏字段, 新增字段 + a scrim); props-driven, never a
│   │                            #   viewport-fixed sheet — the host renders it inside a `relative`
│   │                            #   box; the scrim only dismisses a click it saw a `pointerdown` for
│   │                            #   (a touch's compatibility click lands on it right after opening)
│   ├── data-view-placeholder.tsx        # placeholder body the two unimplemented views render
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
    │                ├── menus/    field-menu.tsx + filter-menu.tsx
    │                │              + condition-controls.tsx + color-menu.tsx + select-menu.tsx
    ├── kanban/      kanban-data-view.tsx + reui/kanban.tsx     (implemented — see below)
    │                ├── core/     board.ts + config.ts
    │                ├── board/    kanban-board.tsx + kanban-card.tsx + lane-option-editor.tsx
    │                └── toolbar/  kanban-toolbar.tsx
    ├── calendar/    calendar-data-view.tsx     (implemented — see below)
    │                ├── core/     config.ts + schema.ts + theme.ts
    │                ├── board/    calendar-surface.tsx + event-readout.tsx
    │                └── toolbar/  calendar-toolbar.tsx
    ├── gallery/     gallery-data-view.tsx     (implemented — see below)
    │                ├── core/     config.ts + layout.ts + schema.ts
    │                ├── board/    gallery-board.tsx + gallery-card.tsx
    │                │              + use-gallery-scroll.ts
    │                │              + use-gallery-focus.ts
    │                └── toolbar/  gallery-toolbar.tsx
    ├── gantt/       gantt-data-view.tsx        (implemented — see below)
    │                ├── core/     config.ts + schema.ts
    │                ├── canvas/   theme.ts
    │                ├── board/    gantt-surface.tsx + task-readout.tsx
    │                └── toolbar/  gantt-toolbar.tsx
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
| menus   | `menus/color-menu.tsx`         | 填色 dropdown: colour + target (cell/row/column) + condition                                                                                                                                                                                           |
| menus   | `menus/select-menu.tsx`        | the 单选/多选 option dropdown: 查找或创建选项 search + capsule rows + 创建 row; 单选 closes on a pick, 多选 stays open                                                                                                                                 |
| menus   | `menus/condition-controls.tsx` | 筛选 / 填色's type-aware value input. The 字段 + 方向 row (and its order switch) serves two views, so it lives in `shared/condition-menu.tsx`                                                                                                          |
| —       | —                              | the table has **no** `config-editor.tsx`: its configuration is its toolbar                                                                                                                                                                             |

**The grouping is a dependency order, not a label.** `core/*` and `canvas/*` import
no React (only VTable _types_) and are pure functions/data; `canvas/*` may reach
into `shared/field-meta.tsx` for the palettes; `menus/*` may import `core/*` +
`canvas/*` + `shared/*`; `toolbar/*` wires the menus; **nothing inside the folder
imports `table-data-view.tsx`** — the shell only assembles. Keep it that way: a
`core/*` file that starts importing a `.tsx` component has broken the layer.

### kanban view internals

| Group   | File                           | Responsibility                                                                                                                                                                                                                                                                                 |
| ------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —       | `kanban-data-view.tsx`         | the shell: board state (re-seeded from the source during render), the write path (lane change → `onCellChange`), host-capability gates, and the missing-group-field guidance. The only file `registry.ts` imports                                                                              |
| vendor  | `reui/kanban.tsx`              | the vendored ReUI board primitives (`Kanban` / `KanbanBoard` / `KanbanColumn` / `KanbanColumnHandle` / `KanbanColumnContent` / `KanbanItem` / `KanbanItemHandle` / `KanbanOverlay`). Keep it close to upstream                                                                                 |
| core    | `core/board.ts`                | `buildKanbanBoard` (rows + group field → lanes/cards, cards ordered by the multi-level 排序 list), `moveCardToLane`, `findCardByKey`, `cardKey`. The card's own content comes from `shared/card-ops.ts` (`readCardSettings` / `cardFieldValues` / `resolveRowCover`). No React                 |
| core    | `core/config.ts`               | the board's own half: `resolveGroupField`, `orderLaneOptions`, `resolveKanbanSort` (the 排序 condition list, legacy `sortBy` included), `optionColor`, `cellForLane`, `patchFieldOption`. Card settings are not here — see `shared/card-ops.ts`. No React                                      |
| board   | `board/kanban-board.tsx`       | `<Kanban>` root + lane strip + overlay; maps REUI's `onValueCommit` onto "cross-lane = write, same-lane = local order, column = `laneOrder`"                                                                                                                                                   |
| board   | `board/kanban-card.tsx`        | the shared `DataCard` wrapped in the drag handle + the shared record context menu (移动到 is one of its items; the card carries **no** floating button). Also what the drag overlay renders                                                                                                    |
| board   | `board/lane-option-editor.tsx` | 编辑选项: rename + recolour one option (mounted per popover open, so its draft state re-seeds)                                                                                                                                                                                                 |
| toolbar | `toolbar/kanban-toolbar.tsx`   | 分组 panel + the **shared 卡片配置** + the **shared 排序 menu** (`shared/condition-menu.tsx`, the table's own) on the left (via `ViewToolbar`); nothing on the right — the lanes carry their own counts. No 显示 panel: counts are always shown and drag/create follow the host's capabilities |
| —       | —                              | no `config-editor.tsx`: the three panels cover every `KanbanViewConfig` key, so the descriptor omits `configEditor`                                                                                                                                                                            |

Layering matches the table's: `core/*` is pure, `board/*` composes REUI + shadcn,
`toolbar/*` only reads config and reports `onConfigChange`, and **nothing imports
`kanban-data-view.tsx`**. Its field picker is the shared
`shared/field-select.tsx` (the calendar uses the same one).

### calendar view internals

| Group   | File                           | Responsibility                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —       | `calendar-data-view.tsx`       | the shell: field mapping resolved against the live schema, the write path (drop / resize / 框选 / 双击 → `onCellChange` / `onRowInsert`), the hover + click readout state, the `--fc-*` theme variables, and the missing-field guidance. The only file `registry.ts` imports                                                                                                                            |
| core    | `core/config.ts`               | config self-healing (`resolveStartField` / `resolveEndField` / `resolveTitleField` / `resolveColorField` / `resolveTooltipFields`), `headerToolbar` ⇄ "which view buttons", `toFullCalendarView` / `fromFullCalendarView`, `buttonTextFor`, and `CALENDAR_FIXED` — the locale / height / theme / weekends / now-line / event-fold / click defaults the removed 交互 + 显示 panels used to set. No React |
| core    | `core/schema.ts`               | `rowsToEvents` (rows → `EventInput`), `rangeToCells` / `eventToCells` / `selectionToRow` (gesture → cells, **the only ±1 day conversion**), `toISODate` / `addDays`, `readEventRecord` / `readEventReadout`. Only FullCalendar _types_                                                                                                                                                                  |
| core    | `core/theme.ts`                | `DataViewThemeTokens` → the `--fc-*` custom properties. No React                                                                                                                                                                                                                                                                                                                                        |
| board   | `board/calendar-surface.tsx`   | the `memo`-wrapped `<FullCalendar>`: plugins, locale, `buttonText`, `onApi`, every event callback, and the body host the drag mirror is appended to (`fixedMirrorParent` + the `--fc-*` vars copied onto it — a `fixed` mirror under a transformed ancestor is measured from that ancestor). Re-renders only when the config or the data changed                                                        |
| board   | `board/event-readout.tsx`      | the hover `Tooltip`, anchored to an invisible fixed `<span>` at the event's rect and portalled through `shared/body-layer.tsx` (a click opens the record editor instead of a panel)                                                                                                                                                                                                                     |
| toolbar | `toolbar/calendar-toolbar.tsx` | 字段配置 / 视图 panels on the left (via `ViewToolbar`); nothing on the right. 字段配置 is four role **config items** (开始日期 / 结束日期 / 标题 / 颜色, each a `PanelSection` + `FieldSelect`) over the shared `FieldConfigList`, where the eye = 悬浮提示 and a row only annotates its role                                                                                                           |
| —       | —                              | no `config-editor.tsx`: the two panels cover every `CalendarViewConfig` key a user can decide (`timeZone` is pinned to `local` for v1), so the descriptor omits `configEditor`                                                                                                                                                                                                                          |

Layering matches the others: `core/*` is pure, `board/*` composes FullCalendar +
shadcn, `toolbar/*` only reads config and reports `onConfigChange`, and **nothing
imports `calendar-data-view.tsx`**. Full details in `docs/dataview/calendar.md` §0.

### gallery view internals

| Group   | File                                                         | Responsibility                                                                                                                                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| —       | `gallery-data-view.tsx`                                      | the shell: `rowsToCards`, the shared `useRowSelection`, the write path (open → `useRecordActions().openRecord`, delete → `onRowDelete`, 添加记录 → `onRowInsert`), host-capability gates, and the empty states. The only file `registry.ts` imports                                                                                  |
| core    | `core/config.ts`                                             | the wall's own two keys only: 排列方式 / 卡片尺寸 enums + `resolveLayout` / `resolveCardSize`. Everything about a _card_ moved to `shared/card-ops.ts`. No React                                                                                                                                                                     |
| core    | `core/layout.ts`                                             | card geometry: size → min column width + `gridRowHeight` / `listRowHeight`, `fitColumnCount` (measured, no configured cap), `readRowWindow` / `rowStride` / `totalRowHeight`, and the shrunken `NO_COVER_GRID_ROW_HEIGHT` a coverless 网格 uses. Pure arithmetic, no React                                                           |
| core    | `core/schema.ts`                                             | `rowsToCards` — the gallery's own row walk over the shared card ops (title / cover / fields / `hiddenFieldIds`). A card carries **field + cell**, never pre-rendered text. No React                                                                                                                                                  |
| board   | `board/gallery-board.tsx`                                    | the layout engine: 网格 / 列表 through the virtual window, 瀑布流 as `i % columns` column stacks; owns the scroll container, the fixed `gridAutoRows` and the wall's `onKeyDown`                                                                                                                                                     |
| board   | `board/gallery-card.tsx`                                     | one card: the shared `DataCard` plus one interaction layer — a full-card open button at `z-0` — and the shared `RecordContextMenu` on right-click with a gallery-only 选择 item + 删除选中的 N 条. **No checkbox and no "…" button**: selection is the keyboard / modifier gesture, and the right-click menu is the card's only menu |
| board   | `board/use-gallery-scroll.ts` + `board/use-gallery-focus.ts` | the row window (网格/列表) + incremental reveal (瀑布流), and the wall's roving tabindex: arrows/Home/End/Page, Shift range, Ctrl+A, Escape                                                                                                                                                                                          |
| toolbar | `toolbar/gallery-toolbar.tsx`                                | 添加记录 / 卡片配置 (shared) / 布局 on the left, **nothing** on the right but the shell's 更多. No 导出 menu, no 批量操作 button and no count badge: selection is the keyboard / modifier gesture (Ctrl-click / Shift-range / Ctrl+A / Escape), and 删除选中 lives on a selected card's right-click menu                             |
| —       | —                                                            | no `config-editor.tsx`: the two panels cover every `GalleryViewConfig` key, so the descriptor omits `configEditor`                                                                                                                                                                                                                   |

Layering matches the others: `core/*` is pure, `board/*` composes the card DOM,
`toolbar/*` only reads config and reports `onConfigChange`, and **nothing imports
`gallery-data-view.tsx`**. The card itself is not the gallery's any more: the body
is `shared/card.tsx`, the cover box `shared/card-cover.tsx`, the data/settings
`shared/card-ops.ts` and the menu `shared/card-config.tsx`, all shared with the
kanban. The one cross-package reach is
`@workspace/ui/components/preview-block/node-preview-cover` (from
`shared/card-cover.tsx`) — imported by path so the hover panel (and its video
player) stays out of the card's chunk. Full details in `docs/dataview/gallery.md`
§0.

### gantt view internals

| Group   | File                        | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —       | `gantt-data-view.tsx`       | the shell: the five role resolutions against the live schema, the write path (`change_date_range` → `taskRangeToCells` → `onCellChange`), the fold state (one group field's collapsed keys), the hover readout (derived from the current records, anchored at the pointer) and the guidance states. The only file `registry.ts` imports                                                                                                                                                                                                                                                                                                                                                                                                      |
| core    | `core/config.ts`            | role self-healing (`resolveStartField` / `resolveEndField` / `resolveTitleField` / `resolveProgressField` / `resolveGroupField` / `resolveTooltipFields`), `resolveTaskColumnTitle` (表头: config → `source.nodeTitle` → `GANTT_FIXED.taskColumnTitle`), `buildTimelineScales` (日/周/月 → two header levels), `timelineColWidth` / `taskBarWidth`, and `GANTT_FIXED`. No React, no library                                                                                                                                                                                                                                                                                                                                                  |
| core    | `core/schema.ts`            | `rowsToGanttRecords` (rows → flat records keyed by `__gantt*`, a synthetic `type: "project"` 分组 header row per group, folded members omitted), `taskRangeToCells` (drag → start/end cells, **inclusive end — no ±1 conversion**), `readTaskReadout`, the ISO day helpers. No React, no library                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| canvas  | `canvas/theme.ts`           | `DataViewThemeTokens` → the task list's `ITableThemeDefine` + the literal colours the timeline/grid/task bar/frame options take. No React                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| board   | `board/gantt-surface.tsx`   | the `memo`-wrapped imperative `<Gantt>`: constructed once per `structureKey` (粒度/行高/周末/今日线/主题模式/可写能力), `setRecords` for data, `release()` on cleanup, every library event mapped onto the shell's callbacks. Resolves a task-list row **by index into the applied records** (see the gotchas), keeps the container `relative isolate` (the library's absolute layers _and_ its own `z-index: 100` split line, which otherwise paints over the record page's `z-30` scrim), and draws the 分组/任务 hierarchy with the list column's `style` function. The 表头 is **not** in `structureKey` — `taskListTableInstance.updateColumns(taskListColumns(title))` retitles it in place (a node rename must not rebuild the chart) |
| board   | `board/task-readout.tsx`    | the hover `Tooltip`, anchored to an invisible fixed `<span>` at the pointer the library reported and portalled through `shared/body-layer.tsx` (a click opens the record editor instead of a panel)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| toolbar | `toolbar/gantt-toolbar.tsx` | 字段配置 / 视图 panels on the left (via `ViewToolbar`); nothing on the right. 字段配置 is five role **config items** (开始日期 / 结束日期 / 标题 / 进度 / 分组, each a `PanelSection` + `FieldSelect`) over the shared `FieldConfigList`, where the eye = 悬浮提示 and a row only annotates its role; 视图 is 表头 (a commit-on-blur box whose placeholder is the node's own name) / 时间粒度 / 行高 / 今日线 / 周末                                                                                                                                                                                                                                                                                                                         |
| —       | —                           | no `config-editor.tsx`: the two panels cover every `GanttViewConfig` key, so the descriptor omits `configEditor`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Layering matches the others: `core/*` and `canvas/*` are pure, `board/*` composes
the library + shadcn, `toolbar/*` only reads config and reports `onConfigChange`,
and **nothing imports `gantt-data-view.tsx`**. Full details in
`docs/dataview/gantt.md` §0.

### UI conventions (applies to every view)

**Config lives in the view toolbar, not a side panel.** A renderer draws one
`ViewToolbar` strip with **configuration on the left and functions on the
right**; every control is a button or a dropdown menu. Do not add a side panel
back, and do not add a generic "视图配置" catch-all to a view whose settings all
have dedicated menus (the table's and the kanban's did, so both views' buttons
and their registry `configEditor` entries are gone).

A view whose settings are a **form** (a `Select`, a checkbox list, switches)
takes a `Popover` panel; a list of **commands** takes a `DropdownMenu`. The
kanban's 分组/卡片配置/排序, the calendar's 字段配置/视图 and the gantt's
字段配置/视图 panels are popovers for exactly that reason — a menu's roving focus is the wrong tool for a body full of
inputs. Both are built from the same three primitives
(`shared/settings-panel.tsx`: `SettingsPanel` / `PanelSection` / `SwitchRow`,
plus `CheckboxOptionList`), and both pick a field with
`shared/field-select.tsx`; a new toolbar panel should reuse them rather than
hand-roll another popover. **A `SettingsPanel` trigger is neutral chrome**: it
shows the current value next to its label and nothing else. There is no
"engaged" tint — the panel itself states what is set, and a coloured trigger only
made the user guess what the colour meant (they were removed on request).
**A panel carries no explanatory prose**: the trigger already names it and the
controls speak for themselves. The only prose allowed is what a control needs in
order to work at all — an empty state ("先添加字段，才能设置条件。"), why a control
is disabled ("这张表还没有「日期」字段…"), or where a fixed value comes from (a
collection card's node-preview cover). The hint paragraphs that used to sit under
a control are gone (on request), and so is the generic 视图配置 popover's copy.
**A condition panel keeps a heading line** (restored on request): 筛选 / 分组 /
排序 / 填色 open with `设置…条件`, and that row is where 清除 sits — a titled panel
is chrome, not explanation, and it is what tells four same-shaped menus apart.
行高 / 导出 / 新建视图 carry no caption: their trigger already reads as the title.
**Same control, same look**:
the table's 分组 / 排序 are the kanban's neutral `[icon] 分组 <字段名>` triggers
(same `Columns3` / `ArrowUpDown` icons, no tint, no count badge) and the kanban's
排序 _is_ the table's menu — one component, `shared/condition-menu.tsx`, multi-level
levels included — the calendar's 字段配置 trigger is the table's `[FolderTree]
字段配置`, and every 添加记录 button is the same muted outline button.

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
| Right-click menu on a card / row                | `context-menu` (the record menu a card shows)                    |
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
- **one field, one renderer.** 单选/多选 is always the tinted shadcn `Badge` from
  `shared/field-value.tsx` (`OptionBadge`), a date is locale text, a checkbox a
  check glyph, a url a link, a relation a chip. The table is the sole exception —
  a canvas cannot mount React, so `canvas/pill.ts` mirrors the same rules. Never
  hand-roll another chip: the kanban card, the gallery card and the record editor
  all go through `FieldValue`;
- **one card, two views.** A record drawn as a card is `shared/card.tsx`'s
  `DataCard` (cover + title + tinted chips + one value line per other field, with
  `grid` / `masonry` / `list` / `board` arrangements) in the kanban _and_ the
  gallery, its cover is `shared/card-cover.tsx`, its data + settings are
  `shared/card-ops.ts` and its config menu is `shared/card-config.tsx`
  (标题 / 封面 config items + 展示模式 + 卡片字段). A card view never draws its own chip or value
  row, and never grows a second card-config panel. A value line deliberately
  carries **no field name** (the name is the line's `title` attribute): the shared
  default is `cardFieldIds()` (every 单选/多选 as chips + the first non-title text
  as the 详情 line), and a kanban excludes its grouping field from it because the
  lane already states that value. **Roles are config items, and the same shape
  everywhere**: `卡片配置` opens with 标题 / 封面 (`PanelSection` + `FieldSelect`
  each) and the calendar's `字段配置` with 开始日期 / 结束日期 / 标题 / 颜色 — one
  labelled control per role, never a setter hidden inside a per-field "…" menu. The
  field list below annotates the role a row holds (`badge`, `locked`) and owns
  visibility + CRUD. A coverless card draws **no cover box at all** (no cover field
  resolves / not a collection): `cover === undefined` drops the region, `null`
  keeps it with the monogram placeholder — one rule for the kanban and the gallery
  (`cardCoverEnabled`), and a coverless 网格 shrinks its fixed row so no empty cover
  area is reserved;
- **one field list, every 字段配置.** `shared/field-config-list.tsx` is the
  table's 字段配置 body without column groups: search box, type-icon rows, a
  visibility eye, a per-field "…" menu (编辑字段 / 删除字段 only) and a 新增字段
  footer that opens the shared editor. A view owns the meaning of a row
  (`visible` = on the card / in the tooltip, `badge` = the role _annotation_) and
  the write path (`onSubmitField` / `onDeleteField`). **A row annotates a role, it
  never sets one**: there is no `fieldItems` prop any more, because every role is a
  config item above the list (see the next bullet). The eye is **always visible**
  here (unlike the table's hover-revealed one) because it is the only thing stating
  the row's state;
- **a view never re-states its data in the toolbar.** The kanban / calendar /
  gallery function groups carry no「N 泳道 · N 卡片」「N 事件」「N 张卡片」readout:
  lanes, day cells and cards already show it, and a readout that changes with the
  data (or with the selection) drags the right-anchored group around. Counts
  belong in a menu label when they are needed (导出 CSV（全部 N 条）);
- **one field, one editor.** `shared/field-input.tsx` dispatches on the field type
  — 日期 uses the shadcn `Calendar` in a `Popover` (`shared/date-picker.tsx`),
  单选/多选 the `Command`-based `OptionPicker`, text/number/url a quiet `Input`
  that commits on blur/Enter, checkbox a `Switch`. A new editing surface composes
  `FieldInput` rather than writing a second date picker;
- **the record surface is shared, not per-view**: click opens
  `useRecordActions().openRecord(rowId, { hiddenFieldIds })`; right-click wraps the
  record element in `<RecordContextMenu>`. `hiddenFieldIds` are the fields the view
  does _not_ show — they fold into the editor's 隐藏字段 block;
- labels are 12px sentence case, hints 11px `text-muted-foreground`; numbers use
  `tabular-nums`; no ALL-CAPS tracked eyebrows;
- an empty state is an invitation (muted panel + what to do), not a mood.

## WHERE TO LOOK

| Task                                                           | Location                                                                                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change the shell / routing                                     | `src/data-view-root.tsx`                                                                                                                                 |
| Add or re-label a view type                                    | `src/registry.ts` + `src/defaults.ts`                                                                                                                    |
| Tweak default configs                                          | `src/defaults.ts`                                                                                                                                        |
| Change how database rows are read                              | `src/source/database-source.ts`                                                                                                                          |
| Change the collection projection schema                        | `src/source/collection-source.ts` (`COLLECTION_FIELD_IDS`)                                                                                               |
| Cell → text/color/date/number                                  | `src/source/cell-resolver.ts`                                                                                                                            |
| Implement a view                                               | `src/views/<name>/` (replace the placeholder body)                                                                                                       |
| Group rows into lanes / cards                                  | `src/views/kanban/core/board.ts`                                                                                                                         |
| Kanban config self-heal / lane order                           | `src/views/kanban/core/config.ts`                                                                                                                        |
| Kanban drag write-back                                         | `src/views/kanban/board/kanban-board.tsx`                                                                                                                |
| Vendored ReUI board                                            | `src/views/kanban/reui/kanban.tsx`                                                                                                                       |
| Rows → calendar events / gesture → cells                       | `src/views/calendar/core/schema.ts`                                                                                                                      |
| Calendar config self-heal / view names / fixed defaults        | `src/views/calendar/core/config.ts` (`CALENDAR_FIXED`)                                                                                                   |
| Calendar theme (FullCalendar `--fc-*`)                         | `src/views/calendar/core/theme.ts`                                                                                                                       |
| The `<FullCalendar>` instance                                  | `src/views/calendar/board/calendar-surface.tsx`                                                                                                          |
| Calendar hover readout                                         | `src/views/calendar/board/event-readout.tsx`                                                                                                             |
| Rows → gantt records / drag → date cells                       | `src/views/gantt/core/schema.ts`                                                                                                                         |
| Gantt config self-heal / 粒度 → scales / fixed defaults        | `src/views/gantt/core/config.ts` (`GANTT_FIXED`)                                                                                                         |
| The gantt instance (lifecycle, events, `setRecords`)           | `src/views/gantt/board/gantt-surface.tsx`                                                                                                                |
| Gantt theme (task list `ITableThemeDefine` + canvas colours)   | `src/views/gantt/canvas/theme.ts`                                                                                                                        |
| Gantt hover readout                                            | `src/views/gantt/board/task-readout.tsx`                                                                                                                 |
| Rows → cards (gallery)                                         | `src/views/gallery/core/schema.ts`                                                                                                                       |
| The card body / cover / settings / menu (kanban + gallery)     | `src/shared/card.tsx` + `src/shared/card-cover.tsx` + `src/shared/card-ops.ts` + `src/shared/card-config.tsx`                                            |
| The shared field list (卡片配置 + 日历字段配置)                | `src/shared/field-config-list.tsx`                                                                                                                       |
| The unified record editor / context menu                       | `src/shared/record-menu.tsx` + `src/shared/record-actions.tsx` (the menu, shell-owned) + `src/shared/record-editor.tsx` (the page, rendered by the host) |
| Field display / edit vocabulary (shared)                       | `src/shared/field-value.tsx` + `src/shared/field-input.tsx` (+ `option-picker` / `date-picker`)                                                          |
| Gallery config self-heal / layout enums                        | `src/views/gallery/core/config.ts`                                                                                                                       |
| Gallery card geometry / virtual window                         | `src/views/gallery/core/layout.ts` + `src/views/gallery/board/use-gallery-scroll.ts`                                                                     |
| Gallery keyboard nav                                           | `src/views/gallery/board/use-gallery-focus.ts` + `gallery-card.tsx`                                                                                      |
| A node's cover media (shared with cards)                       | `packages/ui/src/components/preview-block/node-preview-cover.tsx`                                                                                        |
| In-popover field picker (shared)                               | `src/shared/field-select.tsx` (compact `Select`) + `src/shared/field-picker.tsx` (searchable)                                                            |
| The 字段 + 方向 condition menu (table 分组/排序 + kanban 排序) | `src/shared/condition-menu.tsx`                                                                                                                          |
| Settings-panel primitives (shared)                             | `src/shared/settings-panel.tsx`                                                                                                                          |
| A pointer-anchored layer (readout / menu-at-point)             | `src/shared/body-layer.tsx` (a fixed anchor must live in `document.body`, not under a transformed ancestor)                                              |
| Contrast text for a colour fill                                | `src/shared/color.ts`                                                                                                                                    |
| Host integration                                               | `packages/ui/src/components/dialog/editor/content/{database,collection}-node-content.tsx`                                                                |
| Persisted model                                                | `packages/interfaces/src/models/data-view.ts`                                                                                                            |

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
  onOpenRecord={(rowId, options) => …}   // required for a record page: the HOST renders <RecordEditor>
  onOpenNode={(nodeId) => useUIStore.getState().handleNodeEdit(nodeId)}
  // —— optional, table view (database hosts) ——
  onRowInsert={(row) => …}      // append a row the renderer minted (row.id included)
  onRowDelete={(rowIds) => …}
  onRowReorder={(rowIds) => …}  // full row-id order; only emitted with no active filter
  onFieldsChange={(fields, rows) => …}  // schema write; rows present when cells changed too
  resolveNodeTitle={(nodeId) => useDataStore.getState().nodes.get(nodeId)?.title}
  // —— optional, gallery view (both hosts) ——
  resolveNode={(nodeId) => useDataStore.getState().nodes.get(nodeId)}  // node covers
/>
```

When `views` is empty, `DataViewRoot` synthesizes one default view (table, for
both hosts) with the deterministic id `dv_default_<nodeId>` and reports it
through `onViewsChange` once per mount, so the host can persist it.

`resolveNodeTitle` exists so `relation` cells can show node titles without this
package depending on `@workspace/store`; the database host supplies it lazily
via `getState()` (a store selector would re-render the node on every unrelated
node change). `resolveNode` is the same idea one level up: the gallery needs the
node _itself_ to draw its preview as a card cover, so both hosts hand over a
lazy `nodes.get(id)` lookup rather than a map.

## HOW TO ADD / IMPLEMENT A VIEW

1. Replace the body of `src/views/<name>/<name>-data-view.tsx` with the real
   renderer, keeping the `DataViewRendererProps<XViewConfig>` signature.
   **`views/table/` is the reference implementation** for a _canvas_ view — copy
   its split (`core/` pure logic, `canvas/` theme + custom render, `toolbar/`,
   `menus/`, `shared/`, and the lifecycle shell at the view root) rather than
   growing one file; the layering rule in § _table view internals_ applies to
   every view. **`views/kanban/` is the reference for a DOM view** whose library
   is external source: vendor it under `reui/` unchanged, keep the data model in
   `core/`, compose the library + shadcn in `board/`, and let the shell own the
   state + write path. **`views/calendar/` is the reference for a DOM view built
   on an npm library** (FullCalendar): `core/` holds the pure config resolution +
   data mapping + theme, `board/` holds the one `memo`-wrapped library component
   plus the panels that must be anchored to library-rendered DOM, and the shell
   owns the write path and the imperative library API. Read its §0 gotchas before
   wrapping a library that re-renders the world on every prop change.
   **`views/gallery/` is the reference for a DOM view with no library at all**:
   `core/` holds the pure mapping + geometry, `board/` holds the layout engine
   and the card, and the shell owns selection and the write path. Copy its
   `use-gallery-scroll.ts` when a view needs to mount only what is on screen
   (mind its fixed-row-height precondition), and `use-gallery-focus.ts` when the
   view is a grid a keyboard should be able to walk (roving tabindex, focus
   retried until the virtual window has mounted the target). A view that draws
   **cards** composes `shared/card.tsx` + `shared/card-config.tsx` over a
   `DataCardConfig` fragment instead of writing its own card and its own card
   settings.
2. Only if the view has settings without a dedicated toolbar menu: add
   `config-editor.tsx` (`DataViewConfigEditorProps<XViewConfig>`) and register it
   as `configEditor`. A view whose toolbar covers everything (the table, the
   kanban, the calendar, the gantt) leaves the descriptor's `configEditor` undefined and
   gets no 视图配置 button. Build the panels from `shared/settings-panel.tsx` +
   `shared/field-select.tsx`.
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

- **A settings panel's body scrolls, capped by Radix's own available height**
  (`shared/settings-panel.tsx`). A panel is as tall as its sections plus the field
  list, and the gantt's 字段配置 (five roles + list) measured 624px inside a 633px
  viewport with `overflow: visible` — the 新增字段 footer was unreachable. Keep
  the cap on any new panel rather than removing it.
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
- **VTable-Gantt traps the gantt view already works around** (all verified in a
  real browser; `docs/dataview/gantt.md` §0 has the measurements):
  - **`groupBy` is declared but unimplemented** in 1.26.8, and the nested
    `children` model it points at turns the task list's `tree` off — so the view's
    分组 is a synthetic `type: "project"` record per group plus a fold that drops
    the group's member records.
  - **A task-list row must be resolved by index into the records you applied, not
    from the event's `originData`.** After a fold, `originData` still resolves
    against the array the ListTable was _constructed_ with: clicking the visible
    「数据层」 row reported 「竞品调研」, a row that was no longer on screen.
  - **The progress drag handle cannot be grabbed.** It is drawn at
    `y = barHeight - 3` (12px tall), i.e. below the bar's bottom edge, while the
    hover group that owns it is hidden the moment the pointer leaves the bar
    (measured: the cursor stays `col-resize` instead of `ew-resize`, and the press
    neither moves the bar nor fires `progress_update`). `progressAdjustable` is
    therefore `false`: the progress _fill_ is a read-out, and progress is edited in
    the record editor.
  - The library **mutates the records you pass in** on a drag before firing
    `change_date_range`; records are rebuilt from the source on every render, so
    the shell's `onCellChange` write is what makes the change real.
  - Its end date is **inclusive** (`taskDays = end - start + 1`) — the opposite of
    FullCalendar's exclusive `end`, so there is no ±1 day conversion anywhere in
    this view.
  - `select: { disableSelect: true }` on the task list: nothing there is
    selectable (a click already opens the record or folds a group), and VTable's
    own selection paint survives the gantt's theme merge as its default blue.
  - It registers its own resize observer on the container and `release()` removes
    its DOM, so the shell must not add one and must always call `release()`.
  - **The container must be a positioned ancestor (`relative`).** The library
    appends two absolutely positioned layers — the timeline canvas
    (`.vtable-gantt { position: absolute }` in its injected stylesheet, pushed
    right by `element.style.left = <taskListWidth>`) and the split-line handle —
    and without one they resolve against the page: the two canvases overlapped by
    the container's own offset and the divider was drawn above the chart
    (measured: handle at `y = 0` while the chart started at `y = 99`).
  - **The task list's hierarchy has to be drawn by the view.** The grouping is
    ours, so nothing tells the library which row is a 分组 header: without help
    they are identical flat rows distinguished only by the ▸/▾ glyph in the
    title. The list column's `style` function bolds the header and indents its
    tasks (`GANTT_FIXED.taskListIndent`), resolving the row with
    `table.getCellOriginRecord(col, row)` — the _live_ record, unlike the event's
    cached `originData` above — and skipping the header row so 「任务」 keeps its
    own inset.
  - **Both `position: fixed` anchors a canvas view needs must go through
    `shared/body-layer.tsx`.** A fixed box inside a transformed ancestor (the node
    editor dialog is centred with `-translate-x-1/2 -translate-y-1/2`) uses that
    ancestor as its containing block, so the hover readout landed down-right of
    the pointer by the dialog's own page offset. Radix portals its _content_ to
    the body, never our anchor.
- **VTable traps the table view already works around** (every one verified in a
  real browser; the full write-up is `docs/dataview/table.md` §10):
  - `heightMode: 'adaptive'` stretches rows to fill the container → the table uses
    `'standard'` so the density setting holds (content still fills the pane).
  - VTable sorts only from the header **sort icon** → the view also wires the
    column context menu (`dropdown_menu_click`).
  - **`sortState` is a constructor option, so a config write must be pushed in by
    hand.** `structureKey` deliberately excludes the sort (a sort must not rebuild
    the table), and `updateSortState` is the only way to apply it afterwards —
    without that effect the 排序 panel persisted a sort the table never applied
    (the menu looked like it worked and the rows never moved). Key that effect on
    the _serialized_ state, not the array identity: `config.sortState` is a fresh
    array on every host render, and `persistSortState` writes a new one from every
    `after_sort`. `updateSortState` does not fire `after_sort`, so it cannot bounce
    back into the write path. Verified end to end in the browser by exporting CSV
    (the export walks the _display_ order, which is how the row order was read
    off a canvas).
  - A row drag from the row-number handle reports `movingColumnOrRow ===
undefined`; identify it with `table.isSeriesNumber(col, row)`, which is
    `false` unless **both** are passed.
  - VTable keeps a 1×1 transparent `input.table-focus-control` in the container —
    not an open cell editor.
  - An icon from `getCellIcons()` is not clickable where it looks: the row drag
    handle occupies only the left ~18px of the row-number cell.
  - **A grouped column has a multi-row header**, so "which field is this visual
    column" must come from the _deepest_ header row upwards
    (`headerFieldIdAt` + `table.columnHeaderLevelCount`); reading level 0 returns
    the group define and column drag/resize write-back silently loses it.
  - **The trailing "+" column is synthetic** (`TABLE_ADD_FIELD_COLUMN_ID`: a 44px
    header-only define drawn with `headerCustomRender`). It must stay out of
    `resolveTableColumns`, `readColumnLayout` (guarded by its `known` set), the
    row-order probe and export (`formatExportOutput` blanks it); its header click
    opens 新增字段, anchored to the glyph's square. The glyph is **text only** —
    the header band is already `muted`, and cursor + whole-cell hit area are what
    make it read as a control.
  - **A canvas-anchored floating panel needs a viewport rect and a trigger that
    outlives the close** (`menus/select-menu.tsx`, `menus/field-menu.tsx`): take
    the rect from `getCellRelativeRect`, **never** `getCellRect` (the entry
    points are exactly the cells you scrolled to, so the anchor lands a whole
    `scrollLeft` away); and keep the **last** rect in a ref, rendering the trigger
    whenever an anchor is known — Radix keeps the content mounted through
    `data-closed:animate-out`, and a trigger that unmounted in the same commit
    makes floating-ui measure a detached node and flash the panel at `(0,0)`.
  - **单选/多选 capsules are canvas-drawn** (`canvas/pill.ts`): their colours come
    from raw option **ids** stored beside the names under `optionIdsKey(field.id)`
    (the record value is the option _name_, so the id is unrecoverable from it),
    and there is no measurement hook in `customRender`, so the capsule measures
    itself with an offscreen 2D context whose font comes from
    `resolveCanvasFontFamily(tokens)`.
  - **A canvas cell's little buttons must be VTable `icon` elements, not
    coordinate maths.** `customRender` emitting `{type:"icon", svg, name,
clickable:true}` yields a pickable graphic whose tap fires `icon_click` with
    that `name` — and fires `click_cell` **first** with `targetIcon` populated, so
    a `click_cell` handler must ignore `targetIcon` or "delete this option" also
    opens the dropdown. Icons do not inherit `fill`: the `svg` is colour-baked
    (cached per colour, `sanitizeSvgColor`d).
  - **`scroll` fires for VTable's own bookkeeping too** — the `setRecords` after a
    write emits ten `scroll` events with `dx/dy = 0` and `args.event ===
undefined`. Close the option dropdown on `args.event` only, or the 多选 panel
    vanishes after every pick.
  - **"Create this option" is two writes and the order is load-bearing**:
    `onFieldsChange(fields)` first, `onCellChange(...)` second. The host merges a
    gesture's patches with the **later** `rows` patch winning, and
    `DatabaseContent` rejects a cell referencing an option its field does not
    declare — exactly the intermediate state the other order creates.
  - **A conditional fill needs a contrasting text colour**: 填色 sets only
    `bgColor`, so the style callback pairs it with `contrastTextColor(fill)`
    (`shared/color.ts`, React-free because the calendar's chips need it too).

- **A `ScrollArea` clamped with `max-h-*` does not clip its content, and the rows
  paint over the footer below them.** Radix's viewport is `h-full`, which
  resolves to `auto` against an auto-height root: with `max-h-72` the root is
  288px but the viewport is as tall as its _content_, so the last rows spill past
  the clamp and sit on top of the next sibling. The 新增字段 button below the field
  list therefore could not be clicked at all (measured:
  `document.elementFromPoint` at the button's centre returned the last row's
  `span`, and the dropdown never opened). Use a **definite** height once the list
  is long enough to overflow (`shared/field-config-list.tsx` and
  `views/table/menus/field-menu.tsx` both switch to `h-72` above 7 visible rows),
  so the viewport resolves its `h-full` and the list scrolls inside its own box.
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
- **The calendar is a FullCalendar surface, and five of its rules are
  load-bearing** (all verified in a real browser; see `docs/dataview/calendar.md`
  §0):
  - **FullCalendar's React wrapper calls `resetOptions` on every re-render.**
    `componentDidUpdate` hands it the whole prop object; any changed option makes
    it re-render its preact tree. The shell keeps hover/popover state in React,
    so `board/calendar-surface.tsx` is `memo`-wrapped and every prop is a
    primitive, a `useMemo` value or a `useCallback`; the shell reads its live
    values through a ref. Measured: hovering an event mutates nothing under
    `.fc` (0 mutations), a config write mutates 44 nodes.
  - **`multiMonth` ≠ `multiMonthYear`.** The persisted name is `multiMonth`
    (calendar.md §4) but FullCalendar's `multiMonth` view draws _one_ month in
    the multi-month layout; the 12-month overview is `multiMonthYear`. The
    mapping is `toFullCalendarView` / `fromFullCalendarView` in
    `core/config.ts`, and `headerToolbar` stores the mapped name.
  - **A Radix `asChild` anchor must be a real DOM element.** The event tooltip /
    popover anchor to an invisible fixed `<span>` (an event is not a React
    node); wrapping that span in a component that does not forward the ref makes
    Floating UI measure `null` and render the panel at the viewport origin
    (measured: the 打开记录 button sat at `y = -157` and could not be clicked).
  - **`end` is exclusive; a date cell's end is the last day.** The ±1 day
    conversion lives only in `core/schema.ts`'s `rangeToCells`, and a one-day
    range writes `null` (not the start date twice) so 单日 and 两日 stay
    distinguishable downstream.
  - **`initialView` is read once.** `config.defaultView` is applied with
    `api.changeView`, and `datesSet` writes the view the user picked in
    FullCalendar's own header back into the config — no remount (which would
    lose the date the user navigated to) and no loop.
  - Also: the locale is **only** `zh-CN` (the shipped pack) or `en` (core);
    anything else falls back to `zh-CN`, because an unregistered locale code
    makes FullCalendar throw while building the initial view.
- **The record surface has four load-bearing rules** (verified in a real browser):
  - **The shell owns the _menu_; the host owns the _page_.** `DataViewRoot` renders
    exactly one `<RecordMenuAtPoint>` and provides `shared/record-actions.tsx`'s
    callbacks, while `openRecord` only reports upward (`onOpenRecord(rowId, options)`)
    and the host node-content renders `<RecordEditor>` from the props it already
    has. A view therefore never mounts its own record page, the editor never lands
    in a lazy view chunk, and "click a record" means the same thing in every view
    even though the page lives in `packages/ui`. (Passing `onOpenRecord` was once a
    notification _alongside_ a built-in sheet; the sheet has since moved out, so a
    host that omits the prop simply gets no page.)
  - **The page is a column of the host's box, never a viewport sheet.** It is
    `absolute inset-y-0 right-0` + a scrim inside a `relative` host box, and the
    host marks the covered view `inert` — a node-content is mounted both full-screen
    and inside the node editor's dialog window (and full-screen can have the
    attributes sidebar next to it), so a hand-rolled viewport-fixed drawer spilled
    out of the window it belonged to. `packages/ui/src/components/ui/sheet.tsx`
    wraps its own `SheetPortal` (no `container` prop), which is why the page is
    plain layout instead of a `Sheet`.
  - **Escape must be captured on `window`, not `document`.** Radix's dialog
    dismissal listens for Escape with a **capture** listener on `document`; a page
    that listens there (or in the bubble phase) closes _the host dialog too_, and
    `stopPropagation` cannot stop a sibling listener on the same node. Capturing on
    `window` runs first in the event path and can stop it — but only when the page
    owns the focus: a nested portaled layer (日期 popover / dropdown / 字段编辑
    dialog) is outside the page's DOM and keeps its own Escape. The 字段编辑 form is
    a real modal and stays portaled and viewport-centred.
  - **`hiddenFieldIds` means "fields this view does NOT show"**, not the reverse.
    The editor renders those inside the collapsed 隐藏字段 block (table → hidden
    columns, kanban → anything outside title/group/card fields, calendar → outside
    the mapped/tooltip fields, gallery → outside title/card fields).
  - **A Radix trigger needs a native element _inside_ the record.** The kanban
    wraps its body div _inside_ `KanbanItemHandle` (the vendored `KanbanItem` is
    not `forwardRef`), and the gallery wraps its card div. Wrapping the outer
    library component drops the composed ref.
  - **A library-rendered record cannot be wrapped at all.** FullCalendar's events
    are not React nodes and the browser's `contextmenu` target is the library's
    own `<a class="fc-event">` (measured: a right-click over
    `.fc-event-main-frame` reports `A.fc-event`), so a `<RecordContextMenu>` in
    `eventContent` never fires. The calendar instead attaches a native listener in
    `eventDidMount` and calls `openRecordMenu(point, rowId)`; the shell renders
    `RecordMenuAtPoint` (a controlled `DropdownMenu` over a 1×1 fixed anchor)
    there. Do not "simplify" this back into `eventContent`.
- **The gallery is a DOM card wall, and eight of its rules are load-bearing** (all
  verified in a real browser; see `docs/dataview/gallery.md` §0):
  - **The virtual window needs a fixed row height**, and it is the same number in
    two places: `useGalleryScroll` divides `scrollTop` by it and `gridAutoRows`
    lays the cards out with it. The card root must be `h-full` — otherwise the
    mounted slice and the scrollbar disagree.
  - **The 瀑布流 sentinel is conditionally rendered, so its observer is attached
    from a callback ref.** An effect keyed on the data runs while the sentinel
    does not exist yet (the 网格 branch) and never re-runs when the layout
    switches: the wall froze at its first page (measured 40 → 40 at 5000 rows).
  - **A card's controls are overlay layers** — the full-card open button at
    `absolute inset-0 z-0`, the checkbox and card menu as `z-10` siblings — which
    is what keeps "tick the checkbox" from also opening the record.
  - **`NodePreviewCover` drags `@workspace/api-client` into this package's
    typecheck** (via `@workspace/ui`, for `resolveFileUrl`), so
    `packages/dataview/tsconfig.json` mirrors ui's `paths` for api-client _and_
    its backend deps — without them `tsc` reports "cannot find
    `@workspace/adapter-front`" from inside api-client. Import the cover by its own
    path, not the `preview-block` barrel, to keep the hover panel (and hls.js)
    out of the gallery chunk.
  - **There is no selection control on a card and none in the toolbar.** The
    gallery's 勾选框 and its "…" button were both removed: the whole card is the
    record (click opens, right-click opens the menu), selection is a gesture
    (`Space` / Ctrl-click / Shift-range / `Ctrl+A` / `Escape`) shown by the card's
    own `--primary` border, and the one bulk action that needs a surface
    (删除选中) is an item on the selected card's right-click menu. That is the same
    rule that removed 删除 N 行 from the table's toolbar and 批量操作 from the
    gallery's: a control that appears or resizes with the selection drags the
    right-anchored function group around.
  - **瀑布流 is `i % columns` column stacks, not CSS `column-count`** (multicol
    fills column by column, so the second card on screen was the eighth row and
    the next card was never the one beside it). Each cover also takes the image's
    own measured ratio (4:5–16:9); without that a uniform-cover wall degenerates
    into a grid again.
  - **Keyboard focus is retried, not awaited.** The target card usually does not
    exist yet, so `use-gallery-focus.ts`'s effect deliberately has **no
    dependency array**: the first pass only asks the board to mount the row
    (`ensureIndexMounted`), and that remount re-runs it. With `[activeIndex]` it
    never re-runs and focus silently never lands.
  - **A Shift+arrow anchor is the card focused _before_ the move** — falling back
    to the target makes the first Shift+→ select one card instead of two.
  - **The column count is measured, never configured.** `fitColumnCount` reads the
    pane width and the card size's minimum tile width; there is no `columns`
    config key any more. `shared/card-ops.ts`'s `readCardSettings` is the config's
    migration boundary: a pre-redesign config's `badgeFields` + `metaFields` are
    concatenated into `cardFields`, and `columns` / `virtualized` /
    `showEmptyCover` / `selectable` are simply ignored (the wall is always
    responsive, always windowed, always draws a placeholder, and always
    selectable).
  - **The gallery has no export.** `core/export.ts` was deleted with the toolbar's
    导出 menu: the wall has no function of its own, and export belongs to the
    table (`vtable-export`). Reinstating it means reinstating a right-group control
    whose label carries a count — see the fixed-size rule above.
  - **`SettingsPanel` triggers are neutral.** There is no `active` prop any more; a
    tinted trigger made the user guess what the tint meant, and every panel's
    content already states what is set. An engaged _setting_ is still `--primary`
    (a checked switch, an active filter chip) — the removal is only about the
    trigger chrome.

- **The card unification was verified in a browser too** (41 + 20 + 4 checks, 0
  console errors): the gallery/kanban card body and its toolbar layout, the shared
  卡片配置 (the 标题 / 封面 config items writing through and the cards re-rendering,
  the eye round-tripping through the
  config, drag reordering both the list and the cards' chips, 展示模式, 新增字段
  landing on the cards), the kanban cover field, and the calendar's 字段配置
  (设为结束日期 / 设为标题 changing the rendered event titles, months navigated with
  `.fc-prev-button`). It also caught the `ScrollArea` overlap documented above.
- Test infrastructure: **none**, consistent with the rest of the monorepo. The
  table view was verified by driving a temporary `apps/web` page with headless
  Chromium over CDP (`ListTable` exposes itself as `canvas.__vtable__`), the
  kanban the same way (drag, menu move, new card, lane rename/reorder/collapse,
  the panels, read-only and both guidance states, plus a switch back to the
  table), and the calendar the same way (all five views, drag/resize/框选/双击
  write-back, the click-to-open behaviour, hover tooltip, the panels, both theme
  modes, read-only and all three guidance states), and the gallery the same way
  (all three layouts, size/column changes, the virtual window over 5000 rows,
  瀑布流 paging and row-major order, Ctrl-click + Shift range, the whole keyboard
  set, the right-click menu, bulk delete, all three cover sources, read-only,
  clean console). **The record-surface
  refactor was verified the same way** (a temporary `apps/web` page with in-memory
  mock data, headless Chromium over CDP): 24 checks for the shell + all four views
  (record editor opens from a gallery card and a kanban card, the 隐藏字段 block
  expands, the shadcn `Calendar` opens from a date row and renders 35 day buttons,
  the `OptionPicker` opens on `查找或创建选项`, the record context menu carries the
  shared items plus the gallery-only 选择, and the calendar's right-click opens the
  same menu) and 8 more for the write paths (gallery 添加记录 appends a card, a
  text edit in the editor lands on the card, the kanban and table right-click menus
  carry their view-specific items, and 打开记录 in the table's VTable menu opens the
  editor) — all 32 passed with an empty console — not by an in-repo test suite. **Headless Chromium reports
  `hover: none`, and Tailwind compiles `group-hover:` inside
  `@media (hover: hover)`**, so launch it with
  `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`
  or every hover check fails for the wrong reason.
- **The toolbar/card slim-down was verified in the browser too** (the fifth round,
  23 checks on one temporary demo page, 0 console errors): the gallery/kanban/calendar
  toolbars render their remaining controls with **no tinted trigger** and nothing
  in the function group but 更多; the gallery no longer renders a 导出 button, a
  card checkbox or a card "…" button (`document.querySelectorAll` on the removed
  selectors returns 0); a right-click on a card still opens the full record menu
  with 选择 + 删除选中的 N 条 once the selection holds more than one card; the
  kanban still drags a card between lanes and still offers 移动到 through that
  menu; the calendar still drags an event to a new date, still creates a row by
  dragging across days, and opens the record editor on a click; and the kanban now
  shows its lane counts with `showCardCount` gone. Adding a field from 卡片配置 and
  the calendar's role items were re-checked as regression.
