# CreateEdge Behavior + graph-context-menu addEdge

## TL;DR

> **Quick Summary**: Implement alt+drag edge creation behavior for G6 graph and integrate with graph-context-menu for edge editing workflow.
>
> **Deliverables**:
> - `create-edge.ts` behavior: alt+drag from node or canvas to create edges
> - Multi-source support: drag from canvas with pre-selected nodes creates edges from all selected to target
> - `useGraphContextMenu.onCreateEdge`: actual edge creation via GraphCQRS
> - `graph-context-menu` addEdge branch: NodeList selection + GraphContextMenuEdge edit flow
>
> **Estimated Effort**: Large (6 new files, 5 modified files)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 → T4 → T7 → T9 → T11

---

## Context

### Original Request
User wants to create a CreateEdge behavior and graph-context-menu addEdge branch with:
1. **Trigger**: alt+drag
   - Scenario 1 (single-source): No pre-selected nodes → NodeEvent.DRAG_START → from dragged node
   - Scenario 2 (multi-source): Has pre-selected nodes → CanvasEvent.DRAG_START → from all selected nodes
2. **On POINTER_UP**: call `onCreateEdge(from, to)`
   - If `to` != null → create edge directly → enter GraphContextMenuEdge
   - If `to` == null → open NodeList to select target → create edge → enter GraphContextMenuEdge

### Metis Review Findings
**Critical Issues Identified**:
1. `onUpsertEdge` in useGraphContextMenu is NOT implemented (stub only logs warning)
2. G6's DRAG_START only fires for canvas by default in CustomCanvasGesture (blocks non-canvas)
3. Multi-source UI needs multiple assist edges (one per source)
4. "to == null" UI flow not designed (NodeList integration)

**Assumptions Made** (auto-resolved):
- Self-edge: Prevent (skip if source === target)
- Duplicate edge: Skip if edge already exists between source and target
- Default properties: direction="forward", edgeType="association", semanticId=""
- Drop on edge/non-node: Treated as "to == null", cancel edge creation
- Assist edge style: Dashed line, pointerEvents: none (following G6 create-edge pattern)

---

## Work Objectives

### Core Objective
Implement alt+drag edge creation with two modes (single-source from node, multi-source from canvas) and integrate with context menu for post-creation editing.

### Concrete Deliverables
- [ ] `packages/graph/src/extensions/behaviors/create-edge.ts` - CreateEdge behavior
- [ ] `packages/graph/src/extensions/behaviors/index.ts` - Export create-edge
- [ ] `packages/graph/src/extensions/index.ts` - Register create-edge
- [ ] `packages/graph/src/options/behaviors.ts` - Add to BASE_BEHAVIORS
- [ ] `packages/ui/src/components/graph-context-menu/useGraphContextMenu.ts` - Add working `onCreateEdge`
- [ ] `packages/ui/src/components/graph-context-menu/graph-context-menu.tsx` - Add addEdge mode
- [ ] `packages/ui/src/components/graph-context-menu/graph-context-menu-node.tsx` - Wire "Connect To" to addEdge

### Definition of Done
- [ ] alt+drag from node to node creates edge
- [ ] alt+drag cancelled (drop on canvas) does NOT create edge
- [ ] Context menu "Connect To" opens NodeList, creates edge on selection
- [ ] Multi-source (pre-selected) alt+drag from canvas creates multiple edges
- [ ] GraphContextMenuEdge opens after edge creation for editing

### Must Have
- Alt key must be pressed during entire drag operation
- Visual assist edge(s) during drag
- Proper cleanup on cancel/complete
- No modification to existing behaviors (click-select, lasso-select, drag-element, CustomCanvasGesture)

### Must NOT Have (Guardrails)
- No edge validation beyond node drop detection
- No new edge types or direction types
- No modification to CustomCanvasGesture.ts
- No test infrastructure (project has none per AGENTS.md)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: NONE
- **Agent-Executed QA**: YES (mandatory for all tasks)

### QA Policy
Every task includes agent-executed QA scenarios using:
- **Frontend/UI**: Playwright for browser interaction
- **Evidence path**: `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 4 tasks, MAX PARALLEL):
├── T1: Create create-edge.ts behavior (packages/graph/src/extensions/behaviors/create-edge.ts)
├── T2: Register create-edge in extensions/index.ts
├── T3: Export from behaviors/index.ts
└── T4: Add to BASE_BEHAVIORS in options/behaviors.ts

Wave 2 (Context Menu Integration - 3 tasks, MAX PARALLEL):
├── T5: Fix useGraphContextMenu - add working onCreateEdge
├── T6: Create graph-context-menu-add-edge.tsx component
└── T7: Wire graph-context-menu.tsx addEdge mode

Wave 3 (Integration - 1 task, after Wave 2):
└── T8: Wire graph-context-menu-node.tsx "Connect To" to addEdge flow

Wave 4 (Final Verification):
└── T9: Final QA - verify complete flow

Critical Path: T1 → T4 → T7 → T9
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

| Task | Blocks | Blocked By |
|------|--------|------------|
| T1 (create-edge.ts) | T4, T2 | - |
| T2 (register) | - | T1 |
| T3 (export) | - | T1 |
| T4 (BASE_BEHAVIORS) | - | T1 |
| T5 (onCreateEdge) | T7 | - |
| T6 (add-edge component) | T7 | - |
| T7 (wire menu) | T8 | T5, T6 |
| T8 (node wiring) | T9 | T7 |
| T9 (final QA) | - | T8 |

---

## TODOs

- [x] 1. **Create CreateEdge behavior class**

  **What to do**:
  - Create `packages/graph/src/extensions/behaviors/create-edge.ts`
  - Extend `BaseBehavior<CreateEdgeOptions>` following CustomCanvasGesture pattern
  - Implement alt key detection via container + window listeners (like ctrlPressed in CustomCanvasGesture)
  - Implement two trigger modes:
    - **Scenario 1** (no pre-selected): Listen to `NodeEvent.DRAG_START` when alt is pressed
    - **Scenario 2** (has pre-selected): Listen to `CanvasEvent.DRAG_START` when alt is pressed
  - On `POINTER_MOVE`: update assist edge(s) position
  - On `POINTER_UP`:
    - If dropped on node → `onCreateEdge(sourceIds, targetId)`
    - If dropped on canvas/non-node → cancel (no edge created)
  - Multi-source support: If multiple source nodes, create multiple assist edges (one per source)
  - Use `GraphCQRS.upsertEdge` for actual edge creation
  - Default edge properties: `direction="forward"`, `edgeType="association"`, `semanticId=""`
  - Self-edge prevention: Skip if source === target
  - Duplicate edge handling: Skip if edge already exists

  **Must NOT do**:
  - Do NOT modify CustomCanvasGesture.ts
  - Do NOT interfere with existing behaviors (click-select, lasso-select, drag-element)
  - Do NOT create edge without alt key pressed

  **Recommended Agent Profile**:
  > **Category**: `deep`
  > - Reason: Complex behavior logic with multiple event handlers, state management, and G6 integration
  > **Skills**: `[]`
  > - None needed - this is pure TypeScript/G6 integration
  > **Skills Evaluated but Omitted**:
  > - `frontend-design`: Not needed - no UI components

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: T4 (needs create-edge.ts to exist)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/graph/src/extensions/behaviors/custom-canvas-gesture.ts:22-47` - BaseBehavior pattern, event binding, alt/ctrl key detection via container+window listeners
  - `packages/graph/src/extensions/behaviors/custom-canvas-gesture.ts:49-91` - bindEvents/unbindEvents pattern
  - `node_modules/.pnpm/@antv+g6@5.0.51_.../behaviors/create-edge.js:28-113` - G6's createEdge behavior (reference only), handleCreateEdge, updateAssistEdge, drop pattern
  - `packages/api-client/src/cqrs/graph-cqrs.ts:189-216` - GraphCQRS.upsertEdge for actual edge creation
  - `packages/interfaces/src/models/edge/types.ts:19-31` - EdgeData interface, direction/edgeType types
  - `packages/store/src/graphStore.ts:307-320` - upsertEdge in graphStore

  **Acceptance Criteria**:
  - [ ] File created: packages/graph/src/extensions/behaviors/create-edge.ts
  - [ ] Class extends BaseBehavior<CreateEdgeOptions>
  - [ ] Alt key detection works (container + window listeners)
  - [ ] Scenario 1: NodeEvent.DRAG_START with alt starts edge creation from node
  - [ ] Scenario 2: CanvasEvent.DRAG_START with alt+pre-selected starts edge creation from all selected
  - [ ] POINTER_MOVE updates assist edge(s)
  - [ ] POINTER_UP calls onCreateEdge with sourceIds and targetId
  - [ ] Self-edge prevention implemented
  - [ ] Duplicate edge handling (skip if exists) implemented

  **QA Scenarios**:

  \`\`\`
  Scenario: Single-source alt+drag from node to node creates edge
    Tool: Playwright
    Preconditions: Web app running, graph with 2+ nodes visible
    Steps:
      1. Press and hold Alt key
      2. Click and drag from node A
      3. Release on node B
      4. Release Alt key
    Expected Result: Edge A→B is created and visible in graph
    Failure Indicators: No edge created, or edge created without alt key
    Evidence: .sisyphus/evidence/task-1-single-source-edge.webp

  Scenario: Alt+drag cancelled (drop on canvas) does NOT create edge
    Tool: Playwright
    Preconditions: Web app running, graph with nodes visible
    Steps:
      1. Press and hold Alt key
      2. Click and drag from node A
      3. Release on empty canvas (not on any node)
    Expected Result: No edge is created
    Failure Indicators: Edge created when dropping on canvas
    Evidence: .sisyphus/evidence/task-1-cancel-no-edge.webp

  Scenario: Multi-source alt+drag from canvas creates multiple edges
    Tool: Playwright
    Preconditions: Web app running, graph with 3+ nodes, nodes A,B selected
    Steps:
      1. Press and hold Alt key
      2. Click and drag from empty canvas area
      3. Release on node C
    Expected Result: Edges A→C and B→C are both created
    Failure Indicators: Only one edge created, or wrong nodes connected
    Evidence: .sisyphus/evidence/task-1-multi-source-edges.webp
  \`\`\`

  **Commit**: YES (grouped with T2, T3, T4)
  - Message: `feat(graph): add CreateEdge behavior`
  - Files: `packages/graph/src/extensions/behaviors/create-edge.ts`

---

- [x] 2. **Register CreateEdge in extensions/index.ts**

  **What to do**:
  - Add to `packages/graph/src/extensions/index.ts`
  - Import CreateEdge from `./behaviors/create-edge`
  - Register with: `register(ExtensionCategory.BEHAVIOR, "create-edge", CreateEdge)`

  **Must NOT do**:
  - Do NOT change existing registrations

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple one-file modification following existing pattern
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: None
  - **Blocked By**: T1 (needs CreateEdge class to exist)

  **References**:
  - `packages/graph/src/extensions/index.ts` - Existing registration pattern for behaviors

  **Acceptance Criteria**:
  - [ ] CreateEdge registered with ExtensionCategory.BEHAVIOR and name "create-edge"

  **QA Scenarios**:
  \`\`\`
  Scenario: CreateEdge is registered and can be used in behavior config
    Tool: Bash
    Preconditions: TypeScript files exist
    Steps:
      1. Run pnpm --filter=graph typecheck
    Expected Result: No type errors related to CreateEdge registration
    Failure Indicators: Type error "Cannot find name 'CreateEdge'"
    Evidence: .sisyphus/evidence/task-2-typecheck.log
  \`\`\`

  **Commit**: YES (grouped with T1, T3, T4)

---

- [x] 3. **Export CreateEdge from behaviors/index.ts**

  **What to do**:
  - Add to `packages/graph/src/extensions/behaviors/index.ts`
  - Add: `export * from "./create-edge"`

  **Must NOT do**:
  - Do NOT modify existing exports

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple one-line addition to barrel file
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: None
  - **Blocked By**: T1 (needs create-edge.ts to exist)

  **References**:
  - `packages/graph/src/extensions/behaviors/index.ts` - Existing barrel file

  **Acceptance Criteria**:
  - [ ] `export * from "./create-edge"` present in index.ts

  **QA Scenarios**:
  \`\`\`
  Scenario: Export is present and typecheck passes
    Tool: Bash
    Preconditions: Index file updated
    Steps:
      1. Run pnpm --filter=graph typecheck
    Expected Result: Pass with no errors
    Failure Indicators: Export not found
    Evidence: .sisyphus/evidence/task-3-typecheck.log
  \`\`\`

  **Commit**: YES (grouped with T1, T2, T4)

---

- [x] 4. **Add CreateEdge to BASE_BEHAVIORS in behaviors.ts**

  **What to do**:
  - Add to `packages/graph/src/options/behaviors.ts`
  - Add import to register behavior (triggers side-effect registration)
  - Add CreateEdge behavior config to BASE_BEHAVIORS array with `type: "create-edge"`
  - Pass `onCreateEdge` callback that will be provided by graph component

  **Must NOT do**:
  - Do NOT modify existing behavior configurations
  - Do NOT change the structure of BASE_BEHAVIORS

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Small modification following existing patterns
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: None (needed later but can parallelize this step)
  - **Blocked By**: T1 (needs CreateEdge registered first)

  **References**:
  - `packages/graph/src/options/behaviors.ts:1-8` - Import pattern for side-effect registration
  - `packages/graph/src/options/behaviors.ts:22-109` - BASE_BEHAVIORS array structure and behavior config pattern

  **Acceptance Criteria**:
  - [ ] CreateEdge behavior config added to BASE_BEHAVIORS
  - [ ] Type includes `type: "create-edge"` and appropriate key

  **QA Scenarios**:
  \`\`\`
  Scenario: CreateEdge added to BASE_BEHAVIORS and typecheck passes
    Tool: Bash
    Preconditions: behaviors.ts updated
    Steps:
      1. Run pnpm --filter=graph typecheck
    Expected Result: Pass
    Failure Indicators: Type error in behaviors.ts
    Evidence: .sisyphus/evidence/task-4-typecheck.log
  \`\`\`

  **Commit**: YES (grouped with T1, T2, T3)

---

- [x] 5. **Fix useGraphContextMenu - add working onCreateEdge**

  **What to do**:
  - Modify `packages/ui/src/components/graph-context-menu/useGraphContextMenu.ts`
  - Replace stub `onUpsertEdge` with actual `onCreateEdge(from, to)` implementation
  - Generate UUID for edge id
  - Set default edge properties: `direction="forward"`, `edgeType="association"`, `semanticId=""`
  - Use `GraphCQRS.upsertEdge(edgeData)` to create edge
  - Return the created edge's id
  - Self-edge prevention: if `from === to`, return null/undefined
  - Duplicate edge handling: Check if edge already exists in store, skip if so

  **Must NOT do**:
  - Do NOT change the signature of existing callbacks
  - Do NOT add new dependencies

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Implementing a stub method with proper logic, straightforward
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7)
  - **Blocks**: T7 (graph-context-menu.tsx needs onCreateEdge)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/ui/src/components/graph-context-menu/useGraphContextMenu.ts:165-167` - Existing stub
  - `packages/api-client/src/cqrs/graph-cqrs.ts:189-216` - GraphCQRS.upsertEdge usage
  - `packages/interfaces/src/models/edge/types.ts:19-31` - EdgeData shape
  - `packages/store/src/graphStore.ts:307-320` - upsertEdge store action
  - `packages/store/src/graphStore.ts:406-411` - getEdgesForNode getter

  **Acceptance Criteria**:
  - [ ] `onCreateEdge(from, to)` method exists and returns edgeId or null
  - [ ] Edge created via GraphCQRS.upsertEdge with correct EdgeData shape
  - [ ] Self-edge prevention works (from === to returns null)
  - [ ] Duplicate edge handling works (skip if exists)

  **QA Scenarios**:

  \`\`\`
  Scenario: onCreateEdge creates edge with correct properties
    Tool: Playwright
    Preconditions: Web app running, graph with 2 nodes
    Steps:
      1. Call onCreateEdge(nodeAId, nodeBId) directly
    Expected Result: Edge created with direction=forward, edgeType=association, semanticId=""
    Failure Indicators: Wrong default values, or edge not created
    Evidence: .sisyphus/evidence/task-5-edge-created.webp

  Scenario: Self-edge prevention
    Tool: Bash (unit test via node)
    Preconditions: onCreateEdge implemented
    Steps:
      1. Call onCreateEdge(sameNodeId, sameNodeId)
    Expected Result: Returns null, no edge created
    Failure Indicators: Edge created with same source and target
    Evidence: .sisyphus/evidence/task-5-self-edge-blocked.log
  \`\`\`

  **Commit**: YES (grouped with T6, T7)
  - Files: `packages/ui/src/components/graph-context-menu/useGraphContextMenu.ts`

---

- [x] 6. **Create graph-context-menu-add-edge.tsx component**

  **What to do**:
  - Create `packages/ui/src/components/graph-context-menu/graph-context-menu-add-edge.tsx`
  - This component handles the "to == null" case (user dropped on canvas)
  - Show NodeList for target node selection
  - After node selected, call onCreateEdge and then show GraphContextMenuEdge
  - Props:
    - `sourceIds: string[]` - source node ID(s)
    - `onCreateEdge: (from: string, to: string) => void` - callback to create edge
    - `onClose: () => void` - close menu callback
    - `onEditEdge: (edgeId: string) => void` - callback to enter edge edit mode
  - Use `NodeList` component for target selection
  - After target selected, call onCreateEdge, then call onEditEdge with new edge ID

  **Must NOT do**:
  - Do NOT create edge here directly - delegate to onCreateEdge callback
  - Do NOT handle edge edit UI - just trigger onEditEdge callback

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: UI component with state management and transitions
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7)
  - **Blocks**: T7 (needs this component to exist)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/ui/src/components/graph-context-menu/graph-context-menu-edge.tsx:42-117` - GraphContextMenuEdge pattern (for reference)
  - `packages/ui/src/components/list/node/node-list.tsx:18-82` - NodeList component API (onSelect, onClose)
  - `packages/ui/src/components/graph-context-menu/graph-context-menu-node.tsx:38-47` - "Connect To" pattern for reference

  **Acceptance Criteria**:
  - [ ] File created: graph-context-menu-add-edge.tsx
  - [ ] NodeList used for target selection
  - [ ] onCreateEdge called with source and target after selection
  - [ ] onEditEdge called with new edge ID after creation

  **QA Scenarios**:

  \`\`\`
  Scenario: NodeList appears when to == null
    Tool: Playwright
    Preconditions: Web app running, context menu in addEdge mode
    Steps:
      1. Open context menu in addEdge mode (to == null)
    Expected Result: NodeList dropdown is visible with search input
    Failure Indicators: NodeList not shown, or search doesn't work
    Evidence: .sisyphus/evidence/task-6-nodelist-visible.webp

  Scenario: Edge created after node selection
    Tool: Playwright
    Preconditions: Web app running, addEdge mode with sourceIds=[nodeA]
    Steps:
      1. Select nodeB from NodeList
    Expected Result: Edge A→B created, GraphContextMenuEdge opens for edge B
    Failure Indicators: No edge created, or wrong edge
    Evidence: .sisyphus/evidence/task-6-edge-created-then-edit.webp
  \`\`\`

  **Commit**: YES (grouped with T5, T7)
  - Files: `packages/ui/src/components/graph-context-menu/graph-context-menu-add-edge.tsx`

---

- [x] 7. **Wire graph-context-menu.tsx addEdge mode**

  **What to do**:
  - Modify `packages/ui/src/components/graph-context-menu/graph-context-menu.tsx`
  - Add `addEdgeSourceIds` prop (optional string[] for multi-source)
  - Modify menu branching logic:
    - If `target.type === "addEdge"` → show GraphContextMenuAddEdge
    - GraphContextMenuNode "Connect To" should set `target: { type: "addEdge", id: nodeId }` with `addEdgeSourceIds: [nodeId]`
  - When CreateEdge behavior calls `onCreateEdge(from, to)`:
    - If `to != null`: create edge via onCreateEdge, then set target to edge edit mode
    - If `to == null`: set target to addEdge mode with sourceIds=from
  - Add internal state or callback to track "entering edge edit mode after creation"

  **Must NOT do**:
  - Do NOT change existing target.type handling for "node", "edge", "canvas"
  - Do NOT modify GraphContextMenuEdge component

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Complex state management and menu branching logic
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6)
  - **Blocks**: T8 (needs this wired)
  - **Blocked By**: T5 (onCreateEdge needed), T6 (component needed)

  **References**:
  - `packages/ui/src/components/graph-context-menu/graph-context-menu.tsx:14-22` - Props interface
  - `packages/ui/src/components/graph-context-menu/graph-context-menu.tsx:40-100` - Menu branching logic
  - `packages/ui/src/components/graph-context-menu/useGraphContextMenu.ts:224-233` - Return interface

  **Acceptance Criteria**:
  - [ ] addEdge mode supported via target.type === "addEdge"
  - [ ] GraphContextMenuAddEdge renders when in addEdge mode
  - [ ] CreateEdge callback triggers correct menu mode

  **QA Scenarios**:

  \`\`\`
  Scenario: Context menu shows addEdge mode after Connect To click
    Tool: Playwright
    Preconditions: Web app running
    Steps:
      1. Right-click node A
      2. Click "Connect To"
    Expected Result: Context menu transitions to addEdge mode with NodeList
    Failure Indicators: Wrong menu shown, or error
    Evidence: .sisyphus/evidence/task-7-connect-to-nodelist.webp
  \`\`\`

  **Commit**: YES (grouped with T5, T6)
  - Files: `packages/ui/src/components/graph-context-menu/graph-context-menu.tsx`

---

- [x] 8. **Wire graph-context-menu-node.tsx Connect To to addEdge flow**

  **What to do**:
  - Modify `packages/ui/src/components/graph-context-menu/graph-context-menu-node.tsx`
  - Change `onAddEdge` callback to trigger addEdge mode instead of current stub
  - Current stub only logs - need to actually set the context menu to addEdge mode
  - The component needs to communicate with parent to change menu mode
  - Options:
    - Option A: Pass `setMenuMode("addEdge", sourceIds)` callback
    - Option B: Call `onAddEdge(nodeId)` which internally triggers menu mode change
  - Recommend: Pass `onStartAddEdge(sourceNodeId)` to parent, parent manages menu mode

  **Must NOT do**:
  - Do NOT create edge in this component (that's handled by GraphContextMenuAddEdge)

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Small change - wire existing callback to new mode
  > **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (must be after T7)
  - **Parallel Group**: Wave 3 (only task)
  - **Blocks**: T9 (final QA)
  - **Blocked By**: T7

  **References**:
  - `packages/ui/src/components/graph-context-menu/graph-context-menu-node.tsx:38-47` - Current "Connect To" item
  - `packages/ui/src/components/graph-context-menu/graph-context-menu.tsx:79-86` - How node menu is rendered

  **Acceptance Criteria**:
  - [ ] "Connect To" triggers addEdge mode with source node ID

  **QA Scenarios**:

  \`\`\`
  Scenario: Connect To triggers addEdge mode
    Tool: Playwright
    Preconditions: Web app running
    Steps:
      1. Right-click node A
      2. Click "Connect To" menu item
    Expected Result: Menu shows NodeList for target selection
    Failure Indicators: Error or different menu shown
    Evidence: .sisyphus/evidence/task-8-connect-to-works.webp
  \`\`\`

  **Commit**: YES (standalone)
  - Files: `packages/ui/src/components/graph-context-menu/graph-context-menu-node.tsx`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm --filter=graph typecheck && pnpm --filter=ui typecheck`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Typecheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `feat(graph): add CreateEdge behavior and context menu integration` - create-edge.ts, useGraphContextMenu.ts, graph-context-menu.tsx, graph-context-menu-node.tsx, graph-context-menu-add-edge.tsx, behaviors.ts, extensions/index.ts, behaviors/index.ts
  - Pre-commit: `pnpm --filter=graph typecheck && pnpm --filter=ui typecheck`

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter=graph typecheck  # Expected: pass
pnpm --filter=ui typecheck     # Expected: pass
```

### Final Checklist
- [ ] All Must Have present
- [ ] All Must NOT Have absent
- [ ] Alt+drag creates edges correctly
- [ ] Context menu "Connect To" works
- [ ] Multi-source edge creation works
- [ ] GraphContextMenuEdge opens after creation
