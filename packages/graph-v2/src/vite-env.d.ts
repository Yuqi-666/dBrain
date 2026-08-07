// Ambient declaration for Vite-style `import.meta.env` used in ForceGraph.tsx.
// graph-v2 is consumed by Vite-compatible bundlers (Next.js/webpack/turbopack);
// `vite/client` is not a dependency, so declare just the fields we read.
interface ImportMeta {
  readonly env?: {
    readonly DEV?: boolean;
  };
}
