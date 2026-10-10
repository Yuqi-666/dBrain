# PROJECT KNOWLEDGE BASE - backend/domain

**Generated:** 2026-05-13
**Path:** backend/domain
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Domain layer implementing DDD clean architecture. Contains entities, value objects, domain events, and repository interfaces with **zero framework dependencies**.

## STRUCTURE

```
src/
├── event-bus/           # IDomainEvent, IEventBus (ports only, no impl)
├── models/
│   ├── node/           # Node entities + events + value objects
│   ├── edge/           # Edge, EdgeSemantic entities + events + value objects
│   ├── view/           # View entity + events + value objects (incl. ViewType)
│   ├── semantic/       # NodeSemantic, EdgeSemantic, NodeTag entities + events
│   ├── filter/         # FilterConfig value object
│   └── index.ts        # Re-exports all models
├── repositories/       # One <aggregate>.repository.ts per aggregate + index.ts barrel
│   ├── index.ts        # Re-exports every repository port
│   ├── node.repository.ts       # NodeQuery, INodeRepository
│   ├── edge.repository.ts       # EdgeQuery, IEdgeRepository
│   ├── view.repository.ts       # ViewQuery, IViewRepository
│   ├── semantic.repository.ts   # *Query + INodeSemantic/EdgeSemantic/NodeTagRepository
│   ├── user.repository.ts       # IUserRepository
│   ├── workspace.repository.ts  # IWorkspaceRepository, IWorkspaceMemberRepository
│   └── dashboard.repository.ts  # IDashboardRepository
├── ports/              # Non-repository ports
│   ├── document-analysis.ts  # IDocumentAnalyzer, IFileStore (+ their DTOs)
│   └── video-transcode.ts    # IVideoTranscoder (HLS packaging, + its DTOs)
└── index.ts            # Public exports: models, repositories, ports, event-bus
```

## WHERE TO LOOK

| Task                  | Location                   | Notes                                    |
| --------------------- | -------------------------- | ---------------------------------------- |
| Domain events         | models/\*/events.ts        | NodeCreated, NodeDeleted, EdgeCreated... |
| Entity definitions    | models/\*/entities.ts      | Business logic encapsulated              |
| Value objects         | models/\*/value-objects.ts | Immutable types (NodeId, Permission...)  |
| Repository interfaces | repositories/\*.repository.ts | Ports only — impls in infrastructure/; `index.ts` is a barrel |
| Non-repository ports  | ports/                     | IDocumentAnalyzer, IFileStore, IVideoTranscoder |
| Event bus interfaces  | event-bus/index.ts         | IDomainEvent, IEventBus                  |
| Public API            | src/index.ts               | Barrel export                            |

## COMMANDS

```bash
pnpm --filter=domain typecheck   # TypeScript check
pnpm --filter=domain lint       # ESLint
pnpm --filter=domain format     # Prettier format
```

## CONVENTIONS

- **No framework imports** — Domain must remain pure and framework-agnostic
- **Immutable patterns** — All entity update methods return new instances
- **Factory methods** — Use `static create()` instead of constructors
- **Value objects** — Immutable, with `equals()` method for equality
- **Entities** — Identity-based equality via `sameIdentityAs()` method
- **Domain events** — Interface-based (`IDomainEvent<T>`), minimal payload
- **Repository interfaces** — Defined in domain (ports), implemented in infrastructure (adapters)
- **Path aliases** — `@workspace/interfaces`, `@workspace/utils` available

## DOMAIN EVENTS

Events follow minimal interface pattern:

```typescript
// event-bus/index.ts
interface IDomainEvent<T = unknown> {
  readonly eventType: string;
  readonly aggregateId: string;
  readonly metadata: { occurredAt: string; eventVersion: 1 };
  readonly data: T;
}

// Example event in models/*/events.ts
export type NodeCreated = IDomainEvent<{
  id: string;
  nodeType: string;
  title: string;
}> & {
  eventType: "NodeCreated";
};
```

**Available events:**

| Entity | Events |
| ----------- | ------------------------------------------------------------------- |
| Node | `NodeCreated`, `NodeDeleted` |
| Edge | `EdgeCreated`, `EdgeDeleted` |
| View | `ViewCreated`, `ViewDeleted` |
| Semantic | `NodeSemanticCreated`, `EdgeSemanticCreated`, `NodeTagCreated` |

## ANTI-PATTERNS

- **NEVER** put infrastructure code (DB, HTTP, file I/O) in domain
- **NEVER** add setters — state changes only through entity methods
- **NEVER** implement repositories in domain — interfaces only
- **NEVER** use `unwrap()/expect()` — handle errors gracefully
- **NEVER** import framework packages (Prisma, Express, etc.) into domain
