# PROJECT KNOWLEDGE BASE - backend/adapter-back

**Generated:** 2026-05-13
**Path:** backend/adapter-back
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Adapter-back layer providing DAO wrappers and dependency injection factory for the backend. Acts as the entry point for creating repository and DAO instances. **Depends on domain and infrastructure layers**.

## STRUCTURE

```
src/
├── dao/                    # Data Access Object wrappers
│   ├── node.dao.ts         # Extended node queries
│   ├── edge.dao.ts         # Extended edge queries
│   ├── view.dao.ts         # Extended view queries
│   └── index.ts            # Barrel export
├── factory.ts              # DI container (singleton repositories)
└── index.ts                # Barrel export
```

## DEPENDENCIES

- **@workspace/domain** — imports repository interfaces
- **@workspace/infrastructure** — imports repository implementations

## COMMANDS

```bash
cd backend/adapter-back && pnpm typecheck   # TypeScript check
cd backend/adapter-back && pnpm lint       # ESLint
cd backend/adapter-back && pnpm format     # Prettier format
```

## FACTORY USAGE

```typescript
import { createNodeRepository, createAll, createPocketBaseClient } from '@workspace/adapter-back';

// Initialize PocketBase first (one time)
createPocketBaseClient({ url: 'http://127.0.0.1:8090' });

// Get singleton repository
const nodeRepo = createNodeRepository();

// Get all repositories and DAOs
const { nodeRepository, edgeRepository, viewRepository, nodeDao, edgeDao, viewDao } = createAll();
```

## FACTORY FUNCTIONS

| Function | Returns | Pattern |
|----------|---------|---------|
| `createNodeRepository()` | `INodeRepository` | Singleton |
| `createEdgeRepository()` | `IEdgeRepository` | Singleton |
| `createViewRepository()` | `IViewRepository` | Singleton |
| `createNodeSemanticRepository()` | `INodeSemanticRepository` | Singleton |
| `createEdgeSemanticRepository()` | `IEdgeSemanticRepository` | Singleton |
| `createNodeTagRepository()` | `INodeTagRepository` | Singleton |
| `createNodeDao()` | `NodeDao` | New instance |
| `createEdgeDao()` | `EdgeDao` | New instance |
| `createViewDao()` | `ViewDao` | New instance |
| `createAll()` | Object with all above | Mixed |

## DAO VS REPOSITORY

**Repositories** — implement domain interfaces, handle persistence to PocketBase
**DAOs** — wrap repositories with additional convenience queries, batch operations

Example DAO methods beyond repository:
- `nodeDao.findByTitle(title)` — search nodes by title
- `nodeDao.findByTags(tagIds)` — find nodes with ANY of the tags
- `edgeDao.findWithWeightRange(min, max)` — weight-based query
- `viewDao.findContainingNodes(nodeIds)` — find views containing ANY of the nodes

## INITIALIZATION ORDER

```typescript
// 1. Create PocketBase client first
import { createPocketBaseClient } from '@workspace/infrastructure';
createPocketBaseClient({ url: 'http://127.0.0.1:8090' });

// 2. Then create repositories via factory
import { createNodeRepository } from '@workspace/adapter-back';
const nodeRepo = createNodeRepository();

// 3. Use repositories in application layer
import { createAll } from '@workspace/adapter-back';
const { nodeRepository, edgeRepository, viewRepository } = createAll();
```

## ANTI-PATTERNS

- **NEVER** create repository instances directly — use factory
- **NEVER** import infrastructure into domain (dependency inversion)
- **NEVER** create DAOs before PocketBase client is initialized
