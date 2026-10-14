# packages/graph/AGENTS.md

Scope: the `packages/graph` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package renders the knowledge graph.
It has two modes: a force layout and a flow layout.
`apps/web`, `apps/desktop`, and `packages/dataview` import it.

## Public surface

`src/index.ts` is the entry point.
It exports `Graph`, `ForceGraph`, `FlowGraph`, the shared types, the force transforms, `DEFAULT_FORCE_CONFIG`, and `useGraphEventHandler`.
Import from the entry point. Do not import a subpath.

## Map

| Path | Content |
| --- | --- |
| `src/graph.tsx` | The `Graph` wrapper. It owns the data subscription and the error boundary. |
| `src/types.ts` | The canonical shared types |
| `src/force/` | The force renderer, the transforms, the style config, and the event listener |
| `src/force/worker/` | The module worker. It holds the simulation, the canvas, and the PixiJS application. |
| `src/flow/` | The flow renderer |
| `src/eventHandler.ts` | The single bridge between the renderers and the caller |

## Mechanisms

The force simulation runs in a module worker.
`comlink` proxies the worker, so the caller uses async calls.
PixiJS renders inside the same worker through `pixi.js/webworker`.
The main thread keeps the DOM and the event handling.

`src/graph.tsx` sends data snapshots and diffs into the worker.
`src/eventHandler.ts` converts a worker event into a callback for the caller.

The flow mode is a separate renderer. The two modes share only `src/types.ts`.

## Ownership rules

These rules come from the header of `src/index.ts`.

- `src/types.ts` is the canonical home of a shared type.
- `src/force/*` and `src/flow/*` are private modules.
- `src/eventHandler.ts` is the only bridge layer.
- Re-export a type from the module that defines it. Do not re-export it from a module that only uses it.

## Rules

1. Keep the worker boundary. The worker cannot touch the DOM.
2. Put a new force-specific type in `src/force/types.ts`.
3. Add a new event to `src/eventHandler.ts`. Do not import a renderer into a feature package for this purpose.
