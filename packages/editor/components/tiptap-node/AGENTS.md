# tiptap-node

## OVERVIEW
Tiptap node extensions that define document structure (blockquote, code-block, heading, horizontal-rule, image, image-upload, list, paragraph, table, toc).

## WHERE TO LOOK
| Node | Structure |
|------|-----------|
| blockquote-node | Styles only |
| code-block-node | Styles only |
| heading-node | Styles only |
| horizontal-rule-node | Styles only |
| image-node | Extension + floating UI component |
| image-upload-node | (check subdirectory) |
| list-node | (check subdirectory) |
| paragraph-node | (check subdirectory) |
| table-node | extensions/ + hooks/ + lib/ + styles/ + ui/ |
| toc-node | context/ + extensions/ + ui/ + index.ts barrel |

## CONVENTIONS
- Nodes follow the pattern: `[name]-node/`
- Each node subdirectory is self-contained with its own styles, logic, and UI
- Complex nodes use subdirectories: `extensions/` (core logic), `ui/` (React components), `hooks/` (editor hooks), `lib/` (utilities), `context/` (React context)
- Nodes with multiple exports use `index.ts` barrel file
- Node extensions extend `@tiptap/core` NodeSpec and add plugins/commands
- UI components handle rendering and user interaction within the editor

## ANTI-PATTERNS
No anti-patterns specific to this directory. Follow parent AGENTS.md conventions.

## NOTES
- Some nodes (blockquote, code-block, heading, horizontal-rule) contain only SCSS styles — their logic lives in Tiptap core or shared extensions
- Table node is the most complex with drag handles, cell selection, and nested UI components
