# AGENTS.md

**Generated:** 2026-04-22
**Project:** dBrain / interfaces

## OVERVIEW
This package contains shared TypeScript type definitions and domain models for the entire dBrain project, covering knowledge graph nodes, API contracts, and common data structures.

## STRUCTURE
The package is organized into five public entry points:
- `.` (root): Main entry that re-exports all public types
- `./api`: Type definitions for REST API requests and responses
- `./common`: Shared utility types and common data structures
- `./models`: Core domain model interfaces
- `./nodes`: Graph node type definitions for knowledge graph visualization

## WHERE TO LOOK
| What                | Location       | Notes                                  |
|---------------------|----------------|----------------------------------------|
| Graph node schemas  | `./nodes/`     | All node type definitions live here    |
| API contract types  | `./api/`       | Backend API request/response types     |
| Domain models       | `./models/`    | Core business entity interfaces        |
| Shared helper types | `./common/`    | Generic utilities and constants        |

## CONVENTIONS
- All public types are exported through the designated entry points
- Follows interface-first design: define shapes as interfaces, not classes
- Uses TypeScript strict mode with verbatimModuleSyntax enabled
- Internal imports always use `@workspace/*` scope for consistency

## ANTI-PATTERNS
- No implementation code allowed here: this is strictly for types and interfaces
- Don't duplicate existing type definitions across the codebase
- Don't import from internal nested paths: always use public entry points
- Avoid complex type aliases when a clear interface would work better
