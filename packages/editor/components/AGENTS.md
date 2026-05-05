# Component Library

## STRUCTURE

```
components/
├── tiptap-ui/            # Toolbar buttons (ai, color, emoji, formatting...)
├── tiptap-ui-primitive/  # Base UI (button, menu, popover, toolbar...)
├── tiptap-node/          # Tiptap node extensions (table, image, code-block...)
├── tiptap-extension/     # Custom extensions (indent, alignment, list-normalization)
├── tiptap-templates/     # Full editor templates
├── tiptap-icons/         # Icon components (80+ SVG icons)
└── tiptap-ui-utils/      # Floating elements, suggestion menu utilities
```

## WHERE TO LOOK

| Subdir                 | Purpose                | Key contents                                                                   |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `tiptap-ui/`           | Toolbar UI layer       | Buttons, menus, popovers for formatting, AI, colors, emoji                     |
| `tiptap-ui-primitive/` | Base component layer   | Reusable primitives: button, card, combobox, dropdown, input, toolbar, tooltip |
| `tiptap-node/`         | Tiptap schema nodes    | Editor blocks: blockquote, code, heading, image, list, paragraph, table, toc   |
| `tiptap-extension/`    | Tiptap extension logic | Non-UI extensions: indent, alignment, background, list-normalization, ui-state |
| `tiptap-templates/`    | Composite templates    | `notion-like/` - full Notion-style editor composition                          |
| `tiptap-icons/`        | SVG icon library       | 80+ icon components (align-_, table-_, heading-_, ai-_, etc.)                  |
| `tiptap-ui-utils/`     | Positioning utilities  | Floating element positioning, suggestion menu helpers                          |

## CONVENTIONS

- **Naming**: feature-type format (e.g., `color-highlight-button`, `table-node`, `ai-ask-button`)
- **Node extensions**: suffix `-node` (e.g., `image-node.tsx`, `blockquote-node.tsx`)
- **UI components**: suffix indicates type (`-button`, `-menu`, `-popover`, `-dropdown`)
- **Icons**: named after Lucide icon conventions, suffixed with `-icon.tsx`
- **Composition**: tiptap-ui builds on tiptap-ui-primitive, both use Floating UI for positioning

## ANTI-PATTERNS

- No component-specific anti-patterns noted
- Follow existing naming patterns when adding new components
