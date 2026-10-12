# Selector components

`selector/` holds components that select a value or entity. Classification follows
that purpose, even when the picker is rendered inside a dropdown menu.
`menu/` holds action menus, such as the graph context menu and upload menu.

## Domain selectors

| File / export                                          | Purpose                                           | Container owned by the selector |
| ------------------------------------------------------ | ------------------------------------------------- | ------------------------------- |
| `icon-selector-popover.tsx` / `IconSelectorPopover`    | Node icon                                         | Complete popover and trigger    |
| `cover-selector-popover.tsx` / `CoverSelectorPopover`  | Node cover                                        | Complete popover and trigger    |
| `node-data-type-selector.tsx` / `NodeDataTypeSelector` | Node data type, followed by host-provided content | `DropdownMenuSubContent`        |
| `node-selector.tsx` / `NodeSelector`                   | Existing node                                     | `DropdownMenuSubContent`        |
| `node-tag-selector.tsx` / `NodeTagSelector`            | Apply/create/delete node tags                     | `PopoverContent`                |
| `node-semantic-selector.tsx` / `NodeSemanticSelector`  | Node semantic                                     | Body only                       |
| `edge-semantic-selector.tsx` / `EdgeSemanticSelector`  | Edge semantic                                     | Body only                       |
| `workspace-selector.tsx` / `WorkSpaceSelector`         | Current workspace (switch / create)               | Complete dropdown and trigger   |

Keep the existing host container for each selector. A dropdown body uses Radix
menu items and must stay inside a dropdown menu; placing it directly in a popover
would lose its menu context. The tag display chip lives in `../tag/tag-pill.tsx`.

## Shared selector parts

`shared/` replaces the former `media/` directory. These components compose the
icon and cover selectors:

- `SelectorPopoverShell`: popover, trigger, tabs, actions and scrollable Command body.
- `SelectorSearchInput`: sticky Command search input; requires a Command ancestor.
- `SelectorGrid`: searchable grid with keyboard navigation; requires a Command ancestor.
- `SelectorUploadPane`: node icon/cover upload adapter around `FileDropZone`.
- `SelectorUrlInput`: controlled URL input with submission on Enter/blur.

Import components from their explicit `@workspace/ui/components/selector/...`
subpaths. Filenames use kebab-case; exports and props share the `Selector` name.
