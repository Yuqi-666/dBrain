# PROJECT KNOWLEDGE BASE - backend/application

**Generated:** 2026-04-26
**Path:** backend/application
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Application layer with use cases and services. Orchestrates domain entities and orchestrates flow from adapters to domain.

## STRUCTURE

```
src/
├── use-cases/   # Business use case implementations
├── services/     # Application-level services
└── index.ts      # Public exports
```

## WHERE TO LOOK

| Task           | Location       | Notes                                   |
| -------------- | -------------- | --------------------------------------- |
| Use case impls | src/use-cases/ | Transaction scripts coordinating domain |
| Services       | src/services/  | Cross-cutting application logic         |
| Public API     | src/index.ts   | Entry point exports                     |

## CONVENTIONS

- Use cases depend on domain entities and repository interfaces
- One transaction = one use case (or one aggregate root modified)
- Cross-aggregate operations use domain events for eventual consistency
- No direct SQL or infrastructure imports — use repository interfaces

## ANTI-PATTERNS

- **NEVER** modify entity state directly — delegate to entity methods
- **NEVER** implement business logic in use cases — push to domain
- **NEVER** reference infrastructure directly — depend on interfaces only
- **NEVER** create side effects outside domain events
- No `unwrap()/expect()` on domain operations
