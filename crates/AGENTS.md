# PROJECT KNOWLEDGE BASE (crates/)

## OVERVIEW
This directory holds all Rust crates for dBrain, organized following clean architecture principles.

## STRUCTURE
```
crates/
├── domain/         → Entities and value objects (core business models)
├── application/    → Use cases and business services
├── infrastructure/ → Repository implementations and external API integrations
├── adapter-back/   → REST API adapter for backend server
├── adapter-front/  → Adapter for frontend communication
├── adapter-tauri/  → Tauri IPC adapter for desktop app
└── tauri-core/     → Shared Tauri runtime and utilities
```

## WHERE TO LOOK
- Core business rules: `domain/src`
- Business workflows and use cases: `application/src`
- Database and external service implementations: `infrastructure/src`
- API endpoint bindings: `adapter-back/src`
- Desktop IPC handlers: `adapter-tauri/src`
- Reusable Tauri setup code: `tauri-core/src`

## CONVENTIONS
- Strict dependency rule: Outer layers can depend on inner layers, never the reverse
- Rust 2024 edition for all crates except `adapter-tauri` which uses 2021 for Tauri compatibility
- Each crate is standalone, no root Cargo.toml at the crates/ level
- Tests are written inline in `src/lib.rs` using `#[cfg(test)]` blocks
- All crates currently include simple placeholder tests that verify 2+2=4
- Follow standard Rust naming conventions and cargo formatting rules

## ANTI-PATTERNS
- DO NOT add business logic to adapter crates
- DO NOT create a root Cargo.toml - keep crates standalone
- DO NOT break the dependency rule: domain must not depend on application or infrastructure
- DO NOT remove the placeholder tests until you add actual tests
- Avoid large monolithic crates - keep responsibilities separated by layer