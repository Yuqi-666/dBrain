# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-26
**Commit:** 5ead259
**Branch:** develop

## OVERVIEW

dBrain is a hybrid monorepo combining a Tauri desktop app + Next.js web frontend with a TypeScript backend. Uses Turborepo + pnpm for JS/TS. **The backend is TypeScript DDD layers, NOT Rust** — only the Tauri desktop app is Rust.

## STRUCTURE

```
dBrain/
├── apps/
│   ├── desktop/     # Tauri 2.x + Next.js (port 3001)
│   ├── web/         # Next.js 16 web app (port 3000)
│   ├── server/      # Placeholder (exports empty object)
│   └── docs/         # Symlink to /mnt/f/dbrain (external)
├── packages/        # Shared npm packages
│   ├── ui/          # shadcn/ui component library
│   ├── graph/       # @antv/g6-based visualization
│   ├── editor/      # Tiptap Pro rich text editor (Notion-like, with Yjs collab)
│   ├── interfaces/  # Type definitions & models
│   ├── store/       # Zustand v5 state management
│   ├── hooks/       # Custom React hooks
│   ├── api-client/  # API client
│   ├── utils/       # Utilities
│   ├── dev/         # Mock data for development
│   ├── eslint-config/# Flat ESLint configs
│   └── typescript-config/# Shared TS configs
├── backend/         # TypeScript DDD backend (NOT Rust)
│   ├── domain/      # Domain entities (no framework deps)
│   ├── application/ # Use cases, services
│   ├── infrastructure/# Repositories, external APIs
│   ├── adapter-back/# REST API adapter
│   ├── adapter-front/# Frontend adapter
│   └── adapter-tauri/# Tauri IPC adapter
└── crates/          # ⚠️ DOES NOT EXIST — see backend/
```

## WHERE TO LOOK

| Task                 | Location                   | Notes                                |
| -------------------- | -------------------------- | ------------------------------------ |
| UI components        | packages/ui/src/components | shadcn/ui + custom                   |
| Graph visualization  | packages/graph/src         | @antv/g6                             |
| **Rich text editor** | packages/editor/           | Tiptap Pro + Yjs, Notion-like editor |
| Type definitions     | packages/interfaces/src    | Models, nodes, API types             |
| State management     | packages/store/src         | Zustand stores                       |
| Desktop app          | apps/desktop/src           | Tauri + Next.js                      |
| Web app              | apps/web/src               | Next.js 16, React 19                 |

## CODE MAP (TypeScript Backend DDD)

```
backend/domain/       → entities, value objects (no framework deps)
backend/application/  → use cases, services
backend/infrastructure/ → repositories, external APIs
backend/adapter-back/ → REST API adapter
backend/adapter-front/ → Frontend adapter
backend/adapter-tauri/ → Tauri IPC adapter
```

**Rust code ONLY exists in:** `apps/desktop/src-tauri/` (Cargo.toml exists there, not in backend/)

## CONVENTIONS

- **Package scope:** `@workspace/*` (not `@repo/*`)
- **ESLint:** Flat config, `eslint-plugin-only-warn` (errors→warnings)
- **TS:** `strict: true`, `verbatimModuleSyntax: true`, `alwaysStrict: false`
- **Rust:** Edition 2024 (except Tauri uses 2021)
- **No root Cargo.toml** - each crate is standalone
- **Format:** Prettier (no .editorconfig)

## ANTI-PATTERNS (THIS PROJECT)

- NO test infrastructure for JS/TS (no Jest/Vitest configs)
- NO CI/CD checked in (no GitHub Actions, no Dockerfile)
- NO `__tests__` or `*.test.*` files in JS/TS
- `docs/` is symlinked to external path - may cause tooling issues
- `@workspace/*` path aliases in apps/web point to node_modules (unusual)

## UNIQUE STYLES

- Hybrid TypeScript+Rust monorepo (TypeScript backend DDD + Tauri desktop app)
- Clean architecture applied to TypeScript backend layers
- Tailwind CSS v4 with shadcn/ui
- Uses Zustand v5 for state, React 19, Next.js 16

## COMMANDS

```bash
pnpm build      # Build all via turbo
pnpm dev        # Dev all via turbo
pnpm lint       # Lint all
pnpm format     # Prettier format
pnpm check-types # TypeScript check all

# Individual apps
pnpm --filter=web dev      # Web app (port 3000)
pnpm --filter=desktop dev  # Desktop app (port 3001)
pnpm --filter=desktop tauri # Tauri CLI
```

## NOTES

- Desktop app uses Tauri 2.x with Next.js frontend
- Graph package uses @antv/g6 for node graph visualization
- No actual Rust backend — backend is TypeScript DDD layers
- ⚠️ `crates/` directory does not exist — backend code is in `backend/`
