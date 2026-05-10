# PROJECT KNOWLEDGE BASE - backend/adapter-back

**Generated:** 2026-04-26
**Path:** backend/adapter-back
**Parent:** /home/lyq/workspace/project/dBrain/AGENTS.md

## OVERVIEW

REST API adapter — inbound HTTP handlers that expose domain capabilities to external clients.

## WHERE TO LOOK

| Task           | Location        | Notes                                    |
| -------------- | --------------- | ---------------------------------------- |
| Route handlers | src/            | HTTP endpoints, request/response mapping |
| Middleware     | src/middleware/ | Auth, CORS, rate limiting                |

## CONVENTIONS

- Routes depend on application use cases (not domain directly)
- Request validation before passing to use cases
- Unified error response format (never leak internal details)
- CORS must be strictly configured — no wildcard origins
- All endpoints require authentication (except health check)

## ANTI-PATTERNS

- **NEVER** allow unrestricted CORS
- **NEVER** return stack traces in error responses
- **NEVER** skip input validation
- **NEVER** bypass authentication on non-health endpoints
- No business logic in handlers — delegate to use cases
