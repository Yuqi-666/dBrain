# backend/infrastructure/AGENTS.md

Scope: the `backend/infrastructure` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package implements the ports of `domain`.
It owns every call to PocketBase, to FFmpeg, and to the PDF parser.
It imports `domain` and `interfaces`.

## Map

| Path | Content |
| --- | --- |
| `src/database/pocketbase-client.ts` | The single PocketBase SDK wrapper |
| `src/database/token-verifier.ts` | `verifyToken`, `refreshToken`, and `denylistToken` |
| `src/database/request-scope.ts` | The token and file scope for an async call |
| `src/database/mappers/` | Record-to-model and model-to-record conversion |
| `src/repositories/` | Ten `pocketbase-*` repository classes. Each one implements a `domain` interface. |
| `src/storage/` | The file store and the file address helper |
| `src/parsers/` | The PDF document analyzer |
| `src/transcoders/` | The FFmpeg video transcoder |
| `src/event-bus/` | The in-memory event bus |

## Mechanisms

`database/pocketbase-client.ts` wraps the SDK.
It disables automatic cancellation and adds the request token to each request through `beforeSend`.
`request-scope.ts` stores that token in `AsyncLocalStorage`.

`token-verifier.ts` verifies a token against PocketBase, caches the result, and keeps a logout denylist.

A mapper translates between a database record and a domain model.
It is the only place that knows a PocketBase field name.

`storage/file-address.ts` builds the one allowed file path, `/api/files/<collection>/<record>/<filename>`.
`storage/pocketbase-file-store.ts` uses a raw `fetch` for the bytes, because the SDK does not stream them.

The parser uses `pdfjs-dist` and `@napi-rs/canvas`.
The transcoder spawns FFmpeg.

## Rules

1. Implement an interface from `domain`. Do not invent a different shape.
2. Keep a PocketBase field name inside a mapper.
3. Use a raw `fetch` for file bytes only. Use the SDK wrapper for everything else.
4. Keep the request token in the request scope. Do not pass it through a module-level variable.
5. Remember that no transaction spans several records. Order a multi-record write and check each result.
6. Add a new export to `src/index.ts`. The barrel is hand-maintained.
7. Keep a heavy dependency out of a client bundle. `pdfjs-dist`, `@napi-rs/canvas`, and FFmpeg are server-only.
