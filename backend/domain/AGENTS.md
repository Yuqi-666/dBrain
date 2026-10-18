# backend/domain/AGENTS.md

Scope: the `backend/domain` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package holds the model, the contracts, and the domain events.
It contains no input and output code.
It imports only `packages/interfaces` and `packages/utils`.

## Map

| Path | Content |
| --- | --- |
| `src/models/` | The entities and the value objects, grouped by aggregate |
| `src/models/node/` | The node entity and the ten node types |
| `src/models/filter/` | The filter value objects. They use `RuleGroupType` from `packages/utils`. |
| `src/repositories/` | One interface per aggregate: node, edge, view, semantic, dashboard, workspace, user |
| `src/ports/` | Outside effects: `IDocumentAnalyzer`, `IFileStore`, `IVideoTranscoder`, `IMediaAnalysisStore`, `IUploadSessionStore`, and `IStorageUsageReader` |
| `src/event-bus/` | `IEventBus` and `IDomainEvent` |

## Mechanisms

A repository interface describes how the application stores an aggregate.
The implementation belongs to `infrastructure`.

A port describes an outside effect that the domain cannot perform.
An example is `IDocumentAnalyzer` in `src/ports/document-analysis.ts`.

The event bus carries a domain event to a subscriber.
`src/event-bus/types.ts` defines the event shape.

## Rules

1. Add no input and output code here. No PocketBase type, no `fetch`, and no Node file call.
2. Add a repository interface for each new aggregate. Implement it in `infrastructure`.
3. Add a port when the domain needs an outside effect. Implement the port in `infrastructure`.
4. Keep an entity equal to the matching type in `packages/interfaces`. That package is the cross-boundary contract.
5. Keep a storage field name in an infrastructure mapper. Do not put a PocketBase field name in an entity.
6. Re-export a new module from `src/index.ts`. The barrel is hand-maintained.
