# @workspace/services

Service layer for dBrain graph operations. Provides model-scoped service objects
that encapsulate optimistic mutations and store synchronization on top of
`@workspace/api-client` (tRPC) and `@workspace/store` (Zustand).

## STRUCTURE

```
src/
├── index.ts          # Re-exports public API
└── graph/
    ├── index.ts      # Re-exports all graph services
    ├── node.service.ts
    ├── edge.service.ts
    ├── view.service.ts
    ├── node-semantic.service.ts
    ├── edge-semantic.service.ts
    └── node-tag.service.ts
```

Each model exposes three operations:

- `upsert(idOrEntity, updates?)` — create or update with optimistic store update + rollback on error
- `delete(id)` — optimistic delete + rollback on error
- `sync(ids?)` — pull latest from backend into the store (full list when `ids` omitted)

## USAGE

```typescript
import { NodeService, EdgeService } from "@workspace/services";

// Optimistic upsert (create or update)
await NodeService.upsert(node);
await NodeService.upsert(nodeId, { title: "New title" });

// Optimistic delete
await NodeService.delete(nodeId);

// Sync (load from backend)
await NodeService.sync();
await NodeService.sync([nodeId]);
```

## CONVENTIONS

- All services perform optimistic updates against `@workspace/store` first, then
  call the tRPC mutation, and roll back on failure.
- All `upsert` methods accept either an entity (create) or an `id` + `updates`
  (update).
- Sync methods accept an optional `ids` array; omit to fetch the full list.
