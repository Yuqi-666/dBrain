# PROJECT KNOWLEDGE BASE - @workspace/graph

**Generated:** 2026-04-22
**Path:** packages/graph/src

## OVERVIEW

Graph visualization package built on @antv/g6 that renders interactive knowledge graphs and node networks for dBrain.

## STRUCTURE

```
src/
├── custom-nodes/    # Custom G6 node implementations
├── options/         # G6 configuration (layout, behaviors, theme, etc.)
├── graph.tsx        # Main graph component React wrapper
├── index.ts         # Public API entry point
├── transform.ts     # Data transformation from domain models to G6 format
├── types.ts         # Local TypeScript type definitions
```

## WHERE TO LOOK

| Task                 | Location      | Notes                                                        |
| -------------------- | ------------- | ------------------------------------------------------------ |
| Custom node types    | custom-nodes/ | Add new node shapes and content renderers here               |
| Graph configuration  | options/      | Adjust layout algorithms, interactions, theming, and plugins |
| Main graph component | graph.tsx     | Top-level React component that manages graph lifecycle       |
| Data conversion      | transform.ts  | Maps domain knowledge models to G6-compatible graph data     |

## CONVENTIONS

- All custom nodes implement G6's Node API with React-based rendering for rich content
- Configuration is split by concern to keep files small and focused under options/
- Only export public types and components from index.ts, keep internal APIs module-scoped
- Import and reuse shared domain types from @workspace/interfaces
- Depends on @workspace/store for graph state and @workspace/ui for design tokens

## ANTI-PATTERNS

- Don't hardcode colors or dimensions - use CSS variables from the shared @workspace/ui theme
- Avoid modifying raw domain data during transformation - return new G6-compatible objects
- Don't include large static assets directly in this package - reference from app-level public folders
- Don't duplicate type definitions that already exist in @workspace/interfaces
