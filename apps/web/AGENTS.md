# PROJECT KNOWLEDGE BASE - apps/web

**Generated:** 2026-04-26
**Path:** apps/web
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW
Next.js 16 web application (port 3000). Primary frontend for dBrain — the cognitive graph platform.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App entry | src/app/ | Next.js App Router pages |
| Components | src/components/ | Page-level React components |
| State | @workspace/store | Global state via Zustand |
| Graph | @workspace/graph | G6-based visualization |

## CONVENTIONS
- Uses `reactStrictMode: false` (intentional, per next.config.mjs)
- App Router with Next.js 16, React 19
- Server components by default, `'use client'` for interactive parts
- Import order: builtin → third-party → shared → app → styles

## ANTI-PATTERNS
- **NEVER** hardcode theme tokens — use CSS variables from @workspace/ui
- **NEVER** put business logic in components — use custom hooks
- **NEVER** import directly from package internal paths — use public exports
- **NEVER** create circular dependencies between packages
- No ESLint errors (eslint-plugin-only-warn downgrades to warnings)
