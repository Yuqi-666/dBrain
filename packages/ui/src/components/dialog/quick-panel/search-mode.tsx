"use client";

import { useMemo, useState } from "react";
import { useDataStore, useUIStore } from "@workspace/store";
import { FilterQueryBuilder } from "@workspace/ui/components/filter/filter";
import { filterByViewFilterConfig } from "@workspace/utils";
import type { RuleGroupType } from "@workspace/utils";
import { buildNodeFilterFields, type View } from "@workspace/interfaces";
import { Search, Filter } from "lucide-react";
import { Input } from "@workspace/ui/components/ui/input";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  QUICK_TABS,
  stripSlashPrefix,
  normalizeKeyword,
  type QuickTabKey,
  type QuickSearchMatch,
  type QuickGroupKey,
} from "./quick-panel.type";
import { COMMANDS } from "../../command/command-registry";
import type { ArgCommand } from "../../command/command";

export interface SearchModeProps {
  className?: string;
}

export function SearchMode({ className }: SearchModeProps) {
  const nodes = useDataStore((state) => state.nodes);
  const edges = useDataStore((state) => state.edges);
  const nodeSemantics = useDataStore((state) => state.nodeSemantics);
  const edgeSemantics = useDataStore((state) => state.edgeSemantics);

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<QuickTabKey>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeArgForm, setActiveArgForm] = useState<ArgCommand | null>(null);
  const [filterQuery, setFilterQuery] = useState<RuleGroupType>({
    combinator: "and",
    rules: [],
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.startsWith("/") && activeTab !== "commands") {
      setActiveTab("commands");
    } else if (value.trim() === "" && activeTab === "commands") {
      setActiveTab("all");
    }
  };

  const activeTabConfig = QUICK_TABS.find((t) => t.key === activeTab);

  const filterableNodes = useMemo(() => {
    const hasRules = (filterQuery.rules?.length ?? 0) > 0;
    if (!hasRules) return nodes;

    // Search mode passes only `ruleGroup` (no `selectedNodes`); with the
    // UNION semantics this is a pure ruleGroup match — unchanged behavior.
    const view = { filterConfig: { ruleGroup: filterQuery } } as View;
    const { filteredNodes } = filterByViewFilterConfig(nodes, edges, view);
    return filteredNodes;
  }, [nodes, edges, filterQuery]);

  const filterFields = useMemo(
    () => buildNodeFilterFields(nodeSemantics),
    [nodeSemantics],
  );

  const setCurrentEditingNodeId = useUIStore(
    (state) => state.setCurrentEditingNodeId,
  );
  const closeQuickPanel = useUIStore((state) => state.closeQuickPanel);

  const results = useMemo<QuickSearchMatch[]>(() => {
    const term = normalizeKeyword(stripSlashPrefix(query));
    const matches: QuickSearchMatch[] = [];
    const kind = activeTabConfig?.kind;
    const typeSet = kind === "nodes" ? activeTabConfig?.nodeTypes : undefined;
    const showAll = activeTab === "all";

    if (kind === "nodes") {
      filterableNodes.forEach((node) => {
        if (typeSet && !typeSet.includes(node.nodeType)) return;
        if (term && !matchesNode(node, term)) return;
        const semantic = node.semanticId
          ? nodeSemantics.get(node.semanticId)
          : undefined;
        matches.push({
          id: node.id,
          title: node.title,
          subtitle: node.abstract,
          group: "nodes",
          icon: "node",
          nodeType: node.nodeType,
          semanticId: node.semanticId,
          semanticName: semantic?.name,
          color: semantic?.color,
          // Every other group filled this in; the node group did not, so the
          // button rendered with `onClick={undefined}` and a search result could
          // not be opened at all. Opening is the same store write the graph's
          // double-click uses, and it closes the panel first so the editor is not
          // mounted behind a modal.
          onSelect: () => {
            closeQuickPanel();
            setCurrentEditingNodeId(node.id);
          },
        });
      });
    }

    if (kind === "commands" || showAll) {
      COMMANDS.forEach((cmd) => {
        const haystack = normalizeKeyword(
          `${cmd.title} ${cmd.keywords.join(" ")}`,
        );
        if (term && !haystack.includes(term)) return;
        matches.push({
          id: cmd.id,
          title: cmd.title,
          group: "commands",
          icon: "command",
          onSelect: () => {
            if (cmd.requiresArgs) {
              setActiveArgForm(cmd);
            } else {
              cmd.run();
            }
          },
        });
      });
    }

    if (kind === "node-types" || showAll) {
      nodeSemantics.forEach((semantic) => {
        if (term && !matchesText(semantic.name, term)) return;
        matches.push({
          id: semantic.id,
          title: semantic.name,
          subtitle: semantic.description,
          group: "types",
          icon: "type",
          semanticKind: "node",
          color: semantic.color,
        });
      });
    }

    if (kind === "edge-types" || showAll) {
      edgeSemantics.forEach((semantic) => {
        if (term && !matchesText(semantic.name, term)) return;
        matches.push({
          id: semantic.id,
          title: semantic.name,
          subtitle: semantic.description,
          group: "types",
          icon: "type",
          edgeType: semantic.category,
          semanticKind: "edge",
          color: semantic.color,
        });
      });
    }

    return matches;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterableNodes,
    nodeSemantics,
    edgeSemantics,
    query,
    activeTab,
    closeQuickPanel,
    setCurrentEditingNodeId,
  ]);

  const grouped = useMemo(() => {
    const g: Record<QuickGroupKey, QuickSearchMatch[]> = {
      nodes: [],
      commands: [],
      types: [],
    };
    results.forEach((r) => g[r.group].push(r));
    return g;
  }, [results]);

  const renderGroup = (
    key: QuickGroupKey,
    label: string,
    items: QuickSearchMatch[],
  ) => {
    if (items.length === 0) return null;
    return (
      <div key={key} className="flex flex-col gap-1">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onSelect}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.semanticName && item.semanticName !== item.title && (
              <span
                className="max-w-[30%] truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: item.color ? `${item.color}1a` : undefined,
                  color: item.color ?? undefined,
                }}
              >
                {item.semanticName}
              </span>
            )}
            {item.semanticKind && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: item.color ? `${item.color}1a` : undefined,
                  color: item.color ?? undefined,
                }}
              >
                {item.semanticKind === "node" ? "节点" : "边"}
              </span>
            )}
            {item.subtitle && (
              <span className="max-w-[40%] truncate text-xs text-muted-foreground">
                {item.subtitle}
              </span>
            )}
            {item.nodeType && (
              <span className="text-xs text-muted-foreground">
                {item.nodeType}
              </span>
            )}
            {item.edgeType && (
              <span className="text-xs text-muted-foreground">
                {item.edgeType}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const filterCount = filterQuery.rules?.length ?? 0;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex flex-1 items-center">
          <Search className="absolute left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search nodes, commands, types..."
            className="pl-8 pr-2"
            autoFocus
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setFilterOpen((v) => !v)}
          aria-label="筛选"
          className={cn("relative", filterOpen && "bg-accent")}
        >
          <Filter />
          {filterCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 border-b px-3 py-2">
        {QUICK_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent",
              activeTab === tab.key && "bg-accent text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filterOpen && (
        <div className="border-b p-3">
          <FilterQueryBuilder
            fields={filterFields}
            query={filterQuery}
            onQueryChange={setFilterQuery}
          />
        </div>
      )}

      <div className="max-h-80 overflow-y-auto p-2">
        {renderGroup("nodes", "节点", grouped.nodes)}
        {renderGroup("commands", "命令", grouped.commands)}
        {renderGroup("types", "类型", grouped.types)}
        {results.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No results
          </p>
        )}
      </div>

      {activeArgForm &&
        activeArgForm.renderForm({
          open: true,
          onOpenChange: (open) => {
            if (!open) setActiveArgForm(null);
          },
        })}
    </div>
  );
}

function matchesNode(
  node: { title?: string; abstract?: string; semanticId?: string },
  term: string,
): boolean {
  return (
    matchesText(node.title, term) ||
    matchesText(node.abstract, term) ||
    matchesText(node.semanticId, term)
  );
}

function matchesText(value: string | undefined, term: string): boolean {
  if (!value) return false;
  return normalizeKeyword(value).includes(term);
}
