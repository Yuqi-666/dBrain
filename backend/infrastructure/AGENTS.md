# PROJECT KNOWLEDGE BASE - backend/infrastructure

**Generated:** 2026-04-26
**Path:** backend/infrastructure
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Infrastructure layer implementing repository interfaces and external service adapters. All database access and third-party integrations live here.

## STRUCTURE

```
src/
├── repositories/   # Repository implementations
├── external/       # External service clients
└── index.ts        # Public exports
```

## WHERE TO LOOK

| Task             | Location          | Notes                       |
| ---------------- | ----------------- | --------------------------- |
| Repo impls       | src/repositories/ | Concrete DB implementations |
| External clients | src/external/     | HTTP clients, MinIO, etc.   |
| Public API       | src/index.ts      | Entry point exports         |

## CONVENTIONS

- Implements repository interfaces defined in domain
- All user input via parameterized queries (no raw SQL concatenation)
- Secrets encrypted at rest (AES)
- All errors logged with context, never expose stack traces to clients

## ANTI-PATTERNS

- **NEVER** concatenate user input into SQL strings — use parameterized queries
- **NEVER** store plaintext passwords — bcrypt salted hash only
- **NEVER** store plaintext secrets — AES encryption required
- **NEVER** expose internal errors to API responses
- **NEVER** upload executable files — validate file types
- Migration scripts are append-only (never modify existing migrations)
