# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-22
**Commit:** 5ead259
**Branch:** develop

## OVERVIEW
dBrain is a hybrid monorepo combining a Tauri desktop app + Next.js web frontend with a Rust backend. Uses Turborepo + pnpm for JS/TS and clean architecture for Rust crates.

## STRUCTURE
```
dBrain/
├── apps/
│   ├── desktop/     # Tauri + Next.js desktop app (port 3001)
│   ├── web/         # Next.js web app (port 3000)
│   ├── server/      # Rust backend server
│   └── docs/        # Symlink to external docs
├── packages/        # Shared npm packages
│   ├── ui/          # shadcn/ui component library (largest)
│   ├── graph/       # @antv/g6-based visualization
│   ├── interfaces/  # Type definitions & models
│   ├── store/       # Zustand state management
│   ├── hooks/       # Custom React hooks
│   ├── api-client/  # API client
│   ├── utils/       # Utilities
│   ├── dev/         # MOCK data for development
│   ├── eslint-config/# Shared ESLint configs (flat format)
│   └── typescript-config/# Shared TS configs
└── crates/          # Rust clean architecture crates
    ├── domain/      # Domain entities
    ├── application/ # Use cases
    ├── infrastructure/# Data access
    └── adapters*/   # Front/back/tauri adapters
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| UI components | packages/ui/src/components | shadcn/ui + custom |
| Graph visualization | packages/graph/src | @antv/g6 |
| Type definitions | packages/interfaces/src | Models, nodes, API types |
| State management | packages/store/src | Zustand stores |
| Desktop app | apps/desktop/src | Tauri + Next.js |
| Web app | apps/web/src | Next.js 16, React 19 |

## CODE MAP (Rust Crates)
```
domain/       → entities, value objects
application/  → use cases, services
infrastructure/ → repositories, external APIs
adapter-back/ → REST API adapter
adapter-front/ → Frontend adapter
adapter-tauri/ → Tauri IPC adapter
tauri-core/   → Shared Tauri logic
```

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
- Hybrid Rust+TypeScript monorepo (uncommon structure)
- Clean architecture applied to Rust crates
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
- All 7 Rust crates have placeholder tests (2+2=4)
