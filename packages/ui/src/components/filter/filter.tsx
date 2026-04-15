"use client";

import * as React from "react";
import { useState } from "react";
import {
  QueryBuilder,
  defaultCombinators,
  type RuleGroupType,
  type ControlElementsProp,
} from "@workspace/utils";
import "../../styles/query-builder.css";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/ui/tabs";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/ui/select";
import { Input } from "@workspace/ui/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Card, CardContent } from "@workspace/ui/components/ui/card";
import { Filter, Plus, Trash2, ChevronDown, X } from "lucide-react";

import { NODE_FILTER_FIELDS, EDGE_FILTER_FIELDS } from "@workspace/interfaces";
import type { RuleGroupType as CustomRuleGroupType } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";

// Custom shadcn components for react-querybuilder
const CombinatorSelector = ({ options, value, onChange }: any) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[100px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option: any) => (
          <SelectItem key={option.name} value={option.name}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const FieldSelector = ({ options, value, onChange }: any) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option: any) => (
          <SelectItem key={option.name} value={option.name}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const OperatorSelector = ({ options, value, onChange }: any) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[120px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option: any) => (
          <SelectItem key={option.name} value={option.name}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ValueEditor = ({
  value,
  onChange,
  type,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  type?: string;
}) => {
  return (
    <Input
      type={type || "text"}
      value={(value as string) || ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
      className="h-8 text-xs"
      placeholder="Enter value..."
    />
  );
};

const AddRuleAction = ({ onClick }: any) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-xs gap-1"
    >
      <Plus className="size-3" />
      Add Rule
    </Button>
  );
};

const AddGroupAction = ({ onClick }: any) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-xs gap-1"
    >
      <Plus className="size-3" />
      Add Group
    </Button>
  );
};

const RemoveGroupAction = ({ onClick }: any) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-xs text-destructive gap-1"
    >
      <Trash2 className="size-3" />
      Remove Group
    </Button>
  );
};

const RemoveRuleAction = ({ onClick }: any) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-destructive"
    >
      <X className="size-3" />
    </Button>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ShadcnFilterComponents: any = {
  combinatorSelector: CombinatorSelector,
  fieldSelector: FieldSelector,
  operatorSelector: OperatorSelector,
  valueEditor: ValueEditor,
  addRuleAction: AddRuleAction,
  addGroupAction: AddGroupAction,
  removeGroupAction: RemoveGroupAction,
  removeRuleAction: RemoveRuleAction,
};

// Filter Query Builder Wrapper
export interface FilterQueryBuilderProps {
  fields: any[];
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
  className?: string;
}

export const FilterQueryBuilder = ({
  fields,
  query,
  onQueryChange,
  className,
}: FilterQueryBuilderProps) => {
  return (
    <div className={cn("w-full", className)}>
      <QueryBuilder
        fields={fields}
        query={query}
        onQueryChange={onQueryChange}
        controlElements={ShadcnFilterComponents}
        combinators={defaultCombinators}
        showCombinatorsBetweenRules
        showNotToggle={false}
        showShiftActions={false}
        showCloneButtons={false}
        resetOnFieldChange={false}
        resetOnOperatorChange={false}
      />
    </div>
  );
};

// Main Filter Panel Component
export interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNodeQuery?: RuleGroupType;
  initialEdgeQuery?: RuleGroupType;
  onNodeFilterChange?: (query: RuleGroupType) => void;
  onEdgeFilterChange?: (query: RuleGroupType) => void;
}

const FilterPanel = ({
  open,
  onOpenChange,
  initialNodeQuery = {
    combinator: "and",
    rules: [],
  },
  initialEdgeQuery = {
    combinator: "and",
    rules: [],
  },
  onNodeFilterChange,
  onEdgeFilterChange,
}: FilterPanelProps) => {
  const [activeTab, setActiveTab] = useState<"nodes" | "edges">("nodes");
  const [nodeQuery, setNodeQuery] = useState<RuleGroupType>(initialNodeQuery);
  const [edgeQuery, setEdgeQuery] = useState<RuleGroupType>(initialEdgeQuery);

  const handleNodeQueryChange = (query: RuleGroupType) => {
    setNodeQuery(query);
    onNodeFilterChange?.(query);
  };

  const handleEdgeQueryChange = (query: RuleGroupType) => {
    setEdgeQuery(query);
    onEdgeFilterChange?.(query);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Filter className="size-5" />
            Filter
          </SheetTitle>
        </SheetHeader>
        <Tabs
          defaultValue="nodes"
          value={activeTab}
          onValueChange={(v: string) => setActiveTab(v as "nodes" | "edges")}
          className="w-full"
        >
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="nodes">Node Filters</TabsTrigger>
              <TabsTrigger value="edges">Edge Filters</TabsTrigger>
            </TabsList>
          </div>
          <div className="p-6 pt-4 h-[calc(100vh-140px)] overflow-y-auto">
            <TabsContent value="nodes" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <FilterQueryBuilder
                    fields={NODE_FILTER_FIELDS}
                    query={nodeQuery}
                    onQueryChange={handleNodeQueryChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="edges" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <FilterQueryBuilder
                    fields={EDGE_FILTER_FIELDS}
                    query={edgeQuery}
                    onQueryChange={handleEdgeQueryChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterPanel;
