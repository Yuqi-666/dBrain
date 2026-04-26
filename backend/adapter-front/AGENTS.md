# AGENTS.md - @workspace/backend-adapter-front

**Generated:** 2026-04-26
**Path:** backend/adapter-front
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

tRPC server adapter — handles frontend API requests via tRPC procedures and broadcasts real-time events via subscriptions. Currently a stub implementation (domain logic not yet implemented).

## WHERE TO LOOK

| What | Location | Notes |
|------|----------|-------|
| AppRouter export | `./src/index.ts` | Type export for frontend |
| tRPC server | `./src/trpc/server.ts` | Context, emitters, init |
| Root router | `./src/trpc/router/index.ts` | Merges all sub-routers |
| Sub-routers | `./src/trpc/router/*.ts` | Per-entity CRUD + subs |

## ARCHITECTURE

```
backend/adapter-front
├── tRPC Server (server.ts)
│   ├── Context (userId from auth)
│   ├── 14 event emitters (broadcast)
│   └── superjson transformer
└── Routers (5 entities × 8 procedures = 40 procedures)
    ├── node.ts          (add, update, delete, list, getById, sync + onAdded, onUpdated, onDeleted)
    ├── edge.ts
    ├── node-semantic.ts
    ├── edge-semantic.ts
    └── view.ts
```

## PROCEDURES

Each entity router exposes:

| Procedure | Type | Description |
|----------|------|-------------|
| `add` | mutation | Create new entity |
| `update` | mutation | Update entity |
| `delete` | mutation | Delete entity |
| `list` | query | List all (stubbed) |
| `getById` | query | Get by ID (stubbed) |
| `sync` | query | Sync data (stubbed) |
| `onAdded` | subscription | Real-time add events |
| `onUpdated` | subscription | Real-time update events |
| `onDeleted` | subscription | Real-time delete events |

## EVENT BROADCASTING

All mutations emit events via in-memory emitters (custom implementation):

```typescript
// Example: node mutation emits event
nodeAddedEmitter.emit({
  node,
  userId: ctx.userId,
  timestamp: Date.now(),
});
```

Subscriptions subscribe to these emitters to push events to connected clients.

## CONVENTIONS

- Context requires userId - throws UNAUTHORIZED if missing
- superjson transformer for date/Map serialization
- All mutations emit events after successful operation
- Subscriptions broadcast to all connected clients

## ANTI-PATTERNS

- **NOT** using Socket.io — pure tRPC with custom emitters
- **NOT** using built-in tRPC subscription broadcasting — custom in-memory emitters
- **NOT** implementing domain logic yet — stubs return mock data
- No user-based subscription filtering yet
- No rate limiting yet

## DEVELOPMENT

```bash
pnpm --filter=@workspace/backend-adapter-front typecheck  # Type check
pnpm --filter=@workspace/backend-adapter-front lint       # Lint
```

## WS SERVER SETUP (not yet wired)

To start WebSocket server:
```typescript
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });
applyWSSHandler({ wss, router: appRouter, createContext });
```
