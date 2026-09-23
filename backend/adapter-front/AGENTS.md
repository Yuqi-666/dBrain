# AGENTS.md - @workspace/backend-adapter-front

**Generated:** 2026-05-13
**Path:** backend/adapter-front
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

tRPC server adapter — handles frontend API requests via tRPC procedures and broadcasts real-time events via subscriptions. **Fully implemented** — calls application layer services, uses DI container, and bridges domain events to tRPC emitters.

## WHERE TO LOOK

| What | Location | Notes |
|------|----------|-------|
| AppRouter export | `./src/index.ts` | Exports type + createWSServer |
| DI Container | `./src/di/container.ts` | Singleton services + PocketBase init |
| Event Bridge | `./src/di/event-bridge.ts` | Domain Events → tRPC Emitters |
| tRPC Server | `./src/trpc/server.ts` | Context, emitters, protectedProcedure |
| WebSocket Server | `./src/trpc/ws-server.ts` | Standalone WS server factory |
| Root Router | `./src/trpc/router/index.ts` | Merges all sub-routers |
| Sub-Routers | `./src/trpc/router/*.ts` | Per-entity CRUD + subscriptions |

## ARCHITECTURE

```
Frontend (tRPC Client)
    ↓
adapter-front (tRPC Server)
    ├── protectedProcedure (auth middleware - ALL procedures require userId)
    ├── 14 tRPC emitters (for subscriptions)
    └── Routers → DI Container → Application Services
                                       ↓
                              Domain Events → InMemoryEventBus → EventBridge → Emitters
```

## INITIALIZATION

```typescript
import { AppContainer, createWSServer, createContext, appRouter } from '@workspace/adapter-front';

// 1. Initialize container (once at startup)
await AppContainer.initialize('http://127.0.0.1:8090');
// → Creates PocketBase client, repositories, services, event bus
// → Initializes event bridge (eventBus → emitters)

// 2. Start WebSocket server
const wsServer = createWSServer(3001, appRouter, createContext);
```

## PROCEDURES

Each entity router exposes:

| Procedure | Type | Description |
|-----------|------|-------------|
| `add` | mutation | Create via CommandService |
| `update` | mutation | Update via CommandService |
| `delete` | mutation | Delete via CommandService |
| `list` | query | Paginated list via QueryService |
| `getById` | query | Single entity via QueryService |
| `getPinned` | query | Pinned entities (node/view) |
| `getRecentlyUpdated` | query | Recently updated (node) |
| `onAdded` | subscription | Real-time add events |
| `onUpdated` | subscription | Real-time update events |
| `onDeleted` | subscription | Real-time delete events |

## Routers

| Router | Mutations | Queries | Subscriptions |
|--------|-----------|---------|---------------|
| `node.ts` | add, update, delete | list, getById, getPinned, getRecentlyUpdated | onAdded, onUpdated, onDeleted |
| `edge.ts` | add, update, delete | list, getById | onAdded, onUpdated, onDeleted |
| `view.ts` | add, update, delete | list, getById, getPinned | onAdded, onUpdated, onDeleted |
| `node-semantic.ts` | add, update, delete | list, getById, sync | onAdded, onUpdated, onDeleted |
| `edge-semantic.ts` | add, update, delete | list, getById, sync | onAdded, onUpdated, onDeleted |
| `file.ts` | analyzePdf | — | — |

## EVENT FLOW

```
Mutation → CommandService.save() → eventBus.publish() → EventBridge → Emitter.emit() → Client subscription
```

EventBridge maps 15 domain events to tRPC emitters:
- `NodeCreated/Updated/Deleted` → `node*Emitter`
- `EdgeCreated/Updated/Deleted` → `edge*Emitter`
- `NodeSemanticCreated/Updated/Deleted` → `nodeSemantic*Emitter`
- `EdgeSemanticCreated/Updated/Deleted` → `edgeSemantic*Emitter`
- `ViewCreated/Updated/Deleted` → `view*Emitter`

## CONVENTIONS

- **All procedures use protectedProcedure** — requires auth, throws UNAUTHORIZED if no userId
- **superjson transformer** for date/Map serialization
- **userId required** in command DTOs for audit/ownership
- **Self-loop validation** — Edge.create() throws on from===to, tRPC mutation catches and returns TRPCError(BAD_REQUEST)
- **Singleton services** via AppContainer

## DI CONTAINER

```typescript
const container = AppContainer.getInstance();

// Repositories (singletons)
container.nodeRepository
container.edgeRepository
container.viewRepository
container.nodeSemanticRepository
container.edgeSemanticRepository

// Command Services (publish to eventBus)
container.nodeCommandService
container.edgeCommandService
container.viewCommandService
container.semanticCommandService

// Query Services (read-only)
container.nodeQueryService
container.edgeQueryService
container.viewQueryService
container.semanticQueryService

// File analysis (server-side PDF parsing + cover storage)
container.fileCommandService
```

## DEVELOPMENT

```bash
cd backend/adapter-front && pnpm typecheck  # Type check
cd backend/adapter-front && pnpm lint       # Lint
```

Note: `@workspace/domain`, `@workspace/adapter-back`, `@workspace/application` and
`@workspace/infrastructure` **are** aliased in this package's `tsconfig.json`;
`pnpm typecheck` here reports 0 errors. (Historically the alias was missing and
type errors from the other backend packages leaked in — that is no longer the case.)

## WS SERVER

```typescript
import { createWSServer, closeWSServer } from '@workspace/adapter-front';

const server = createWSServer(3001, appRouter, createContext);
// To shutdown:
await closeWSServer(server);
```

## ANTI-PATTERNS

- **NOT** using Socket.io — pure tRPC with custom emitters
- **NOT** using built-in tRPC subscription broadcasting — custom in-memory emitters
- **NOT** direct emitter.emit() in mutations — go through CommandService → eventBus → EventBridge
- No user-based subscription filtering yet
- No rate limiting yet
