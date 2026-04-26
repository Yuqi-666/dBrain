# PROJECT KNOWLEDGE BASE - apps/desktop

**Generated:** 2026-04-26
**Path:** apps/desktop
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW
Tauri 2.x + Next.js desktop application (port 3001). Shares most code with web app but has native desktop capabilities.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Tauri config | src-tauri/ | tauri.conf.json, Cargo.toml |
| Rust code | src-tauri/src/ | Native Tauri commands |
| Next.js | src/ | Shared frontend code |
| Desktop-specific | src/desktop/ | Desktop-only components |

## CONVENTIONS
- Rust edition 2021 (unlike backend which is TypeScript)
- Next.js with `output: 'export'` for static Tauri bundle
- CSP disabled (`"csp": null`) — security consideration
- devUrl configured for port 3001

## ANTI-PATTERNS
- **NEVER** remove the console window prevention comment in main.rs
- **NEVER** modify next-env.d.ts (auto-generated)
- **NEVER** disable CSP in production builds
- No business logic in Rust — delegate to backend via IPC
