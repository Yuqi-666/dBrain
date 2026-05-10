# PROJECT KNOWLEDGE BASE: @workspace/store

**Generated:** 2026-04-22
**Parent:** /home/lyq/workspace/projects/dBrain/AGENTS.md

## OVERVIEW

Zustand v5-based global state management package that depends on shared types from @workspace/interfaces.

## WHERE TO LOOK

| What             | Location       | Notes                                    |
| ---------------- | -------------- | ---------------------------------------- |
| Root entry       | ./index.ts     | Exports all stores, hooks, and selectors |
| Domain stores    | ./slices/      | One store file per domain slice          |
| Custom selectors | ./hooks/       | Memoized selectors for component usage   |
| Base types       | ../interfaces/ | All state shapes reference shared types  |

## CONVENTIONS

These differ from root project conventions:

- Uses Zustand v5's functional `create` API with explicit selector composition
- All state shape definitions import types directly from @workspace/interfaces
- Export individual selectors alongside the main store hook
- Split stores by domain to keep concerns separated and maintainable
- Use selector composition to prevent unnecessary component re-renders
- Stick to immutable update patterns as recommended by Zustand v5 docs

## ANTI-PATTERNS

- Never duplicate type definitions already defined in @workspace/interfaces
- Do not use deprecated Zustand v4 syntax or patterns
- Avoid giant monolithic stores - split unrelated state into separate slices
- Don't put direct API client logic or network calls in this package
- Never re-export types that belong in @workspace/interfaces to prevent duplication
- Don't use external state management libraries here - all global state stays in Zustand
