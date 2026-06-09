# Notepad: port-drag-element-behaviors

## Inherited Wisdom

### Pattern from custom-canvas-gesture.ts
- `register(behaviorId, BehaviorClass)` from `@antv/g6` to register custom behaviors
- `BaseBehavior<Options>` as base class extending pattern
- `ctrlPressed` and `altPressed` private flags tracked via keydown/keyup on container AND window
- `validate()` method checks `this.destroyed` and enable option
- `bindEvents()` / `unbindEvents()` pattern
- DOM events on container for keyboard, graph events via `graph.on(CommonEvent.XXX, handler)`
- Default cursor stored from `canvas.getConfig().cursor`

### Pattern from create-edge.ts
- Similar structure for event binding
- Uses `NodeEvent.DRAG_START`, `CanvasEvent.DRAG_START` from `@antv/g6`
- Alt key detection pattern

### G6 drag-element.ts Key Features to Port
- `DragElementOptions` interface with: `animation`, `enable`, `trigger`, `dropEffect`, `state`, `hideEdge`, `shadow`, `onFinish`, `cursor`
- Shadow node using `@antv/g` `Rect` shape appended to canvas with `$layer: 'transient'`
- HideEdge support: 'none' | 'all' | 'out' | 'in' | 'both'
- State-based multi-select via `graph.getElementDataByState('node', state)`
- `getSelectedNodeIDs()` returns all currently selected nodes + current target
- Shortcut key matching via `new Shortcut(context.graph)` and `shortcut.match(trigger)`
- `clampByRotation()` for rotated graph support
- `translateElementBy()` for moving nodes

### G6 drag-element-force.ts Key Features to Port
- Extends `DragElement` class
- `forceLayoutInstance` getter finds d3-force layout: `this.context.layout!.getLayoutInstance().find((layout) => ['d3-force', 'd3-force-3d'].includes(layout?.id))`
- `validate()` checks for force layout presence
- `moveElement()` uses `invokeLayoutMethod(layout, 'setFixedPosition', ...)`
- `onDragStart()` sets `alphaTarget(0.3)` and initial positions
- `onDragEnd()` sets `alphaTarget(0)` and optionally clears fixed position

### Key Differences from G6 (Must NOT have)
- NO combo support (dBrain only uses nodes and edges)
- NO dropEffect 'link' (combo parenting)
- ADD ctrl/alt key disabling (like custom-canvas-gesture)

### Register Call Format
```typescript
import { register } from '@antv/g6';
register('custom-drag-element', DragElement, true);  // true for override
register('custom-drag-element-force', DragElementForce, true);
```

### G6 Imports Used
```typescript
import { CommonEvent, NodeEvent, CanvasEvent, ComboEvent } from '@antv/g6';
import { register, BaseBehavior } from '@antv/g6';
import type { RuntimeContext, IPointerEvent, IDragEvent, IElementDragEvent, Point, Vector2, ID } from '@antv/g6';
import type { BaseBehaviorOptions } from '@antv/g6';
import { Shortcut, ShortcutKey } from '@antv/g6';
import type { EdgeDirection } from '@antv/g6';
```

### Behaviors.ts Update Required
- Change `type: "drag-element"` → `type: "custom-drag-element"`
- Change `type: "drag-element-force"` → `type: "custom-drag-element-force"`
- Add imports for the custom behaviors

---

## Decisions

### Naming Convention
- Files: `drag-element.ts`, `drag-element-force.ts`
- Registered behavior types: `"custom-drag-element"`, `"custom-drag-element-force"`

### Cursor Options Structure
```typescript
cursor?: {
  default?: Cursor;
  grab: Cursor;
  grabbing: Cursor;
};
```

### HideEdge Values
`'none' | 'all' | 'out' | 'in' | 'both'` (EdgeDirection type)

### Enable Elements
Only `['node']` (no combo support)

---

## Issues Encountered

### drag-element.ts (base class) import errors
The G6 source `drag-element.ts` imports from:
- `@antv/g` - `BaseStyleProps`, `Rect`
- `@antv/util` - `isFunction`

These packages are NOT re-exported from `@antv/g6` and are not direct dependencies of the graph package.

**Required fixes for drag-element.ts (Task 1):**
- Import `Rect` from `@antv/g6` (or use HTML-based shadow instead)
- Replace `isFunction` with `typeof xxx === 'function'`
- Or add `@antv/g` and `@antv/util` as dependencies

### drag-element-force.ts import issues
The following are NOT exported from `@antv/g6` public API:
- `print` - Use `console.warn` instead
- `getLayoutProperty` - Implemented inline as local function
- `add` (vector utils) - Vector addition done inline

### register() type issue
The `register` function expects specific category strings, not custom behavior names. Use `as any` cast for custom behaviors:
```typescript
register('custom-drag-element-force', DragElementForce as any, true);
```

### Cascading errors
Since `DragElementForce extends DragElement`, any errors in the base class cause errors in the derived class. TypeScript cannot resolve `protected` properties like `enable` when the base class has errors.

---

## 2026-05-27: drag-element.ts Implementation Complete

### Successful Patterns Used

1. **Import strategy**: Only use what's directly exported from `@antv/g6`:
   - `CommonEvent`, `BaseBehavior`, `register`
   - Types: `RuntimeContext`, `IPointerEvent`, `IElementDragEvent`, `Point`, `Vector2`, `ID`, `State`, `EdgeDirection`, `BaseBehaviorOptions`, `ShortcutKey`
   - Values: `Shortcut`, `idOf`

2. **Inline utility functions** for missing imports:
   ```typescript
   function isFunction(fn: unknown): fn is Function {
     return typeof fn === "function";
   }
   
   function divide(a: Point, b: number): Point {
     return [a[0] / b, a[1] / b];
   }
   
   function rotate(a: Point, angle: number): Vector2 {
     const cos = Math.cos(angle);
     const sin = Math.sin(angle);
     return [a[0] * cos - a[1] * sin, a[0] * sin + a[1] * cos] as Vector2;
   }
   ```

3. **Register call format** - uses category first, then type name:
   ```typescript
   register("behavior", "custom-drag-element", DragElement);
   ```

4. **Cursor type casting** - must cast to `any` since `Cursor` type not available:
   ```typescript
   canvas.setCursor((cursor?.grab || "grab") as any);
   ```

5. **Shadow feature omitted** - requires `@antv/g` `Rect` class with `$layer: 'transient'` which is not available

### Verification
- `pnpm --filter=graph typecheck` shows NO errors in `drag-element.ts`
- Remaining errors are in `api-client` (unrelated) and `drag-element-force.ts` (extends base class with its own issues)

### Files Created/Modified
- Created: `packages/graph/src/extensions/behaviors/drag-element.ts`
- Modified: `packages/graph/src/extensions/behaviors/index.ts` (added export)
