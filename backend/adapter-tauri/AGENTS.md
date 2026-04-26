# PROJECT KNOWLEDGE BASE - backend/adapter-tauri

**Generated:** 2026-04-26
**Path:** backend/adapter-tauri
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW
Tauri IPC adapter — bridges desktop app with backend domain via Tauri's command system.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Tauri commands | src/ | IPC command handlers |
| Event emitters | src/ | Desktop-to-backend events |

## CONVENTIONS
- Commands expose use cases, not domain directly
- All commands run with desktop user's context
- File access through signed URLs only

## ANTI-PATTERNS
- **NEVER** expose raw database access
- **NEVER** bypass authorization checks
- **NEVER** allow file access without signed URL validation
