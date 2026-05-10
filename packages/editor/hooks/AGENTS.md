# HOOKS

**OVERVIEW:** 15 custom hooks abstracting editor state management, floating UI positioning, menu navigation, and DOM utilities for the editor.

## WHERE TO LOOK

### Editor State

| Hook                  | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `use-tiptap-editor`   | Core editor instance with selection/storage handling |
| `use-ui-editor-state` | UI state from editor storage extension               |

### Floating UI

| Hook                              | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `use-floating-element`            | Floating element positioning via Floating UI  |
| `use-floating-toolbar-visibility` | Toolbar show/hide logic with transaction meta |

### Menu Navigation

| Hook                  | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `use-menu-navigation` | Keyboard navigation for menus (arrow keys, tab, enter, escape) |

### Cursor & Scrolling

| Hook                    | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `use-cursor-visibility` | Auto-scroll to keep cursor visible under toolbar |
| `use-scrolling`         | Scroll detection                                 |

### DOM Utilities

| Hook                   | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `use-window-size`      | Window dimensions                         |
| `use-element-rect`     | Element bounding rect with ResizeObserver |
| `use-body-rect`        | Body bounding rect (throttled)            |
| `use-on-click-outside` | Click outside detection                   |
| `use-composed-ref`     | Compose multiple refs                     |
| `use-unmount`          | Unmount callbacks                         |

### React Utilities

| Hook                           | Purpose                         |
| ------------------------------ | ------------------------------- |
| `use-isomorphic-layout-effect` | SSR-safe useLayoutEffect        |
| `use-is-breakpoint`            | Responsive breakpoint detection |
| `use-throttled-callback`       | Throttled callback wrapper      |

## CONVENTIONS

- **Prefix:** All hooks use `use` prefix
- **Return types:** Explicit return type annotations on main functions
- **JSDoc:** Complex hooks have `@param` and `@returns` documentation
- **Floating UI:** Uses `@floating-ui/react` (useFloating, useDismiss, useInteractions, useTransitionStyles)
- **Editor state:** Uses Tiptap's `useEditorState` for reactive selections
- **Generic types:** Menu navigation and composed ref use generics (`<T>`)

## ANTI-PATTERNS

- No directory-specific anti-patterns identified
