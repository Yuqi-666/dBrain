/**
 * The island's public surface — one declaration of it, so the folder has a
 * single place to read what it exports.
 *
 * Note that this file is **not** a consumer entry point: `@workspace/ui`'s
 * `exports` map translates `./components/*` to `./src/components/*.tsx`, so the
 * directory's `index.ts` cannot be reached from outside the package, and neither
 * can anything under a subdirectory (`*` does not cross `/`). Import the concrete
 * module instead:
 *
 * ```tsx
 * import { DynamicIsland } from "@workspace/ui/components/dynamic-island/dynamic-island";
 * import type { DynamicIslandProps, IslandNavItem, IslandPanel }
 *   from "@workspace/ui/components/dynamic-island/dynamic-island";
 * ```
 */
export { DynamicIsland } from "./dynamic-island";
export type {
  DynamicIslandProps,
  IslandExpandedPanel,
  IslandNavItem,
  IslandPanel,
} from "./types";
