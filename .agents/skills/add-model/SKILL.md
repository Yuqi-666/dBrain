---
name: add-model
description: Complete 8-layer DDD pattern to add a new model (entity) to dBrain monorepo. Triggers when user wants to add a new domain model, create a new entity type, complete an incomplete model chain, or add backend for a model. Covers interfaces → store → api-client → domain → infrastructure → application → adapter-back → adapter-front.
---

# Add Model Skill

Documents the complete 8-layer DDD chain for adding a new model (e.g., NodeTag, Bookmark, etc.) to the dBrain monorepo.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (apps/web, apps/desktop)           │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 1: packages/interfaces     - TypeScript interfaces              │
│ Layer 2: packages/store         - Zustand state + mutations          │
│ Layer 3: packages/api-client     - CQRS + tRPC client + handlers     │
└─────────────────────────────────────────────────────────────────────┘
                               ↕
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (TypeScript DDD)                     │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 4: backend/domain         - Entities, VOs, repo interfaces     │
│ Layer 5: backend/infrastructure - PocketBase repo implementations    │
│ Layer 6: backend/application    - Command/Query services, DTOs      │
│ Layer 7: backend/adapter-back  - DAOs, factory (repo instantiation) │
│ Layer 8: backend/adapter-front - tRPC routers, DI, event bridge    │
└─────────────────────────────────────────────────────────────────────┘
```

## Naming Conventions

| Placeholder       | Example (NodeTag) | Example (Node) |
| ----------------- | ----------------- | -------------- |
| `{ModelName}`     | `NodeTag`         | `Node`         |
| `{modelName}`     | `nodeTag`         | `node`         |
| `{ModelName}Id`   | `TagId`           | `NodeId`       |
| `COLLECTION_NAME` | `node_tags`       | `nodes`        |

---

## Layer 1: `packages/interfaces/src/models/{model}/`

**Purpose:** Shared TypeScript interfaces consumed by frontend and backend.

### Files to Create/Modify

| File        | Contents                                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| `base.ts`   | `{ModelName} = { id: {ModelName}Id; ...fields }`, `{ModelName}Id = string`    |
| `events.ts` | `{ModelName}AddedEvent`, `{ModelName}UpdatedEvent`, `{ModelName}DeletedEvent` |
| `index.ts`  | Re-export all                                                                 |

### Example (`base.ts`)

```typescript
export type NodeTagId = string;
export interface NodeTag {
  id: NodeTagId;
  name: string;
  color?: string;
}
```

### Example (`events.ts`)

```typescript
export interface NodeTagAddedEvent {
  eventType: "NodeTagAdded";
  aggregateId: string;
  metadata: { occurredAt: string; eventVersion: 1 };
  data: { nodeTag: NodeTag };
}
```

---

## Layer 2: `packages/store/src/`

**Purpose:** Zustand v5 state management with optimistic mutations.

### File: `graphStore.ts`

| Pattern            | Implementation                                                                    |
| ------------------ | --------------------------------------------------------------------------------- |
| **State**          | Add `{modelName}s: Map<{ModelName}Id, {ModelName}>`                               |
| **Mutations**      | Add `add{ModelName}`, `update{ModelName}`, `delete{ModelName}`, `set{ModelName}s` |
| **Getters**        | Add `get{ModelName}`, `getAll{ModelName}s`                                        |
| **Mutation Queue** | Add `{ type: "add{ModelName}"; payload: {ModelName} }` to `latestMutations`       |
| **syncFromServer** | Add `{modelName}s` to `ServerSyncPayload` in `syncFromServer()`                   |

### Example (add to state interface)

```typescript
interface GraphStore {
  // ... existing
  nodeTags: Map<NodeTagId, NodeTag>;
  // ... existing
}
```

### Example (add to actions)

```typescript
addNodeTag(tag: NodeTag): void {
  set((state) => { state.nodeTags.set(tag.id, tag); });
  set((state) => { state.latestMutations.push({ type: "addNodeTag", payload: tag }); });
},
```

---

## Layer 3: `packages/api-client/src/`

### 3a. CQRS — `cqrs/graph-cqrs.ts`

**Pattern:** Optimistic update → tRPC call → rollback on error

```typescript
async add{modelName}(item: {ModelName}): Promise<void> {
  const store = useGraphStore.getState();
  store.add{modelName}(item);
  try {
    await trpcClient.{modelName}.add.mutate(item);
  } catch (error) {
    store.delete{modelName}(item.id);
    throw error;
  }
}
```

### 3b. Handlers — `handler/graph-handler.ts`

```typescript
export function handle{modelName}Added(data: {ModelName}AddedEvent["data"]): void {
  useGraphStore.getState().add{modelName}(data.{modelName});
}
```

### 3c. Hooks — `trpc/hooks/useGraph.ts`

```typescript
export const useAdd{modelName} = () => trpc.{modelName}.add.useMutation();
export const use{modelName}Added = (onData: (data: {ModelName}) => void) => {
  return trpc.{modelName}.onAdded.useSubscription({}, {
    onData: (event) => onData(event.{modelName}),
  });
};
```

### 3d. Subscriptions — `trpc/subscriptions.ts`

```typescript
export function useGraphSubscriptions(): void {
  // ... existing
  trpc.{modelName}.onAdded.useSubscription({}, {
    onData: (event) => handle{modelName}Added(event.data),
  });
  trpc.{modelName}.onUpdated.useSubscription({}, {
    onData: (event) => handle{modelName}Updated(event.data),
  });
  trpc.{modelName}.onDeleted.useSubscription({}, {
    onData: (event) => handle{modelName}Deleted(event.data),
  });
}
```

---

## Layer 4: `backend/domain/src/`

### 4a. Entity — `models/{model}/entities.ts`

```typescript
export class {ModelName} {
  private constructor(
    private readonly _id: {ModelName}Id,
    private readonly _name: string,
    private readonly _color?: string,
  ) {}

  static create(props: {
    id: {ModelName}Id;
    name: string;
    color?: string;
  }): {ModelName} {
    return new {ModelName}(props.id, props.name, props.color);
  }

  get id(): {ModelName}Id { return this._id; }
  get name(): string { return this._name; }
  get color(): string | undefined { return this._color; }

  sameIdentityAs(other: {ModelName}): boolean {
    return this._id.equals(other._id);
  }

  update(props: Partial<{ name?: string; color?: string }>): {ModelName} {
    return new {ModelName}(
      this._id,
      props.name ?? this._name,
      props.color ?? this._color,
    );
  }
}
```

### 4b. Value Objects — `models/{model}/value-objects.ts`

```typescript
export class {ModelName}Id {
  private constructor(private readonly _value: string) {}
  static create(value: string): {ModelName}Id { return new {ModelName}Id(value); }
  get value(): string { return this._value; }
  equals(other: {ModelName}Id): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
}
```

### 4c. Domain Events — `models/{model}/events.ts`

```typescript
export interface {ModelName}CreatedData { id: string; name: string; color?: string; }
export interface {ModelName}UpdatedData { id: string; updates: Partial<{ name: string; color: string }>; }
export interface {ModelName}DeletedData { id: string; }

export type {ModelName}Created = IDomainEvent<{ModelName}CreatedData> & { eventType: "{ModelName}Created" };
export type {ModelName}Updated = IDomainEvent<{ModelName}UpdatedData> & { eventType: "{ModelName}Updated" };
export type {ModelName}Deleted = IDomainEvent<{ModelName}DeletedData> & { eventType: "{ModelName}Deleted" };
```

### 4d. Repository Interface — `repositories/index.ts`

```typescript
export interface I{ModelName}Repository {
  findById(id: {ModelName}Id): Promise<{ModelName} | null>;
  save({modelName}: {ModelName}): Promise<{ModelName}>;
  delete(id: {ModelName}Id): Promise<void>;
  findAll(): Promise<{ModelName}[]>;
  findByIds(ids: {ModelName}Id[]): Promise<{ModelName}[]>;
}
```

---

## Layer 5: `backend/infrastructure/src/`

### 5a. Repository Implementation — `repositories/pocketbase-{model}.repository.ts`

```typescript
const COLLECTION_NAME = "{model_name}s";

export class PocketBase{ModelName}Repository implements I{ModelName}Repository {
  private get collection() {
    return getPocketBaseClient().collection(COLLECTION_NAME);
  }

  async findById(id: {ModelName}Id): Promise<{ModelName} | null> {
    try {
      const record = await this.collection.getOne(id.value);
      return this.toDomain(record);
    } catch {
      return null;
    }
  }

  async save({modelName}: {ModelName}): Promise<{ModelName}> {
    const record = this.toRecord({modelName});
    const saved = await this.collection.save(record.id, record);
    return this.toDomain(saved);
  }

  async delete(id: {ModelName}Id): Promise<void> {
    await this.collection.delete(id.value);
  }

  async findAll(): Promise<{ModelName}[]> {
    const records = await this.collection.getFullList();
    return records.map((r) => this.toDomain(r));
  }

  async findByIds(ids: {ModelName}Id[]): Promise<{ModelName}[]> {
    const records = await this.collection.getList(1, ids.length, {
      filter: ids.map((id) => `id="${id.value}"`).join(" || "),
    });
    return records.items.map((r) => this.toDomain(r));
  }
}
```

### 5b. Mapper — `database/mappers/{model}.mapper.ts`

```typescript
export class {ModelName}Mapper {
  static toDomain(record: RecordModel): {ModelName} {
    return {ModelName}.create({
      id: {ModelName}Id.create(record.id),
      name: record.name,
      color: record.color,
    });
  }

  static toRecord(entity: {ModelName}): Record<string, unknown> {
    return {
      id: entity.id.value,
      name: entity.name,
      color: entity.color,
    };
  }
}
```

---

## Layer 6: `backend/application/src/`

### 6a. Commands — `commands/{model}/command.ts`

```typescript
export interface Create{ModelName}Command {
  id: string;
  name: string;
  color?: string;
}

export interface Update{ModelName}Command {
  id: string;
  name?: string;
  color?: string;
}

export interface Delete{ModelName}Command {
  id: string;
}
```

### 6b. Command Service — `commands/{model}/{model}-command.service.ts`

```typescript
export class {ModelName}CommandService {
  constructor(
    private readonly repository: I{ModelName}Repository,
    private readonly eventBus: IEventBus,
  ) {}

  async create(cmd: Create{ModelName}Command): Promise<{ModelName}DTO> {
    const entity = {ModelName}.create({
      id: {ModelName}Id.create(cmd.id),
      name: cmd.name,
      color: cmd.color,
    });
    const saved = await this.repository.save(entity);
    this.eventBus.publish({
      eventType: "{ModelName}Created",
      aggregateId: saved.id.value,
      metadata: { occurredAt: new Date().toISOString(), eventVersion: 1 },
      data: { id: saved.id.value, name: saved.name, color: saved.color },
    });
    return to{ModelName}DTO(saved);
  }

  async update(cmd: Update{ModelName}Command): Promise<{ModelName}DTO> {
    const existing = await this.repository.findById({ModelName}Id.create(cmd.id));
    if (!existing) throw new Error("{ModelName} not found");
    const updated = existing.update({ name: cmd.name, color: cmd.color });
    const saved = await this.repository.save(updated);
    return to{ModelName}DTO(saved);
  }

  async delete(cmd: Delete{ModelName}Command): Promise<void> {
    await this.repository.delete({ModelName}Id.create(cmd.id));
  }
}
```

### 6c. Queries — `queries/{model}/query.ts`

```typescript
export interface Get{ModelName}ByIdQuery { id: string; }
export interface List{ModelName}sQuery {}
export interface Get{ModelName}sByIdsQuery { ids: string[]; }
```

### 6d. Query Service — `queries/{model}/{model}-query.service.ts`

```typescript
export class {ModelName}QueryService {
  constructor(private readonly repository: I{ModelName}Repository) {}

  async getById(q: Get{ModelName}ByIdQuery): Promise<{ModelName}DTO | null> {
    const entity = await this.repository.findById({ModelName}Id.create(q.id));
    return entity ? to{ModelName}DTO(entity) : null;
  }

  async list(_q: List{ModelName}sQuery): Promise<{ModelName}DTO[]> {
    const entities = await this.repository.findAll();
    return entities.map(to{ModelName}DTO);
  }
}
```

### 6e. DTOs — `dto/{model}.dto.ts`

```typescript
export interface {ModelName}DTO {
  id: string;
  name: string;
  color?: string;
}

export function to{ModelName}DTO(entity: {ModelName}): {ModelName}DTO {
  return {
    id: entity.id.value,
    name: entity.name,
    color: entity.color,
  };
}
```

---

## Layer 7: `backend/adapter-back/src/`

### 7a. DAO (optional) — `dao/{model}.dao.ts`

Only if batch/extended queries beyond repository are needed.

### 7b. Factory — `factory.ts`

```typescript
let {modelName}Repository: I{ModelName}Repository | null = null;

export const create{ModelName}Repository = (): I{ModelName}Repository => {
  if (!{modelName}Repository) {
    {modelName}Repository = new PocketBase{ModelName}Repository(getPocketBaseClient());
  }
  return {modelName}Repository;
};
```

---

## Layer 8: `backend/adapter-front/src/`

### 8a. Emitters — `trpc/server.ts`

```typescript
export const {modelName}AddedEmitter = createEmitter<{
  {modelName}: {ModelName}DTO;
  userId: string;
  timestamp: number;
}>();

export const {modelName}UpdatedEmitter = createEmitter<{
  id: string;
  updates: Partial<{ModelName}DTO>;
  userId: string;
  timestamp: number;
}>();

export const {modelName}DeletedEmitter = createEmitter<{
  id: string;
  userId: string;
  timestamp: number;
}>();
```

### 8b. Event Bridge — `di/event-bridge.ts`

```typescript
const eventToEmitterMap = [
  // ... existing mappings
  { eventType: "{ModelName}Created", emitter: {modelName}AddedEmitter },
  { eventType: "{ModelName}Updated", emitter: {modelName}UpdatedEmitter },
  { eventType: "{ModelName}Deleted", emitter: {modelName}DeletedEmitter },
] as const;
```

### 8c. DI Container — `di/container.ts`

```typescript
readonly {modelName}Repository = create{ModelName}Repository();
readonly {modelName}CommandService = new {ModelName}CommandService(
  this.{modelName}Repository,
  this.eventBus,
);
readonly {modelName}QueryService = new {ModelName}QueryService(this.{modelName}Repository);
```

### 8d. tRPC Router — `trpc/router/{model}.ts`

```typescript
const addSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const {modelName}Router = router({
  add: protectedProcedure.input(addSchema).mutation(async ({ ctx, input }) => {
    return getContainer().{modelName}CommandService.create(input);
  }),

  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    return getContainer().{modelName}CommandService.update({
      id: input.id,
      ...input.updates,
    });
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await getContainer().{modelName}CommandService.delete({ id: input.id });
    return { success: true };
  }),

  list: protectedProcedure.query(async () => {
    return getContainer().{modelName}QueryService.list({});
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return getContainer().{modelName}QueryService.getById({ id: input.id });
    }),

  onAdded: protectedProcedure.subscription(({ ctx }) => {
    return observable<{modelName}: {ModelName}DTO; userId: string; timestamp: number }>((emit) => {
      const handler = (data: {modelName}: {ModelName}DTO; userId: string; timestamp: number) => emit.next(data);
      const unsubscribe = {modelName}AddedEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),

  onUpdated: protectedProcedure.subscription(...),
  onDeleted: protectedProcedure.subscription(...),
});
```

### 8e. Router Registration — `trpc/router/index.ts`

```typescript
import { nodeTagRouter } from "./node-tag";

export const appRouter = router({
  // ... existing
  nodeTag: nodeTagRouter,
});
```

---

## Critical Patterns Summary

| Pattern                | Where   | Key Point                                                  |
| ---------------------- | ------- | ---------------------------------------------------------- |
| **Immutable entities** | Layer 4 | `update()` returns new instance                            |
| **Upsert in repo**     | Layer 5 | Try update first, catch 404, then create                   |
| **Event publishing**   | Layer 6 | After successful save in command service                   |
| **Optimistic UI**      | Layer 3 | Store updates first, tRPC second, rollback on error        |
| **protectedProcedure** | Layer 8 | All tRPC procedures require userId                         |
| **Event flow**         | Layer 8 | Mutation → eventBus → EventBridge → Emitter → Subscription |

---
