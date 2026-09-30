/**
 * The kanban's data-transformation layer: `rows` + a group field → lanes and
 * cards (kanban.md §3.1).
 *
 * Everything here is pure, so the mapping rules stay reviewable independently
 * of the board's drag-and-drop wiring in `kanban-data-view.tsx`. Two model
 * decisions are load-bearing:
 *
 * 1. **A card's dnd id is `laneId + "::" + rowId`, not the row id.** ReUI's
 *    `Kanban` requires item ids that are unique across *all* columns and
 *    distinct from column ids; a `multiSelect` grouping legitimately puts one
 *    row in several lanes, and even a single-select board would collide the
 *    moment a row id and a lane id matched. The row id is recovered from the
 *    card object itself (`findCardByKey`), never by parsing the key.
 * 2. **A lane is an option, plus an optional 未分组 pseudo-lane.** The
 *    pseudo-lane always exists (when `config.showUnassigned`) so that dragging a
 *    card out of every group is possible; it is the one lane a write clears
 *    (`cellForLane`).
 *
 * Pure module: no React, no third-party library.
 */
import type {
  DatabaseField,
  DataRow,
  DataViewSource,
  KanbanViewConfig,
} from "@workspace/interfaces";

import {
  displayText,
  findOption,
  sortValue,
  toOptionIds,
} from "../../../source/cell-resolver";
import {
  isMultiValueGroup,
  optionColor,
  orderLaneOptions,
  resolveCardFields,
  resolveGroupField,
  resolveTitleField,
} from "./config";

/**
 * The 未分组 lane's id.
 *
 * Prefixed and double-underscored so it can never collide with an option id
 * (`opt_…`) and, because card ids always contain `"::"`, never with an item id.
 */
export const KANBAN_UNASSIGNED_LANE_ID = "__kanban_unassigned__";

export const KANBAN_UNASSIGNED_LANE_NAME = "未分组";

/** Placeholder title for a row whose title cell is empty. */
export const KANBAN_UNTITLED = "未命名";

/** One 单选/多选 value rendered as a chip on a card. */
export interface KanbanCardChip {
  optionId: string;
  label: string;
  color: string;
}

/** One extra field rendered on a card (`config.cardFields`). */
export interface KanbanCardField {
  fieldId: string;
  name: string;
  text: string;
  /** Set for 单选/多选, which render as chips rather than as text. */
  chips?: KanbanCardChip[];
}

export interface KanbanCard {
  /** Unique across every lane — see the file header. */
  key: string;
  rowId: string;
  /** The lane the card was built into (stale once a drag moves it). */
  laneId: string;
  /** `collection` only: the graph node behind the row. */
  nodeId?: string;
  title: string;
  fields: KanbanCardField[];
}

export interface KanbanLane {
  id: string;
  /** `null` for the 未分组 lane. */
  optionId: string | null;
  name: string;
  color: string;
}

export interface KanbanBoardModel {
  /** Lane metadata in display order. */
  lanes: KanbanLane[];
  /** The REUI board value: lane id → cards. */
  columns: Record<string, KanbanCard[]>;
  groupField: DatabaseField | null;
  titleField: DatabaseField | null;
  cardFields: DatabaseField[];
  /** A multiSelect group puts one row in several lanes → drag is off. */
  multiValue: boolean;
}

/** A card's dnd id. */
export function cardKey(laneId: string, rowId: string): string {
  return `${laneId}::${rowId}`;
}

/** The card behind a dnd id, searched in the live board value. */
export function findCardByKey(
  columns: Record<string, KanbanCard[]>,
  key: string | number,
): KanbanCard | undefined {
  const wanted = String(key);
  for (const laneId of Object.keys(columns)) {
    const card = columns[laneId]?.find((candidate) => candidate.key === wanted);
    if (card) return card;
  }
  return undefined;
}

function buildCardFields(
  row: DataRow,
  fields: readonly DatabaseField[],
  resolveNodeTitle?: (nodeId: string) => string | undefined,
): KanbanCardField[] {
  const values: KanbanCardField[] = [];
  for (const field of fields) {
    const cell = row.cells[field.id];
    const text = displayText(cell, field, resolveNodeTitle);
    if (field.type === "select" || field.type === "multiSelect") {
      const chips: KanbanCardChip[] = toOptionIds(cell).map((optionId) => ({
        optionId,
        label: findOption(field, optionId)?.name ?? optionId,
        color: optionColor(field, optionId),
      }));
      if (chips.length > 0) {
        values.push({ fieldId: field.id, name: field.name, chips, text });
      }
      continue;
    }
    // An empty cell is noise on a card, so it is dropped rather than rendered
    // as a placeholder.
    if (text !== "") {
      values.push({ fieldId: field.id, name: field.name, text });
    }
  }
  return values;
}

function compareCards(
  a: KanbanCard,
  b: KanbanCard,
  rowsById: Map<string, DataRow>,
  sortField: DatabaseField | null,
  order: "asc" | "desc",
): number {
  if (!sortField) return 0;
  const direction = order === "desc" ? -1 : 1;
  const left = sortValue(rowsById.get(a.rowId)?.cells[sortField.id], sortField);
  const right = sortValue(
    rowsById.get(b.rowId)?.cells[sortField.id],
    sortField,
  );
  if (left === right) return 0;
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * direction;
  }
  return String(left).localeCompare(String(right)) * direction;
}

/**
 * Builds the board model for a source + config.
 *
 * Lanes come from the group field's options in `config.laneOrder` order, with
 * the 未分组 lane last when `config.showUnassigned`. Rows land in the lane of
 * every option they carry; a row with no (or an unknown) option lands in
 * 未分组, and is dropped entirely when that lane is hidden.
 */
export function buildKanbanBoard(
  source: DataViewSource,
  config: KanbanViewConfig,
  resolveNodeTitle?: (nodeId: string) => string | undefined,
): KanbanBoardModel {
  const groupField = resolveGroupField(source.fields, config.groupByField);
  const titleField = resolveTitleField(source.fields, config.titleField);
  const cardFields = resolveCardFields(source.fields, config.cardFields);
  const multiValue = isMultiValueGroup(groupField);

  const lanes: KanbanLane[] = [];
  const columns: Record<string, KanbanCard[]> = {};

  if (groupField) {
    const options = orderLaneOptions(
      groupField.options ?? [],
      config.laneOrder,
    );
    for (const option of options) {
      lanes.push({
        id: option.id,
        optionId: option.id,
        name: option.name,
        color: optionColor(groupField, option.id),
      });
    }
    if (config.showUnassigned) {
      lanes.push({
        id: KANBAN_UNASSIGNED_LANE_ID,
        optionId: null,
        name: KANBAN_UNASSIGNED_LANE_NAME,
        color: "var(--muted-foreground)",
      });
    }
    for (const lane of lanes) columns[lane.id] = [];

    const laneByOptionId = new Map(
      lanes
        .filter((lane) => lane.optionId !== null)
        .map((lane) => [lane.optionId!, lane.id]),
    );
    const rowsById = new Map(source.rows.map((row) => [row.id, row]));
    const hasUnassigned = Boolean(columns[KANBAN_UNASSIGNED_LANE_ID]);

    source.rows.forEach((row, index) => {
      const nodeId = source.nodeIds?.[index];
      const title =
        displayText(
          titleField ? row.cells[titleField.id] : undefined,
          titleField ?? undefined,
          resolveNodeTitle,
        ) || KANBAN_UNTITLED;

      const laneIds = new Set<string>();
      for (const optionId of toOptionIds(row.cells[groupField.id])) {
        const laneId = laneByOptionId.get(optionId);
        if (laneId) laneIds.add(laneId);
      }
      if (laneIds.size === 0) {
        if (!hasUnassigned) return;
        laneIds.add(KANBAN_UNASSIGNED_LANE_ID);
      }

      for (const laneId of laneIds) {
        columns[laneId]!.push({
          key: cardKey(laneId, row.id),
          rowId: row.id,
          laneId,
          nodeId: nodeId ?? (source.kind === "collection" ? row.id : undefined),
          title,
          fields: buildCardFields(row, cardFields, resolveNodeTitle),
        });
      }
    });

    const sortField = config.sortBy
      ? (source.fields.find((field) => field.id === config.sortBy?.fieldId) ??
        null)
      : null;
    if (sortField) {
      const order = config.sortBy?.order ?? "asc";
      for (const laneId of Object.keys(columns)) {
        columns[laneId]!.sort((a, b) =>
          compareCards(a, b, rowsById, sortField, order),
        );
      }
    }
  }

  return { lanes, columns, groupField, titleField, cardFields, multiValue };
}

/**
 * Moves a card to the end of another lane (the card menu's 移动到).
 *
 * The board is derived from the source, so this is only the *optimistic* half
 * of the gesture: the caller writes the cell through `onCellChange` and the
 * host's write lands back here as a fresh source. Returns the same value when
 * the card is unknown.
 */
export function moveCardToLane(
  columns: Record<string, KanbanCard[]>,
  key: string,
  targetLaneId: string,
): Record<string, KanbanCard[]> {
  const card = findCardByKey(columns, key);
  const target = columns[targetLaneId];
  if (!card || !target) return columns;
  // A card object keeps the lane it was *built* into, so "already there" is
  // answered by the lane's own list rather than by `card.laneId`.
  if (target.some((candidate) => candidate.key === key)) return columns;
  const next: Record<string, KanbanCard[]> = {};
  for (const laneId of Object.keys(columns)) {
    next[laneId] = (columns[laneId] ?? []).filter(
      (candidate) => candidate.key !== key,
    );
  }
  next[targetLaneId] = [...target, { ...card, laneId: targetLaneId }];
  return next;
}

/** Total cards on the board (a multiSelect board counts a row once per lane). */
export function countCards(columns: Record<string, KanbanCard[]>): number {
  return Object.values(columns).reduce(
    (total, cards) => total + cards.length,
    0,
  );
}
