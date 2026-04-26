# PROJECT KNOWLEDGE BASE - backend/adapter-front

**Generated:** 2026-04-26
**Path:** backend/adapter-front
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW
Frontend adapter — handles WebSocket connections and serves the Next.js frontend (SSR/SSG).

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| WebSocket handlers | src/ | Real-time communication |
| Frontend serving | src/ | Static/SSR frontend delivery |

## CONVENTIONS
- WebSocket connections authenticated via JWT
- All queries must carry user_id condition for data isolation
- Refresh token rotation for session management
- Rate limiting on all endpoints

## ANTI-PATTERNS
- **NEVER** allow cross-user data access
- **NEVER** skip user_id filtering in queries
- **NEVER** store tokens in localStorage — use httpOnly cookies
- No direct database access — all through repositories
