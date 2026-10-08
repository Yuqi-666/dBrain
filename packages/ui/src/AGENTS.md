# PROJECT KNOWLEDGE BASE - packages/ui/src

**Generated:** 2026-04-26
**Path:** packages/ui/src
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Shared UI component library for all dBrain applications. Combines shadcn/ui primitives with custom application-specific components. Largest UI package.

## STRUCTURE

```
components/
├── ui/              # Base shadcn components (DO NOT modify)
├── header/          # App headers (graph-header, editor-header)
├── preview-block/    # Node preview renderers (PreviewBlock hover panel +
│                     #   NodePreviewCover, the media-only cover the gallery reuses)
├── pdf-viewer/       # Self-drawn PDF viewer (pdfjs + TextLayer + find + rail);
│                     #   `<PdfViewer>` replaces the browser plugin in pdf nodes
├── annotation/       # Handwriting layer over a base surface: pure `geometry.ts`
│                     #   / `draw.ts` / `recognizer.ts`, the `annotation-canvas.tsx`
│                     #   pointer state machine, the toolbar and the layer
├── pan-zoom/         # The **shared viewport transform** (`transform.ts` pure
│                     #   maths, `use-pan-zoom.ts` controller) that keeps a base
│                     #   surface and the annotation layer on it pixel-identical,
│                     #   plus the host-agnostic `<PanZoomResetButton>`
├── video-player/     # HLS-aware <VideoPlayer> (hls.js, loaded lazily)
├── footer/          # App footers
└── *.tsx            # Custom components (KnowledgeGraph, etc.)
utils/
├── cn.ts            # Tailwind class merger (ALWAYS use this)
├── *.ts             # Other utilities
hooks/               # Component-specific React hooks
styles/
└── globals.css      # Global Tailwind styles
```

`components/ui/` currently ships: alert, badge, button, calendar, card, checkbox,
collapsible, command, context-menu, dialog, dropdown-menu, input, input-group,
label, popover, scroll-area, select, separator, sheet, sidebar, skeleton, slider,
switch, tabs, textarea, toggle, toggle-group, tooltip. `calendar` wraps
`react-day-picker` (the shadcn default) and is the date editor every dataview DOM
surface uses. All are built on the single `radix-ui`
package (not per-primitive `@radix-ui/react-*`), so a new primitive is a local
file importing `{ X as XPrimitive } from "radix-ui"`.

`globals.css` carries the Tailwind `@source` list. A workspace package reached
through a `node_modules` symlink is **not** auto-scanned, so its source must be
listed there (`@workspace/dataview` is) or every class used only by that package
silently disappears.

## WHERE TO LOOK

| Task              | Location                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base shadcn       | components/ui/            | Add custom variants, don't modify originals                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Custom components | components/\*.tsx         | App-specific UI (KnowledgeGraph, etc.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Header variants   | components/header/        | Graph and editor header bars                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Collection filter | components/dialog/        | `collection-filter-dialog.tsx` — the **collection node content's** 编辑过滤 dialog (节点多选 + 条件), opened from the control it passes into `DataViewRoot`'s `tabActions` slot (right end of the view tab strip); `node-selection-list.tsx` is the picker it shares with `view-dialog.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Preview blocks    | components/preview-block/ | Node content renderers; `NodePreviewCover` is the cover-only slice the dataview gallery imports by path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| PDF viewing       | components/pdf-viewer/    | `<PdfViewer>` — pdfjs on `<canvas>` + an invisible `TextLayer` (selection, `Ctrl/Cmd+F` search), eight layouts (垂直/水平 × 连续/翻页 × 单页/双页), thumbnails + outline rail, 下载/新标签页. Zoom keeps **two multipliers** on purpose — the page box follows a gesture while the canvas bitmap lags and is stretched (`pdfZoomRaster` in `types.ts` is the policy) — because re-painting pdfjs per wheel notch cancelled the render the notch before it had started; do not collapse them back into one. pdfjs is a **dynamic** import and each document builds its own worker; the toolbar is presentational (`PdfToolbarProps` in/out). `pdf-node-content.tsx` hosts it and keeps the old `<iframe>` for the failure path                                                                                                                                                                         |
| Annotation        | components/annotation/    | `<AnnotationLayer items onItemsChange getBaseRect panZoom />` over **any** base. Host-agnostic by contract: it never reads a store, never learns who its host is, and takes the base rectangle as a **transformed** viewport rect from `getBaseRect()`. Pure modules (`geometry.ts`, `draw.ts`, `recognizer.ts`) are exercised by `pnpm --filter=@workspace/ui test`; `use-annotation-input.ts` is the only pointer state machine and owns pen-vs-touch, palm rejection, pinch arbitration and the multi-finger taps. It is the **pointer target** for the whole host, so it is also where the host's viewport gestures are recognised                                                                                                                                                                                                                                                                |
| Viewport pan/zoom | components/pan-zoom/      | The one transform a host owns. `usePanZoom({ containerRef, getBounds })` → `{ transform, controller }`; paint the base with `transformToCss(transform)` + `transformOrigin: "0 0"` and hand the **same** controller to `<AnnotationLayer panZoom={controller} />`, which gets its rectangle from `applyTransform(bounds.content, transform, bounds.origin)`. Both surfaces then read the same four numbers, which is what makes "the ink stays on the photo" structural rather than coincidental. 恢复位置大小 has three entries: a single-finger double tap (recognised on the ink canvas), the host-rendered `<PanZoomResetButton {...panZoom} />` at the bottom centre (the desktop path — a mouse click is ink, so it cannot be a double click), and the layer's `0` key. `transform.test.ts` / `recognizer.test.ts` pin the maths; a pdf host reuses the module by supplying its own `getBounds` |
| Video playback    | components/video-player/  | `<VideoPlayer>` — HLS via hls.js, falls back to the progressive source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Code editing      | components/code-editor/   | Shared `CodeEditor` + `CODE_LANGUAGES` for any node type holding source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Class utility     | utils/cn.ts               | `cn()` for merging Tailwind classes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## CONVENTIONS

- **Named exports only** — no default exports
- **Always use `cn()`** from `@workspace/ui/utils/cn` for class merging
- **Filename = Component name** in PascalCase (e.g., `KnowledgeGraph.tsx`)
- **Props interfaces** extend native HTML element types
- **Tailwind v4 ordering**: base → layout → components → utilities
- **Dark mode** via `dark:` prefix only — no custom CSS color variables
- shadcn components in `components/ui/` are base — extend in custom components

## ANTI-PATTERNS

- **NEVER** inline custom CSS when Tailwind utility exists
- **NEVER** modify shadcn base components after adding — extend instead
- **NEVER** duplicate components — extend or compose
- **NEVER** forget `cn()` even when no conditional classes
- **NEVER** add third-party component libraries when shadcn can be extended
- No hardcoded colors — use CSS variables from theme
