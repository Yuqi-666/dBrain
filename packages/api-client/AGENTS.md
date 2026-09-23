# AGENTS.md - @workspace/api-client

**Generated:** 2026-04-26
**Purpose:** Frontend tRPC client for dBrain graph operations

## OVERVIEW

This package provides the typed tRPC client for frontend applications to communicate with `backend/adapter-front`. Uses React Query for state management and supports both HTTP (mutations/queries) and WebSocket (subscriptions) transport.

## WHERE TO LOOK

| What           | Location                       | Notes                              |
| -------------- | ------------------------------ | ---------------------------------- |
| Main exports   | `./src/index.ts`               | All public APIs                    |
| tRPC client    | `./src/trpc/client.ts`         | HTTP + WS split link               |
| React Provider | `./src/trpc/provider.tsx`      | TRPCProvider + QueryClientProvider |
| Graph hooks    | `./src/trpc/hooks/useGraph.ts` | Mutation + subscription hooks      |
| Subscriptions  | `./src/trpc/subscriptions.ts`  | useGraphSubscriptions              |
| File analysis  | `./src/file-analysis.ts`       | `analyzePdf(url)` → server-side PDF parsing + cover |

## ARCHITECTURE

```
apps/web ──────► @workspace/api-client ──────► backend/adapter-front
       │                  │
       │                  ├── trpc/client.ts      (HTTP batch + WS split)
       │                  ├── trpc/provider.tsx   (React context)
       │                  └── trpc/subscriptions.ts (real-time updates)
       │
       └────────────► @workspace/services (optimistic mutations + event handlers)
                              │
                              └── graph/*.service.ts (Node/Edge/View/NodeSemantic/EdgeSemantic/NodeTag)
```

## USAGE

### Provider Setup (once in app root)

```tsx
import {
  TRPCReactProvider,
  useGraphSubscriptions,
} from "@workspace/api-client";

function App() {
  useGraphSubscriptions(); // Enable real-time updates
  return <YourApp />;
}

<TRPCReactProvider>
  <App />
</TRPCReactProvider>;
```

### Mutations (optimistic updates with rollback)

```typescript
import { NodeService } from "@workspace/services";

// All operations are optimistic - store updates first, rollback on error
await NodeService.upsert(nodeData);
await NodeService.upsert(id, updates);
await NodeService.delete(id);
await NodeService.sync(); // full sync
await NodeService.sync([id]); // partial sync
```

### Direct tRPC (for custom hooks)

```typescript
import { trpc } from "@workspace/api-client";

const mutation = trpc.node.add.useMutation();
await mutation.mutateAsync(nodeData);
```

## IMPORTANT CONSTRAINTS

- **Server URL**: `ws://localhost:3001` (all operations: queries, mutations, subscriptions)
- **AppRouter type**: Imported from `@workspace/adapter-front`
- **Subscriptions**: Must be called inside React component context (hooks)
- **Services**: Optimistic mutations with rollback now live in `@workspace/services`

## CONVENTIONS

- All mutations return `{ success: true, data?: T }` on success
- All subscriptions receive typed events from `@workspace/interfaces`
- Subscription event handlers live in `@workspace/services/handler/graph-handler.ts`
- No Socket.io code remains - pure tRPC implementation

## DEVELOPMENT

```bash
pnpm --filter=@workspace/api-client typecheck  # Type check
pnpm --filter=@workspace/api-client lint       # Lint
```

## PACKAGE DEPENDENCIES

- `@trpc/client`, `@trpc/react-query`, `@trpc/server` - tRPC stack
- `@tanstack/react-query` - React Query v5
- `@workspace/interfaces` - Shared types
- `@workspace/store` - Zustand store for graph state
