# packages/editor/AGENTS.md

Scope: the `packages/editor` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package is a vendored Tiptap block editor.
`packages/editor/README.md` identifies it as the upstream Notion-like template.
It offers two editors: a full block editor and a single-block editor.
`packages/ui` is the only consumer.

## Composition roots

- `components/tiptap-templates/notion-like/notion-like-editor.tsx` builds the full editor.
- `components/tiptap-templates/single-block/single-block-editor.tsx` builds the small editor for one text node.

`packages/ui` imports these two files from `text-node-content.tsx`, `rich-text-node-content.tsx`, and `media-sidebar/note-body-editor.tsx`.

## Map

| Path | Content |
| --- | --- |
| `components/tiptap-extension/` | ProseMirror extensions, for example indent, list normalization, and paste from Markdown |
| `components/tiptap-node/` | Node views. A node view can carry its own `.scss` file. |
| `components/tiptap-ui/` | Editor controls, for example toolbars and menus |
| `components/tiptap-ui-primitive/` | The upstream primitives that the controls build on |
| `components/tiptap-ui-utils/` | Shared helpers, for example the floating element |
| `components/tiptap-icons/` | Icon components |
| `components/tiptap-templates/` | The two editor assemblies |
| `hooks/` | Editor hooks, for example `use-tiptap-editor` |
| `lib/` | `tiptap-utils.ts`, `tiptap-advanced-utils.ts`, `ai.ts`, and the collaboration helpers |
| `styles/` | Shared stylesheets |
| `public/` | Template images |

## Rules

1. Use a deep import. The package has no entry point and no `exports` field.
2. Do not use the bare alias `@workspace/editor`. It points to a missing `src` directory. Use `@workspace/editor/components/...` or another real subpath.
3. Keep a new node view and its stylesheet in the same directory.
4. Import an internal file through the `@workspace/editor/...` alias, as the existing files do.
5. Treat the upstream template as read-mostly. Check a large edit against the upstream source before you make it.
6. Do not enable the AI actions. A repository change removed the mock injection and the AI entry now shows an unavailable notice.
7. Keep `react/prop-types` disabled. The files use typed `React.FC` and `forwardRef`. The local `eslint.config.js` sets this.
