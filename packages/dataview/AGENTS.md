# packages/dataview/AGENTS.md

Scope: the `packages/dataview` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package holds the data-view engine.
A caller mounts `DataViewRoot`, selects a view type, and reads or writes records through a source.
`apps/web`, `apps/desktop`, and `packages/ui` import it.

## Public surface

| Export | Content |
| --- | --- |
| `.` | `DataViewRoot` and the shared vocabulary |
| `./registry` | The view registry |
| `./source` | The source adapters and the renderer contracts |

## Map

| Path | Content |
| --- | --- |
| `src/data-view-root.tsx` | The composition root. It reads the registry and renders the active view. |
| `src/registry.ts` | The single place that declares a view type |
| `src/views/` | Seven view types: calendar, chart, gallery, gantt, graph, kanban, and table |
| `src/shared/` | The field, card, and record vocabulary that all views use |
| `src/source/` | Source adapters. `collection-source.ts` and `database-source.ts` read a node collection or database. `cell-resolver.ts` maps a column to a value. |
| `src/toolbar/` | The shared toolbar |
| `src/defaults.ts` | Default configurations |

## Mechanisms

`src/registry.ts` is the registry pattern for this package.
A view registers a renderer and an optional config editor.
`DataViewRoot` and the toolbars read the registry and never branch on `DataViewType` themselves.

A renderer loads through `React.lazy`.
A heavy library, for example VTable or FullCalendar, therefore loads only when the user opens that view.

A renderer is presentational.
It reports an edit through `onCellChange` and does not fetch data.

## Rules

1. Add a view type in `src/registry.ts` only. Touch `DataViewRoot` only when the contract changes.
2. Never branch on `DataViewType` outside the registry.
3. Keep data access inside `src/source/`. A renderer receives data and reports edits.
4. Keep a view's third-party library behind `React.lazy`, so the first paint stays small.
5. Note that the code comments cite sections of a README. The package has no README. Treat a citation as a stale reference.
