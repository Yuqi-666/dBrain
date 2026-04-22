# PROJECT KNOWLEDGE BASE (packages/ui)

**Generated:** 2026-04-22
**Repository:** dBrain

## OVERVIEW
Shared UI component library for all dBrain applications (web + desktop), combining shadcn/ui primitives with custom application-specific components.

## STRUCTURE
```
components/     # All UI components (shadcn base + custom additions)
utils/          # Utility functions (class merging, etc)
types/          # Shared TypeScript type definitions for components
styles/         # Global and shared CSS styles
hooks/          # Component-specific custom React hooks
```

## WHERE TO LOOK
- Base shadcn components: `./components/ui/`
- Custom application components: `./components/` (direct, not in ui subdir)
- Class merging utility: `./utils/cn.ts`
- Global Tailwind styles: `./styles/globals.css`
- Component-specific hooks: `./hooks/`

## CONVENTIONS
- All components use named exports, no default exports
- Component filenames match component name in PascalCase (e.g., `KnowledgeGraph.tsx`)
- Use the `cn()` utility from `@workspace/ui/utils/cn` to merge Tailwind classes
- Every component exports a properly typed props interface extending native HTML element types
- Follow Tailwind v4 ordering: base → layout → components → utilities
- Dark mode is implemented via Tailwind `dark:` prefix, no custom CSS variables for colors

## ANTI-PATTERNS
- Don't inline custom CSS when a Tailwind utility already exists
- Avoid modifying base shadcn components after adding them - extend in a new custom component instead
- Don't duplicate existing components; always extend or compose instead of rewriting
- Don't forget to use `cn()` for class merging even when there are no conditional classes yet
- Never add third-party component libraries when a shadcn component can be extended to fit the need
