"use client";

/**
 * The in-cell editors the table view plugs into VTable.
 *
 * Only the two edit-in-place types are VTable editors: text-ish fields
 * (`InputEditor`) and dates (`DateInputEditor`). Both take over the cell for the
 * duration of the edit and are positioned by VTable itself, so they need no
 * layout work here.
 *
 * **单选 / 多选 deliberately have no editor.** Their value is a set of coloured
 * options, which an in-cell text/checkbox box cannot express — the cell shows
 * capsules (canvas, `canvas/pill.ts`) and the user picks from the dropdown the
 * capsule's chevron opens (`menus/select-menu.tsx`, driven by
 * `table-data-view.tsx`). Returning `undefined` here is what keeps VTable from
 * opening a plain text input on a double-click: `ListTable.getEditor` falls back
 * to `options.editor`, which the shell never sets.
 *
 * See `docs/dataview/table.md` §3.1 / §8.3.
 */
import type { ColumnDefine } from "@visactor/vtable";
import { DateInputEditor, InputEditor } from "@visactor/vtable-editors";
import type { DatabaseField } from "@workspace/interfaces";

/**
 * The editor instance a field edits with, or `undefined` when the field is
 * edited by its own cell type (`checkbox`) or by the view's own dropdown
 * (单选 / 多选).
 */
export function createTableEditor(
  field: DatabaseField,
): ColumnDefine["editor"] | undefined {
  switch (field.type) {
    case "text":
    case "number":
    case "url":
      return new InputEditor();
    case "date":
      return new DateInputEditor();
    case "select":
    case "multiSelect":
    case "checkbox":
    case "relation":
      return undefined;
  }
}
