# sourceId Trace Learnings

## Task: Add sourceId to tRPC Context

### Changes Made

**File:** `backend/adapter-front/src/trpc/server.ts`

1. Added `sourceId: string` to `Context` interface (line 12)
2. Updated `connectionParams` type to include optional `sourceId?: string` (line 25)
3. Added `sourceId` extraction in `createContext`: `sourceId: ctx.connectionParams?.sourceId ?? ""` (line 30)

### Verification

- `server.ts` passes LSP diagnostics with no errors
- Pre-existing error in `auth.ts` (unrelated to this change) — `Property 'token' does not exist on type '{ valid: boolean; user: User | null; }'`
- The AGENTS.md notes pre-existing monorepo type issues exist

### Pattern Observed

Connection params follow the pattern: `{ userId?: string; sourceId?: string }` — both are optional strings extracted at context creation time with fallback defaults (userId defaults to "dev-user", sourceId defaults to "").

---

## Task: Create sourceIdStore with ULID generation

### Changes Made

**File:** `packages/store/src/sourceIdStore.ts`

```typescript
import { create } from "zustand";
import { ulid } from "ulid";

export interface SourceIdStore {
  sourceId: string;
  getSourceId: () => string;
}

export const useSourceIdStore = create<SourceIdStore>()((set, get) => ({
  sourceId: ulid(),
  getSourceId: () => get().sourceId,
}));
```

### Key Pattern

- Uses Zustand v5 functional `create` API with `(set, get)` callback
- ULID generated once at initialization: `sourceId: ulid()`
- `getSourceId()` uses `get().sourceId` to return stored value
- No persistence (memory only, page refresh regenerates)
- No devtools middleware (not needed for simple state)

### Gotcha

- Do NOT use `useSourceIdStore.getState()` inside the initializer callback — causes circular reference TS7022 error
- Always use `get()` parameter from the create callback

### Verification

- `cd packages/store && pnpm typecheck` passes with no errors

---

## Task: Export sourceIdStore from index.ts

### Problem

T4 created `sourceIdStore.ts` but did not export it from `packages/store/src/index.ts`, preventing other packages from importing `useSourceIdStore`.

### Fix

**File:** `packages/store/src/index.ts`

Added line 12:
```typescript
export { useSourceIdStore } from "./sourceIdStore";
```

### Verification

- `cd packages/store && pnpm typecheck` passes with no errors

---

## Task: Inject sourceId into View command events

### Changes Made

**Files:**
- `backend/application/src/commands/view/command.ts`
- `backend/application/src/commands/view/view-command.service.ts`

**command.ts** — added `sourceId?: string` to all 3 command interfaces:
- `CreateViewCommand` (line 15)
- `UpdateViewCommand` (line 33)
- `DeleteViewCommand` (line 39)

**view-command.service.ts** — added `sourceId: cmd.sourceId` to metadata in all 3 eventBus.publish() calls:
- `ViewCreated` event (line 68)
- `ViewUpdated` event (line 125)
- `ViewDeleted` event (line 146)

### Verification

- `cd backend/application && pnpm typecheck` passes with no errors
- LSP diagnostics clean on both modified files

---

## Task: Inject sourceId into edge-command.service.ts events

### Changes Made

**Files:** `backend/application/src/commands/edge/command.ts`, `backend/application/src/commands/edge/edge-command.service.ts`

1. Added `sourceId?: string` to all three command interfaces:
   - `CreateEdgeCommand` (line 11)
   - `UpdateEdgeCommand` (line 20)
   - `DeleteEdgeCommand` (line 26)

2. Added `sourceId: cmd.sourceId` to metadata in all 3 eventBus.publish() calls:
   - `EdgeCreated` event (line 70)
   - `EdgeUpdated` event (line 127)
   - `EdgeDeleted` event (line 148)

### Verification

- `cd backend/application && pnpm typecheck` passes with no errors
- LSP diagnostics clean on both modified files

---

## Task: Inject sourceId into node-command.service.ts events

### Changes Made

**Files:** `backend/application/src/commands/node/command.ts`, `backend/application/src/commands/node/node-command.service.ts`

1. Added `sourceId?: string` to all 11 command interfaces:
   - `CreateTextNodeCommand` (line 15)
   - `CreateImageNodeCommand` (line 33)
   - `CreatePdfNodeCommand` (line 48)
   - `CreateVideoNodeCommand` (line 67)
   - `CreateAudioNodeCommand` (line 82)
   - `CreateWebpageNodeCommand` (line 95)
   - `CreateWebsiteNodeCommand` (line 108)
   - `CreateCollectionNodeCommand` (line 123)
   - `CreateRichTextNodeCommand` (line 136)
   - `UpdateNodeCommand` (line 160)
   - `DeleteNodeCommand` (line 165)

2. Added `sourceId: cmd.sourceId` to metadata in all 4 eventBus.publish() calls:
   - `NodeCreated` event (line ~261)
   - `NodeUpdated` event (line ~312)
   - `EdgeDeleted` events for associated edges (line ~372)
   - `NodeDeleted` event (line ~388)

### Verification

- `cd backend/application && pnpm typecheck` passes with no errors
- LSP diagnostics clean on both modified files

---

## Task: Inject sourceId into semantic-command.service.ts events

### Changes Made

**File:** `backend/application/src/commands/semantic/command.ts`

Added `sourceId?: string` to all 9 command interfaces:
- CreateNodeSemanticCommand, UpdateNodeSemanticCommand, DeleteNodeSemanticCommand
- CreateEdgeSemanticCommand, UpdateEdgeSemanticCommand, DeleteEdgeSemanticCommand
- CreateNodeTagCommand, UpdateNodeTagCommand, DeleteNodeTagCommand

**File:** `backend/application/src/commands/semantic/semantic-command.service.ts`

Added `sourceId: cmd.sourceId` to metadata in all 7 eventBus.publish() calls:
- NodeSemanticCreated (line 96)
- NodeSemanticUpdated (line 133)
- EdgeSemanticCreated (line 169)
- EdgeSemanticUpdated (line 206)
- NodeTagCreated (line 238)
- NodeTagUpdated (line 271)
- NodeTagDeleted (line 292)

### Verification

- `cd backend/application && pnpm typecheck` passes with no errors
- Grep confirms 7 instances of `sourceId: cmd.sourceId` in service file
- All 9 command interfaces verified with `sourceId?: string` in command.ts

---

## Task: Add sourceId to tRPC client getConnectionParams

### Changes Made

**File:** `packages/api-client/src/trpc/client.ts`

1. Added import: `import { useSourceIdStore } from "@workspace/store";` (line 3)
2. In `getConnectionParams()`, added `sourceId: useSourceIdStore.getState().getSourceId()` to return object (line 12)

### Verification

- LSP diagnostics clean on modified file (no errors)
- `getConnectionParams()` now returns `{ token, userId, sourceId }`
- Note: Pre-existing typecheck errors in other files (backend/adapter-front, src/auth/index.ts) - unrelated to this change

---

## Task: Pass sourceId from tRPC context to all command service calls

### Changes Made

**Files:** All tRPC router files that call command services

1. **node.ts** — added `sourceId: ctx.sourceId` to 3 mutations: add, update, delete
2. **edge.ts** — added `sourceId: ctx.sourceId` to 3 mutations: add, update, delete
3. **view.ts** — added `sourceId: ctx.sourceId` to 3 mutations: add, update, delete
4. **node-semantic.ts** — added `sourceId: ctx.sourceId` to 3 mutations: add, update, delete
5. **edge-semantic.ts** — added `sourceId: ctx.sourceId` to 3 mutations: add, update, delete
6. **node-tag.ts** — added `sourceId: ctx.sourceId` to 3 mutations: add, update, delete

### Verification

- All 6 router files pass LSP diagnostics (no errors)
- `cd backend/adapter-front && pnpm typecheck` passes (only pre-existing auth.ts error remains)
- 18 total command service calls updated across 6 files

### Pattern

Each command service call now includes both `userId: ctx.userId` and `sourceId: ctx.sourceId`.

---

## Task: Add sourceId filtering to frontend subscription

### Changes Made

**File:** `packages/api-client/src/trpc/subscriptions.ts`

1. Added `useSourceIdStore` to import from `@workspace/store` (line 23)
2. In `onData` callback, added sourceId filtering before userId filtering (lines 28-30):
   - Get `mySourceId` via `useSourceIdStore.getState().getSourceId()`
   - Extract `eventSourceId` from `(event as any).metadata?.sourceId`
   - If both exist and match, return early (skip event)

### Filtering Logic

```typescript
const mySourceId = useSourceIdStore.getState().getSourceId();
const eventSourceId = (event as any).metadata?.sourceId;
if (eventSourceId && eventSourceId === mySourceId) return;
```

### Backward Compatibility

- If `eventSourceId` is `undefined` or empty string, the condition `if (eventSourceId && ...)` is falsy and event processing continues
- This ensures events from other sources (or legacy events without sourceId) are still processed

### Verification

- LSP diagnostics clean on modified file (no errors)
- `pnpm typecheck` in api-client shows pre-existing errors in `backend/adapter-front` and `src/auth/index.ts` - unrelated to this change
