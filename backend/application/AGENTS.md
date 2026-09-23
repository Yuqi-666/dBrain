# PROJECT KNOWLEDGE BASE - backend/application

**Generated:** 2026-05-13
**Path:** backend/application
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Application layer implementing Command/Query pattern (CQRS). Orchestrates domain entities via repository interfaces, controls transactions, and publishes domain events.

## STRUCTURE

```
src/
├── commands/           # Write operations (CUD)
│   ├── node/
│   │   ├── command.ts      # CreateNodeCommand (9 types), UpdateNodeCommand, DeleteNodeCommand
│   │   └── node-command.service.ts
│   ├── edge/
│   │   ├── command.ts      # CreateEdgeCommand, UpdateEdgeCommand, DeleteEdgeCommand
│   │   └── edge-command.service.ts
│   ├── view/
│   │   ├── command.ts      # CreateViewCommand, UpdateViewCommand, DeleteViewCommand
│   │   └── view-command.service.ts
│   ├── semantic/
│       ├── command.ts      # Commands for NodeSemantic, EdgeSemantic, NodeTag
│       └── semantic-command.service.ts
│   └── file/
│       ├── command.ts      # AnalyzePdfCommand + AnalyzedPdfDTO
│       └── file-command.service.ts  # fetch blob → parse → store cover (via ports)
├── queries/            # Read operations
│   ├── node/
│   ├── edge/
│   ├── view/
│   └── semantic/
├── dto/                # Data transfer objects
│   ├── node.dto.ts         # 9 node DTOs as discriminated union (NodeDTO type)
│   ├── edge.dto.ts         # EdgeDTO + toEdgeDTO helper
│   ├── view.dto.ts         # ViewDTO
│   ├── semantic.dto.ts      # NodeSemanticDTO, EdgeSemanticDTO, NodeTagDTO
│   └── pagination.dto.ts    # PaginatedResultDTO<T>
└── index.ts            # Barrel export
```

## WHERE TO LOOK

| Task                     | Location              | Notes                                           |
| ------------------------ | --------------------- | ---------------------------------------------- |
| Node CUD                 | commands/node/        | 9 node types via discriminated union commands   |
| Edge CUD                 | commands/edge/        | Self-loop validation in Edge.create()           |
| View CUD                 | commands/view/        | VisualConfig factory methods                    |
| Semantic CUD             | commands/semantic/    | NodeSemantic, EdgeSemantic, NodeTag             |
| Uploaded-file analysis   | commands/file/        | `analyzePdf`: fetch blob → parse → store cover  |
| Node reads               | queries/node/         | Paginated list, getByIds, getPinned             |
| Edge reads               | queries/edge/         | findByNodeId, findByEndpoints                  |
| View reads               | queries/view/         | findByNodeId for filtered views                 |
| Semantic reads           | queries/semantic/     | 12 query methods for 3 semantic types           |
| DTOs                     | dto/*.ts              | Type-safe discriminated unions for nodes        |

## KEY PATTERNS

### Command Services
- Inject `INodeRepository` + `IEventBus` via constructor
- Validate input → create domain entity via factory → save → publish event → return DTO
- Domain event publishing: `{ eventType, aggregateId, metadata, data }`

### Query Services
- Inject repository via constructor
- Return `null` if entity not found
- Pagination via `PaginatedResultDTO<T>`
- Map domain entities to DTOs via `toXxxDTO()` helper

### Domain Value Objects (Factory Methods, NOT constructors)
```typescript
// CORRECT
EdgeType.hierarchy()
EdgeType.flow()
EdgeType.association()
EdgeType.interaction()
EdgeWeight.create(value)
NodeId.create(value)
ViewId.create(value)

// INCORRECT (private constructors)
new EdgeType(...)  // Error
```

### Node DTO Discriminated Union
```typescript
export type NodeDTO = TextNodeDTO | ImageNodeDTO | PdfNodeDTO | VideoNodeDTO |
                      AudioNodeDTO | WebpageNodeDTO | WebsiteNodeDTO |
                      CollectionNodeDTO | RichTextNodeDTO;
```

## CONVENTIONS

- Services depend on repository **interfaces** (not implementations)
- All entity state changes via entity methods (updateTitle, updateContent, etc.)
- Domain events published after successful save
- DTOs are plain interfaces (not classes) for JSON serialization
- Commands return DTOs, not entities (decouples layers)
- Use `as const` for literal types in discriminated unions

## ANTI-PATTERNS

- **NEVER** use `new EdgeType(...)` - constructors are private, use factory methods
- **NEVER** modify entity state directly — delegate to entity methods
- **NEVER** reference infrastructure directly — depend on interfaces only
- **NEVER** create side effects outside domain events
- **NEVER** use `unwrap()/expect()` on domain operations

## CONFIG

Path alias configured in `tsconfig.json`:
```json
"@workspace/domain": ["../domain/src"],
"@workspace/domain/*": ["../domain/src/*"]
```

TypeScript uses `verbatimModuleSyntax` - use `import type` for type-only imports.

## TESTING

No test infrastructure exists (no Jest/Vitest configs in JS/TS).

## NOTES

- Domain events: NodeCreated, NodeDeleted, EdgeCreated, EdgeDeleted, ViewCreated, ViewDeleted, NodeSemanticCreated, EdgeSemanticCreated, NodeTagCreated
- Self-loop validation: Edge.create() throws if from === to
- EdgeDirection: forward(), reverse(), bidirectional() factories
- ViewId uses string directly for repository queries
