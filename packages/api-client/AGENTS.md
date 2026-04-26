# AGENTS.md - @workspace/api-client

**Generated:** 2026-04-26
**Purpose:** Frontend tRPC client for dBrain graph operations

## OVERVIEW

This package provides the typed tRPC client for frontend applications to communicate with `backend/adapter-front`. Uses React Query for state management and supports both HTTP (mutations/queries) and WebSocket (subscriptions) transport.

## WHERE TO LOOK

| What | Location | Notes |
|------|----------|-------|
| Main exports | `./src/index.ts` | All public APIs |
| tRPC client | `./src/trpc/client.ts` | HTTP + WS split link |
| React Provider | `./src/trpc/provider.tsx` | TRPCProvider + QueryClientProvider |
| Graph hooks | `./src/trpc/hooks/useGraph.ts` | Mutation + subscription hooks |
| Subscriptions | `./src/trpc/subscriptions.ts` | useGraphSubscriptions |
| CQRS operations | `./src/cqrs/graph-cqrs.ts` | Optimistic updates + rollback |
| Store handlers | `./src/handler/graph-handler.ts` | Zustand store update callbacks |

## ARCHITECTURE

```
apps/web ──────► @workspace/api-client ──────► backend/adapter-front
                      │
                      ├── trpc/client.ts      (HTTP batch + WS split)
                      ├── trpc/provider.tsx   (React context)
                      ├── cqrs/graph-cqrs.ts (optimistic mutations)
                      └── trpc/subscriptions.ts (real-time updates)
```

## USAGE

### Provider Setup (once in app root)
```tsx
import { TRPCReactProvider, useGraphSubscriptions } from '@workspace/api-client';

function App() {
  useGraphSubscriptions(); // Enable real-time updates
  return <YourApp />;
}

<TRPCReactProvider>
  <App />
</TRPCReactProvider>
```

### Mutations (optimistic updates with rollback)
```typescript
import { GraphCQRS } from '@workspace/api-client';

// All operations are optimistic - store updates first, rollback on error
await GraphCQRS.addNode(nodeData);
await GraphCQRS.updateNode(id, updates);
await GraphCQRS.deleteNode(id);
await GraphCQRS.sync(query);
```

### Direct tRPC (for custom hooks)
```typescript
import { trpc } from '@workspace/api-client';

const mutation = trpc.node.add.useMutation();
await mutation.mutateAsync(nodeData);
```

## IMPORTANT CONSTRAINTS

- **Server URL**: `ws://localhost:3001` (WS) and `http://localhost:3001/trpc` (HTTP)
- **AppRouter type**: Imported from `@workspace/backend-adapter-front`
- **Subscriptions**: Must be called inside React component context (hooks)
- **CQRS**: All operations use optimistic updates with automatic rollback on failure

## CONVENTIONS

- All mutations return `{ success: true, data?: T }` on success
- All subscriptions receive typed events from `@workspace/interfaces`
- Store handlers in `handler/graph-handler.ts` update Zustand store directly
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
