# Work Plan: Port drag-element and drag-element-force to Custom Behaviors

## Context

### Original Request
Port `drag-element` and `drag-element-force` behaviors from `@antv/g6` into custom behaviors located at `dBrain/packages/graph/src/extensions/behaviors`, referencing `custom-canvas-gesture.ts` for the disabled key pattern (ctl and alt).

### Source Files
- `/home/lyq/workspace/project/dBrain/node_modules/.pnpm/@antv+g6@5.0.51_workerize-loader@2.0.2_webpack@5.106.2_/node_modules/@antv/g6/src/behaviors/drag-element.ts`
- `/home/lyq/workspace/project/dBrain/node_modules/.pnpm/@antv+g6@5.0.51_workerize-loader@2.0.2_webpack@5.106.2_/node_modules/@antv/g6/src/behaviors/drag-element-force.ts`

### Reference Implementation
- `custom-canvas-gesture.ts` - Shows pattern for disabling ctrl/alt keys

### Interview Summary
- **User wants**: Custom implementations of drag-element and drag-element-force
- **Reason**: To have control over the behavior, specifically to add ctrl/alt key disabling like custom-canvas-gesture
- **Pattern**: Follow custom-canvas-gesture's register + extend BaseBehavior pattern

## Work Objectives

### Core Objective
Create two new custom behavior files that replicate the G6 drag-element and drag-element-force functionality, with the addition of ctrl/alt key disabling.

### Concrete Deliverables
- `packages/graph/src/extensions/behaviors/drag-element.ts` - Custom drag element behavior
- `packages/graph/src/extensions/behaviors/drag-element-force.ts` - Custom drag with force layout
- Update `packages/graph/src/extensions/behaviors/index.ts` to export the new behaviors
- Update `packages/graph/src/options/behaviors.ts` to use the custom behaviors

### Definition of Done
- [ ] `drag-element.ts` compiles without errors
- [ ] `drag-element-force.ts` compiles without errors
- [ ] Both are exported from `index.ts`
- [ ] `behaviors.ts` imports and uses the custom behaviors instead of G6 built-ins

### Must Have
- Full drag functionality: drag start, drag, drag end
- Shadow node support
- HideEdge support (none/all/out/in/both)
- State-based multi-select handling
- Cursor handling (default/grab/grabbing)
- **Ctrl and Alt key disabling** (referencing custom-canvas-gesture pattern)
- Force layout integration for drag-element-force

### Must NOT Have
- Combo support (not used in dBrain - only nodes and edges)
- dropEffect 'link' functionality (combo parenting)
- Direct modification of G6's original behavior files

---

## TODOs

---

- [x] 1. Create drag-element.ts - Custom drag element behavior

  **What to do**:
  - Create `packages/graph/src/extensions/behaviors/drag-element.ts`
  - Define `DragElementOptions` interface extending BaseBehaviorOptions
  - Implement `DragElement` class extending `BaseBehavior<DragElementOptions>`
  - Port all functionality from G6 source:
    - `enable`, `trigger`, `dropEffect`, `state`, `hideEdge`, `shadow`, `onFinish`, `cursor` options
    - `bindEvents()` / `unbindEvents()` with DRAG_START, DRAG, DRAG_END, POINTER_ENTER, POINTER_LEAVE
    - Shadow node creation and movement
    - Edge hiding/showing
    - Multi-select handling via state
    - **Add ctrl/alt key disabling from custom-canvas-gesture pattern**
  - Register behavior with `register()`

  **Must NOT do**:
  - Combo support (simplify by removing combo-related code)
  - dropEffect 'link' (combo parenting)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex behavior implementation requiring careful port of many features
  - **Skills**: []
    - No specific skills needed beyond TypeScript/G6 knowledge

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/graph/src/extensions/behaviors/custom-canvas-gesture.ts` - BaseBehavior pattern, ctrl/alt key disabling, register(), bindEvents/unbindEvents pattern
  - `packages/graph/src/extensions/behaviors/create-edge.ts` - Another behavior example with similar patterns

  **API/Type References** (contracts to implement against):
  - G6 source: `drag-element.ts` - Full implementation reference (492 lines)
  - G6 types: `DragElementOptions`, `IElementDragEvent`, `IPointerEvent`, `Point`, `Vector2`, `State`, `ID`

  **External References** (libraries and frameworks):
  - G6 BaseBehavior: `@antv/g6` - Base class extending pattern
  - G6 CommonEvent: `@antv/g6` - DRAG_START, DRAG, DRAG_END, POINTER_ENTER, POINTER_LEAVE constants

  **WHY Each Reference Matters**:
  - `custom-canvas-gesture.ts` provides the exact pattern for: extending BaseBehavior, registering behavior, disabling ctrl/alt keys, bindEvents/unbindEvents pattern
  - `create-edge.ts` shows another behavior implementation in the same codebase for consistency
  - G6 `drag-element.ts` is the full reference implementation to port

  **Acceptance Criteria**:

  - [ ] File created: packages/graph/src/extensions/behaviors/drag-element.ts
  - [ ] TypeScript compiles without errors (pnpm --filter=graph typecheck)
  - [ ] Behavior is registered via `register()` from `@antv/g6`
  - [ ] All drag events (DRAG_START, DRAG, DRAG_END) are bound
  - [ ] Ctrl and Alt keys disable dragging (like custom-canvas-gesture)
  - [ ] Shadow node support works
  - [ ] HideEdge support works
  - [ ] Multi-select via state works

  **QA Scenarios**:

  ```
  Scenario: Basic node drag
    Tool: Bash (typecheck)
    Preconditions: Graph with nodes
    Steps:
      1. pnpm --filter=graph typecheck
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/task-1-typecheck.txt

  Scenario: Behavior registration
    Tool: Bash (grep)
    Preconditions: drag-element.ts file exists
    Steps:
      1. grep -n "register.*DragElement" packages/graph/src/extensions/behaviors/drag-element.ts
    Expected Result: Found register call
    Evidence: .sisyphus/evidence/task-1-registration.txt
  ```

  **Commit**: NO

---

- [x] 2. Create drag-element-force.ts - Custom drag with force layout

  **What to do**:
  - Create `packages/graph/src/extensions/behaviors/drag-element-force.ts`
  - Define `DragElementForceOptions` extending `DragElementOptions` minus animation/dropEffect/shadow
  - Implement `DragElementForce` class extending `DragElement`
  - Port force layout integration:
    - `forceLayoutInstance` getter to find d3-force layout
    - Override `validate()` to check for force layout
    - Override `moveElement()` to use `setFixedPosition`
    - Override `onDragStart()` to set alphaTarget(0.3) and initial positions
    - Override `onDragEnd()` to set alphaTarget(0) and optionally clear fixed position
  - Register behavior with `register()`

  **Must NOT do**:
  - animation, dropEffect, shadow options (removed per interface)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Force layout integration is complex
  - **Skills**: []
    - No specific skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: None (can start immediately, but Task 1 is dependency for reference)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/graph/src/extensions/behaviors/custom-canvas-gesture.ts` - Registration pattern
  - G6 source: `drag-element-force.ts` - Full implementation (122 lines)

  **API/Type References** (contracts to implement against):
  - G6 source: `DragElementForceOptions`, `DragElement` (base class)
  - Layout utilities: `getLayoutProperty`, `invokeLayoutMethod`

  **WHY Each Reference Matters**:
  - G6 `drag-element-force.ts` is the exact implementation to port

  **Acceptance Criteria**:

  - [ ] File created: packages/graph/src/extensions/behaviors/drag-element-force.ts
  - [ ] TypeScript compiles without errors (pnpm --filter=graph typecheck)
  - [ ] Extends DragElement base class
  - [ ] forceLayoutInstance getter finds d3-force layout
  - [ ] onDragStart sets fixed positions and alphaTarget(0.3)
  - [ ] onDragEnd sets alphaTarget(0)

  **QA Scenarios**:

  ```
  Scenario: Force drag compiles
    Tool: Bash (typecheck)
    Preconditions: Graph with nodes
    Steps:
      1. pnpm --filter=graph typecheck
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/task-2-typecheck.txt
  ```

  **Commit**: NO

---

- [x] 3. Update index.ts to export new behaviors

  **What to do**:
  - Add export lines to `packages/graph/src/extensions/behaviors/index.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple export addition
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `packages/graph/src/extensions/behaviors/index.ts` - Current exports

  **Acceptance Criteria**:

  - [ ] exports DragElement
  - [ ] exports DragElementForce
  - [ ] pnpm --filter=graph typecheck passes

  **QA Scenarios**:

  ```
  Scenario: Exports exist
    Tool: Bash
    Preconditions: index.ts updated
    Steps:
      1. grep "DragElement" packages/graph/src/extensions/behaviors/index.ts
    Expected Result: Both DragElement and DragElementForce are exported
    Evidence: .sisyphus/evidence/task-3-exports.txt
  ```

  **Commit**: NO

---

- [x] 4. Update behaviors.ts to use custom behaviors

  **What to do**:
  - Update `packages/graph/src/options/behaviors.ts`
  - Change imports to use custom behaviors instead of G6 built-ins
  - Import the custom behaviors: `import "../extensions/behaviors/drag-element";` and `import "../extensions/behaviors/drag-element-force";`
  - Keep the same behavior configurations (key, state, etc.)

  **Must NOT do**:
  - Change the behavior configuration options (they should work the same way)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple import change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 3

  **References**:
  - `packages/graph/src/options/behaviors.ts` - Current behavior config
  - `packages/graph/src/extensions/behaviors/index.ts` - What to import

  **Acceptance Criteria**:

  - [ ] Custom behaviors are imported
  - [ ] Behavior configs use "custom-drag-element" and "custom-drag-element-force" type names (or similar naming to distinguish from G6 built-ins)
  - [ ] pnpm --filter=graph typecheck passes

  **QA Scenarios**:

  ```
  Scenario: behaviors.ts uses custom behaviors
    Tool: Bash
    Preconditions: behaviors.ts updated
    Steps:
      1. grep "custom-drag" packages/graph/src/options/behaviors.ts
    Expected Result: Found custom behavior type names
    Evidence: .sisyphus/evidence/task-4-custom-imports.txt
  ```

  **Commit**: NO

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search for forbidden patterns. Check evidence files exist in .sisyphus/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm --filter=graph typecheck` and `pnpm --filter=graph lint`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep).
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- No commits - user requested just the implementation files

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter=graph typecheck  # Expected: no errors
grep "DragElement" packages/graph/src/extensions/behaviors/index.ts  # Expected: both exports
grep "custom-drag" packages/graph/src/options/behaviors.ts  # Expected: custom behavior type names
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Both TypeScript files compile without errors
- [ ] Both behaviors are exported from index.ts
- [ ] behaviors.ts uses the custom behaviors instead of G6 built-ins
