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
├── preview-block/    # Node preview renderers
├── footer/          # App footers
└── *.tsx            # Custom components (KnowledgeGraph, etc.)
utils/
├── cn.ts            # Tailwind class merger (ALWAYS use this)
├── *.ts             # Other utilities
hooks/               # Component-specific React hooks
styles/
└── globals.css      # Global Tailwind styles
```

## WHERE TO LOOK

| Task              | Location                  | Notes                                       |
| ----------------- | ------------------------- | ------------------------------------------- |
| Base shadcn       | components/ui/            | Add custom variants, don't modify originals |
| Custom components | components/\*.tsx         | App-specific UI (KnowledgeGraph, etc.)      |
| Header variants   | components/header/        | Graph and editor header bars                |
| Preview blocks    | components/preview-block/ | Node content renderers                      |
| Code editing      | components/code-editor/   | Shared `CodeEditor` + `CODE_LANGUAGES` for any node type holding source |
| Class utility     | utils/cn.ts               | `cn()` for merging Tailwind classes         |

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
