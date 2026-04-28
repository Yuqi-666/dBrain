# tiptap-ui/

**OVERVIEW**
Toolbar UI layer with 39 button/popover/dropdown components for the editor toolbar.

## WHERE TO LOOK

| Category | Components |
|----------|------------|
| **Text Formatting** | text-button, mark-button, heading-button, blockquote-button, code-block-button, list-button, reset-all-formatting-button, text-align-button, indent-button |
| **AI Features** | ai-ask-button, ai-menu, improve-dropdown |
| **Color Controls** | color-text-button, color-text-popover, color-highlight-button, color-highlight-popover, color-menu |
| **Media** | image-align-button, image-caption-button, image-download-button, image-upload-button |
| **Links** | link-popover, copy-anchor-link-button |
| **Clipboard** | copy-to-clipboard-button |
| **Node Operations** | delete-node-button, duplicate-button, move-node-button |
| **Mentions** | mention-dropdown-menu, mention-trigger-button |
| **Emoji** | emoji-dropdown-menu, emoji-menu, emoji-trigger-button |
| **Slash Commands** | slash-dropdown-menu, slash-command-trigger-button |
| **Turn Into** | turn-into-dropdown |
| **History** | undo-redo-button |
| **Drag Context** | drag-context-menu |

## CONVENTIONS

**Component Structure** (per subdirectory):
```
component-dir/
├── index.tsx              # Re-exports
├── component-name.tsx     # Main component
├── use-component-name.ts  # Logic hook
├── component-name.scss    # Styles (if needed)
└── component-name-types.ts # Type definitions (if needed)
```

**Common Patterns**:
- `"use client"` directive on all components
- `forwardRef` for button components
- Props extend `ButtonProps` from `tiptap-ui-primitive/button`
- Config props pattern: `editor`, `hideWhenUnavailable`, `onExecuted`/`onToggled`
- Components use `useTiptapEditor` hook to get editor instance
- `use[Component]` hooks return `{ isVisible, canExecute, handleAction, label, Icon }`
- Shortcut badges via `parseShortcutKeys` helper

**Complex Components** (nested subdirectories):
- `ai-menu/` — has `ai-menu-actions/`, `ai-menu-input/`, `ai-menu-items/`

## ANTI-PATTERNS
No anti-patterns specific to this directory.
