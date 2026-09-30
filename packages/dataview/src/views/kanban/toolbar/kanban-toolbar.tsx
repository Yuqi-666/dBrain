"use client";

/**
 * The kanban view's toolbar — its one control strip.
 *
 * Layout contract (same as every view): **configuration on the left, functions
 * on the right**, every control a button or a dropdown/popover. The shell's
 * 更多 menu is appended to the function group by `ViewToolbar`, so the tab strip
 * stays pure navigation.
 *
 * The kanban has no `configEditor` in the registry: all four settings groups
 * have a dedicated panel here (grouping / cards / lane sort / display), which is
 * exactly the state the table reached in M2.5. Each panel is a `Popover` rather
 * than a `DropdownMenu` because its body is a *form* (a `Select`, a checkbox
 * list, switches) rather than a list of commands — a menu's roving focus is the
 * wrong tool for it.
 *
 * The trigger reports engaged state with `--primary` (the current group field,
 * an active lane sort), and `--primary` is spent nowhere else here.
 */
import { ArrowUpDown, Columns3, IdCard, SlidersHorizontal } from "lucide-react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Separator } from "@workspace/ui/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/ui/toggle-group";
import type {
  DataViewSource,
  DatabaseField,
  KanbanViewConfig,
} from "@workspace/interfaces";

import { FieldSelect } from "../../../shared/field-select";
import { FieldTypeIcon } from "../../../shared/field-meta";
import {
  PanelSection,
  SettingsPanel,
  SwitchRow,
} from "../../../shared/settings-panel";
import { ViewToolbar } from "../../../shared/view-toolbar";
import { groupableFields } from "../core/config";

/** The 显示字段 checkbox list (the card's extra fields). */
function CardFieldsList({
  fields,
  selected,
  disabled,
  onChange,
}: {
  fields: readonly DatabaseField[];
  selected: readonly string[];
  disabled?: boolean;
  onChange: (fieldIds: string[]) => void;
}) {
  if (fields.length === 0) {
    return (
      <span className="text-[11px] text-muted-foreground">
        这张表还没有可展示的字段
      </span>
    );
  }
  const chosen = new Set(selected);
  return (
    <ScrollArea className="max-h-52 rounded-md border border-border">
      <div className="flex flex-col gap-0.5 p-1">
        {fields.map((field) => (
          <label
            key={field.id}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent/60"
          >
            <Checkbox
              checked={chosen.has(field.id)}
              disabled={disabled}
              aria-label={field.name}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, field.id]
                    : selected.filter((fieldId) => fieldId !== field.id),
                )
              }
            />
            <FieldTypeIcon
              type={field.type}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate">{field.name}</span>
          </label>
        ))}
      </div>
    </ScrollArea>
  );
}

export interface KanbanToolbarProps {
  source: DataViewSource;
  config: KanbanViewConfig;
  /** Cards currently on the board (a multiSelect row counts once per lane). */
  cardCount: number;
  laneCount: number;
  /** The host allows view-management → every config write needs this. */
  canConfigure: boolean;
  /** The host allows cell writes → 允许拖拽 is meaningful. */
  canEditData: boolean;
  /** The host allows row inserts → 允许新建 is meaningful. */
  canInsertRow: boolean;
  onConfigChange?: (config: KanbanViewConfig) => void;
  className?: string;
}

export function KanbanToolbar({
  source,
  config,
  cardCount,
  laneCount,
  canConfigure,
  canEditData,
  canInsertRow,
  onConfigChange,
  className,
}: KanbanToolbarProps) {
  const patch = (next: Partial<KanbanViewConfig>) =>
    onConfigChange?.({ ...config, ...next });

  const groupable = groupableFields(source.fields);
  const groupField =
    source.fields.find((field) => field.id === config.groupByField) ?? null;
  const sortField = config.sortBy
    ? (source.fields.find((field) => field.id === config.sortBy?.fieldId) ??
      null)
    : null;
  const cardFieldIds = (config.cardFields ?? []).filter((fieldId) =>
    source.fields.some((field) => field.id === fieldId),
  );

  return (
    <ViewToolbar
      className={className}
      actions={
        <Badge
          variant="secondary"
          className="h-6 px-2 text-[11px] font-normal text-muted-foreground tabular-nums"
        >
          {laneCount} 泳道 · {cardCount} 卡片
        </Badge>
      }
    >
      {/* ——————— 分组 ——————— */}
      <SettingsPanel
        label="分组"
        icon={Columns3}
        active={Boolean(config.groupByField)}
        value={groupField?.name}
        disabled={!canConfigure}
      >
        <PanelSection
          label="分组字段"
          hint={
            groupable.length === 0
              ? "这张表还没有「单选」或「多选」字段，看板无法分列。"
              : "卡片按该字段的选项分列，拖拽即改值。"
          }
        >
          <FieldSelect
            fields={groupable}
            value={config.groupByField}
            placeholder="选择字段"
            disabled={groupable.length === 0}
            onValueChange={(fieldId) =>
              // A different field has its own options, so a stale lane order
              // would be meaningless: reset it with the field.
              patch({ groupByField: fieldId, laneOrder: [] })
            }
          />
        </PanelSection>
        <Separator />
        <SwitchRow
          label="显示未分组"
          hint="没有分组值的卡片收在这一列，也可拖回"
          checked={config.showUnassigned}
          onCheckedChange={(checked) => patch({ showUnassigned: checked })}
        />
      </SettingsPanel>

      {/* ——————— 卡片 ——————— */}
      <SettingsPanel
        label="卡片"
        icon={IdCard}
        active={config.compact || cardFieldIds.length > 0}
        disabled={!canConfigure}
      >
        <PanelSection label="标题字段">
          <FieldSelect
            fields={source.fields}
            value={config.titleField}
            placeholder="选择字段"
            onValueChange={(fieldId) => patch({ titleField: fieldId })}
          />
        </PanelSection>
        <Separator />
        <PanelSection label="显示字段" hint="卡片上额外展示的字段">
          <CardFieldsList
            fields={source.fields.filter(
              (field) => field.id !== config.titleField,
            )}
            selected={cardFieldIds}
            onChange={(fieldIds) => patch({ cardFields: fieldIds })}
          />
        </PanelSection>
        <Separator />
        <SwitchRow
          label="紧凑卡片"
          checked={config.compact}
          onCheckedChange={(checked) => patch({ compact: checked })}
        />
      </SettingsPanel>

      {/* ——————— 排序 ——————— */}
      <SettingsPanel
        label="排序"
        icon={ArrowUpDown}
        active={Boolean(sortField)}
        value={sortField?.name}
        disabled={!canConfigure}
      >
        <PanelSection label="排序字段" hint="只影响每条泳道内部的卡片顺序">
          <FieldSelect
            fields={source.fields}
            value={config.sortBy?.fieldId ?? ""}
            placeholder="选择字段"
            noneLabel="不排序"
            onValueChange={(fieldId) =>
              patch({
                sortBy: fieldId
                  ? { fieldId, order: config.sortBy?.order ?? "asc" }
                  : undefined,
              })
            }
          />
        </PanelSection>
        {sortField && (
          <PanelSection label="方向">
            <ToggleGroup
              type="single"
              size="sm"
              value={config.sortBy?.order ?? "asc"}
              disabled={!canConfigure}
              onValueChange={(next) => {
                if (!next || !config.sortBy) return;
                patch({
                  sortBy: {
                    fieldId: config.sortBy.fieldId,
                    order: next as "asc" | "desc",
                  },
                });
              }}
            >
              <ToggleGroupItem value="asc" className="h-7 px-2 text-xs">
                升序
              </ToggleGroupItem>
              <ToggleGroupItem value="desc" className="h-7 px-2 text-xs">
                降序
              </ToggleGroupItem>
            </ToggleGroup>
          </PanelSection>
        )}
      </SettingsPanel>

      {/* ——————— 显示 ——————— */}
      <SettingsPanel
        label="显示"
        icon={SlidersHorizontal}
        disabled={!canConfigure}
      >
        <SwitchRow
          label="泳道计数"
          checked={config.showCardCount}
          onCheckedChange={(checked) => patch({ showCardCount: checked })}
        />
        <Separator />
        <SwitchRow
          label="允许拖拽"
          hint={
            canEditData
              ? "拖卡片到别的泳道即写回分组字段"
              : "当前数据只读，无法拖拽"
          }
          checked={config.allowDrag && canEditData}
          disabled={!canEditData}
          onCheckedChange={(checked) => patch({ allowDrag: checked })}
        />
        <SwitchRow
          label="允许新建卡片"
          hint={canInsertRow ? "在泳道内追加一行" : "当前数据源不支持新增记录"}
          checked={config.allowCreate && canInsertRow}
          disabled={!canInsertRow}
          onCheckedChange={(checked) => patch({ allowCreate: checked })}
        />
      </SettingsPanel>
    </ViewToolbar>
  );
}
