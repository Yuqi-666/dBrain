/**
 * Dynamic Island (灵动岛) — the always-on bottom capsule of the app shell
 * (`docs/dynamic-island/README.md`, plan `docs/plan/dynamic-island.md` §M4).
 *
 * **Consumers must use the explicit `.tsx` subpath.** `packages/ui`'s
 * `exports` map only translates `./components/*` to `./src/components/*.tsx`,
 * so this directory's `index.ts` is **not** a runtime entry point — it exists so
 * the folder has one declaration of its public surface, not so it can be
 * imported. `apps/web` (and every other consumer) imports:
 *
 * ```tsx
 * import { DynamicIsland } from "@workspace/ui/components/dynamic-island/dynamic-island";
 * import type { DynamicIslandProps, IslandNavItem, IslandPanel }
 *   from "@workspace/ui/components/dynamic-island/dynamic-island";
 * ```
 *
 * The sibling modules are internal by construction: `island-config.ts` is plain
 * `.ts` and the mapping ends in `.tsx`, and `panels/*.tsx` sits one directory
 * deeper than an `exports` subpath pattern can match (`*` does not cross `/`).
 */
export { DynamicIsland } from "./dynamic-island";
export type {
  DynamicIslandProps,
  IslandNavItem,
  IslandPanel,
} from "./dynamic-island";
