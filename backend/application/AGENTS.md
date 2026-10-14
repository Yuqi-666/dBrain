# backend/application/AGENTS.md

Scope: the `backend/application` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package holds the use cases.
A command changes state. A query reads state.
Both return a DTO.
The package imports `domain` and `interfaces` only.

## Map

| Path | Content |
| --- | --- |
| `src/commands/` | One directory per aggregate: node, edge, view, semantic, file, upload, workspace, dashboard |
| `src/queries/` | The read side for node, edge, view, semantic, workspace, and dashboard |
| `src/dto/` | The DTO types and the mappers, for example `node-dto.mapper.ts` |

Each area follows one pattern.
`command.ts` declares the input shape.
`*-command.service.ts` holds the logic.
The query side uses the same pattern.

## Mechanisms

A service receives a repository interface from `domain`.
It never imports `infrastructure` and never touches PocketBase.

A DTO mapper in `src/dto/` converts a domain model to the shape that the client receives.
The mapper owns that translation, not the router.

Examples: `NodeCommandService` in `src/commands/node/node-command.service.ts` and `CreateNodeCommand` in `src/commands/node/command.ts`.

## Rules

1. Depend on a `domain` interface. Do not import `infrastructure`.
2. Add a command and a query pair for a new resource.
3. Keep the client shape in `src/dto/`. Do not build a response inside a router.
4. Keep the validation in the router or in the command input. Do not validate inside a repository.
5. Re-export a new module from `src/index.ts`. The barrel is hand-maintained and lists each file.
