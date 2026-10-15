# dynamic-island/AGENTS.md

Scope: this directory and its children.
Parent rules: [../../../AGENTS.md](../../../AGENTS.md).

## Map

| Path | Role |
| --- | --- |
| `index.tsx` | Public exports for the shell, panels, and component types |
| `dynamic-island.tsx`, `nav.tsx`, `stage.tsx` | Controlled shell, navigation, and rendered layers |
| `forms.ts`, `geometry.ts`, `types.ts` | Panel dimensions, viewport constraints, and contracts |
| `layers.ts`, `motion.ts`, `tuning.ts`, `surface.ts` | Layer lifetime, transitions, motion settings, and appearance |
| `environment.ts`, `use-pill-box.ts`, `use-tuning.ts` | Platform preferences, measurement, and runtime tuning |
| `panels/` | Search and Agent bodies, their shared header, and search data types |
| `*.test.ts` | Geometry, layer handover, and tuning regression coverage |

## Rules

1. Keep the shell controlled. The app host owns routing, global shortcuts, and panel selection.
2. Keep feature data and store access in `panels/`; the shell receives bodies through `content`.
3. Keep pure geometry and transition rules independent of panel business logic.
4. Export shared panels through `index.tsx`. Do not recreate a separate quick panel.
