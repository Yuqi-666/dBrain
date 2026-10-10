# PROJECT KNOWLEDGE BASE - apps/web

**Generated:** 2026-04-26
**Path:** apps/web
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

Next.js 16 web application (port 3000). Primary frontend for dBrain — the cognitive graph platform.

## WHERE TO LOOK

| Task            | Location                           | Notes                                                                            |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| App entry       | app/                               | Next.js App Router routes                                                        |
| Workspace shell | components/workspace-shell.tsx     | The one persistent surface host — mounted by `app/(main)/layout.tsx`, not a page |
| Route ↔ surface | components/island-routes.ts        | `ISLAND_ROUTES` is the single table: island nav _and_ the shell's surface lookup |
| Island host     | components/dynamic-island-host.tsx | Routes, panels, shortcuts; writes the surface optimistically before navigating   |
| State           | @workspace/store                   | Global state via Zustand (`uiStore.mainViewType` is the visible surface)         |
| Graph           | @workspace/graph                   | d3-force worker + OffscreenCanvas (`<Graph />`)                                  |
| Dashboard       | @workspace/ui/components/dashboard | Workspace-scoped page grid; opens from the island                                |

## SURFACES: ONE SHELL, TWO ROUTES

`/graph` and `/dashboard` are one single-page shell, not two pages:

- **The shell lives in `app/(main)/layout.tsx`.** A Next _page_ is unmounted the
  moment its route stops matching; a _layout_ shared by both routes is not. The
  shell therefore initializes the workspace exactly once per session, and a
  switch is a visibility toggle on a surface that is already live — no re-fetch,
  no worker reboot, no reload flash.
- **A route page renders nothing** (`graph/page.tsx`, `dashboard/page.tsx`). It
  exists so the URL, a deep link, a refresh and the island's `href` still name the
  surface. Do not put surface UI back into a page — it would remount on every
  switch, which is the bug this design removes.
- **Which surface is on screen** = `uiStore.mainViewType` (with `editor` meaning
  the fullscreen node editor, an overlay on `editorReturnViewType`). The island
  writes it on click (instant swap); the shell re-derives it from the pathname so
  a link, refresh or the back button also lands correctly.
- **Both surfaces stay mounted** once visited, hidden with `visibility: hidden`
  (`invisible`) plus `inert` — never `display: none`, because the graph and the
  dashboard grid both measure their container. The dashboard mounts on first
  visit only; it is the expensive one (VTable widgets).
- **The dashboard has no sidebar**: the shell passes `sidebar={null}` to
  `MainLayout`, which then also drops the left hover edge. A `fixed` sidebar mode
  is the user's own preference and comes back with the graph.

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
