"use client";

/**
 * The in-cell editors the table view plugs into VTable.
 *
 * `@visactor/vtable-editors` ships text / date / single-select / textarea
 * editors; `multiSelect` has no built-in equivalent, so
 * {@link MultiSelectEditor} fills that gap with a checkbox list. Editors are
 * passed to VTable as *instances* on the column define rather than registered
 * globally by name, which keeps each select column's option list local to the
 * field it belongs to.
 *
 * See `docs/dataview/table.md` §3.1 / §8.3.
 */
import type { IEditor, EditContext, RectProps } from "@visactor/vtable-editors";
import {
  DateInputEditor,
  InputEditor,
  ListEditor,
} from "@visactor/vtable-editors";
import type { ColumnDefine } from "@visactor/vtable";
import type { DatabaseField } from "@workspace/interfaces";

/**
 * Checkbox-list editor for `multiSelect`.
 *
 * `getValue()` returns the option **names** joined with `", "` — the same shape
 * a multi-select record carries — and `recordValueToCell` maps them back to
 * option ids.
 */
class MultiSelectEditor implements IEditor<string, unknown> {
  readonly editorType = "DataViewMultiSelect";

  private readonly values: string[];
  private container?: HTMLElement;
  private root?: HTMLElement;
  private selected = new Set<string>();

  constructor(values: string[]) {
    this.values = values;
  }

  getValue(): string {
    return Array.from(this.selected).join(", ");
  }

  onStart({
    container,
    value,
    referencePosition,
    endEdit,
    table,
  }: EditContext<string, unknown>): void {
    this.container = container;
    this.selected = new Set(
      String(value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );

    const root = document.createElement("div");
    root.style.position = "absolute";
    root.style.boxSizing = "border-box";
    root.style.overflow = "auto";
    root.style.padding = "4px";
    root.style.background = "#ffffff";
    root.style.border = "2px solid #4A90E2";
    root.style.borderRadius = "2px";
    root.style.fontSize = "12px";
    root.style.lineHeight = "18px";
    root.style.zIndex = "1000";

    for (const option of this.values) {
      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.gap = "6px";
      label.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = this.selected.has(option);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) this.selected.add(option);
        else this.selected.delete(option);
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(option));
      root.appendChild(label);
    }

    root.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        event.preventDefault();
        endEdit();
      }
    });

    this.root = root;
    this.container.appendChild(root);
    if (referencePosition?.rect) this.adjustPosition(referencePosition.rect);
    // Focus the first control so Esc/Enter reach the editor.
    root.querySelector("input")?.focus();

    // `table` is unused but part of the context contract.
    void table;
  }

  adjustPosition(rect: RectProps): void {
    if (!this.root) return;
    this.root.style.top = `${rect.top - 1}px`;
    this.root.style.left = `${rect.left - 1}px`;
    this.root.style.minWidth = `${rect.width + 2}px`;
    this.root.style.minHeight = `${rect.height + 2}px`;
    this.root.style.maxHeight = "220px";
  }

  onEnd(): void {
    this.root?.remove();
    this.root = undefined;
  }

  isEditorElement(target: HTMLElement): boolean {
    return this.root?.contains(target) ?? false;
  }
}

/**
 * The editor instance a field edits with, or `undefined` when the field is
 * edited by its own cell type (`checkbox`) and needs none.
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
    case "select": {
      const values = (field.options ?? []).map((option) => option.name);
      // A select with no options degrades to free text rather than an empty
      // dropdown, so the user is never stuck.
      return values.length > 0 ? new ListEditor({ values }) : new InputEditor();
    }
    case "multiSelect":
      return new MultiSelectEditor(
        (field.options ?? []).map((option) => option.name),
      );
    case "checkbox":
    case "relation":
      return undefined;
  }
}
