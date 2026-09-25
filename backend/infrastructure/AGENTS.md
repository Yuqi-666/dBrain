# PROJECT KNOWLEDGE BASE - backend/infrastructure

**Generated:** 2026-05-13
**Path:** backend/infrastructure
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Infrastructure layer implementing DDD adapter pattern. Contains PocketBase repository implementations, entity mappers, and in-memory event bus. **Depends on domain layer** — imports domain interfaces and entities.

## STRUCTURE

```
src/
├── database/
│   ├── pocketbase-client.ts  # PocketBase SDK wrapper, singleton factory
│   └── mappers/             # Entity ↔ PocketBase record converters
│       ├── node.mapper.ts      # 9 node types
│       ├── edge.mapper.ts
│       ├── view.mapper.ts
│       ├── node-semantic.mapper.ts
│       ├── edge-semantic.mapper.ts
│       └── node-tag.mapper.ts
├── repositories/            # INodeRepository implementations (6 total)
│   ├── pocketbase-node.repository.ts
│   ├── pocketbase-edge.repository.ts
│   ├── pocketbase-view.repository.ts
│   ├── pocketbase-node-semantic.repository.ts
│   ├── pocketbase-edge-semantic.repository.ts
│   └── pocketbase-node-tag.repository.ts
├── event-bus/
│   └── in-memory-event-bus.ts  # IEventBus implementation
├── parsers/                 # IDocumentAnalyzer implementations
│   └── pdf-document-analyzer.ts  # pdfjs-dist + @napi-rs/canvas, Node-side
├── storage/                 # IFileStore implementations
│   └── pocketbase-file-store.ts  # blob download/upload against `files`
├── transcoders/             # IVideoTranscoder implementations
│   └── ffmpeg-video-transcoder.ts  # upload → HLS (ffmpeg/ffprobe child processes)
└── index.ts                # Barrel exports
```

## DEPENDENCIES

- **@workspace/domain** — imports repository interfaces, entities, value objects
- **pocketbase** — database SDK (npm package)
- **pdfjs-dist** + **@napi-rs/canvas** — PDF parsing and page rasterization, both
  loaded lazily by `parsers/pdf-document-analyzer.ts` and never touched at boot
- **ffmpeg** + **ffprobe** — **system binaries**, spawned by
  `transcoders/ffmpeg-video-transcoder.ts`; override with `FFMPEG_PATH` /
  `FFPROBE_PATH`. A server without them fails only the video transcode (the
  upload is kept and the player says the codec cannot be decoded)

## COMMANDS

```bash
cd backend/infrastructure && pnpm typecheck   # TypeScript check
cd backend/infrastructure && pnpm lint       # ESLint
cd backend/infrastructure && pnpm format     # Prettier format
```

## POCKETBASE CLIENT

```typescript
import { createPocketBaseClient, getPocketBaseClient } from '@workspace/infrastructure';

// Initialize (call once at app startup)
createPocketBaseClient({ url: 'http://127.0.0.1:8090' });

// Use in repositories
const pb = getPocketBaseClient();
pb.collection('nodes').getOne(id);
```

**Collections:**
- `nodes` — all 9 node types
- `edges` — graph relationships
- `views` — graph view configurations
- `node_semantics` — node semantic classifications
- `edge_semantics` — edge semantic classifications
- `node_tags` — node tags
- `files` — uploaded blobs (original documents, generated PDF covers, and HLS
  playlists/segments/posters), public rules,
  field `file` (required, maxSelect 1, maxSize 100 MB). Segments are served with
  `Accept-Ranges` and `Access-Control-Allow-Origin: *`, which is what lets
  hls.js read a playlist cross-origin from the web app

## CONVENTIONS

- **Repository singletons** — infrastructure creates instances, adapter-back factory manages singletons
- **Mappers** — static `toDomain()` and `toRecord()` methods for entity ↔ PocketBase conversion
- **Error handling** — use `pb.isClientResponseError()` to detect 404 for "not found" cases
- **Filter building** — use `pb.filter()` for safe string interpolation in queries

## POCKETBASE SDK PATTERNS

```typescript
// Get single record
const record = await pb.collection('nodes').getOne(id);

// Paginated list
const result = await pb.collection('nodes').getList(page, pageSize, {
  filter: pb.filter('title ~ {:search}', { search: term }),
  sort: '-created',
});

// Create
const record = await pb.collection('nodes').create(data);

// Update
const record = await pb.collection('nodes').update(id, data);

// Delete
await pb.collection('nodes').delete(id);
```

## ANTI-PATTERNS

- **NEVER** import infrastructure into domain (dependency inversion violation)
- **NEVER** hardcode PocketBase URL — use environment config
- **NEVER** use string concatenation for filters — use `pb.filter()`
