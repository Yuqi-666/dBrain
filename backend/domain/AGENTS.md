# PROJECT KNOWLEDGE BASE - backend/domain

**Generated:** 2026-04-26
**Path:** backend/domain
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Domain layer implementing DDD clean architecture. Contains entities and value objects with **zero framework dependencies**.

## STRUCTURE

```
src/
├── entities/     # Domain entities with business logic
├── value-objects/# Immutable value types
└── index.ts      # Public exports
```

## WHERE TO LOOK

| Task               | Location           | Notes                            |
| ------------------ | ------------------ | -------------------------------- |
| Entity definitions | src/entities/      | Business objects with ID, state  |
| Value objects      | src/value-objects/ | Immutable components             |
| Public API         | src/index.ts       | Only exports through entry point |

## CONVENTIONS

- **No framework imports** — Domain must remain pure and framework-agnostic
- All entities have UUID-based identity
- State changes via entity methods only — no direct property mutation
- Aggregates reference each other by ID only — no object references across aggregates
- Domain events created on state changes, immutable once created

## ANTI-PATTERNS

- **NEVER** put infrastructure code (DB, HTTP, file I/O) in domain
- **NEVER** add setters — state changes only through entity methods
- **NEVER** create repositories in domain — repository interfaces only
- **NEVER** use `unwrap()/expect()` — all errors must be handled gracefully
- No SQL, no HTTP clients, no file system access
