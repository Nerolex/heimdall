# Heimdall Constitution

## Core Principles

### I. Modular-First

Every dashboard view is a self-contained component with its own config schema, rendering logic, and data fetching. Components must be independently addable/removable without affecting others. No cross-component dependencies.

### II. Configuration-Driven

The dashboard layout, component selection, and component settings are defined entirely through configuration (e.g., JSON/YAML). No code changes required to rearrange or reconfigure views. Config is the single source of truth for what the dashboard displays.

### III. Dual-Mode Operation

The application is designed to support both headless (browser-only, no window) and headed (kiosk/window) modes from the same codebase. Headless mode is required for core operation; headed mode can be delivered by a dedicated runtime package (Electron) without forking dashboard logic. Mode selection remains a runtime concern, not a build-time decision.

### IV. Local-Network-First

Designed for self-hosting on a local network. No cloud dependencies required for core functionality. All data stays on the user's network. External service integrations (weather, calendar, etc.) are optional and handled by individual components.

### V. Simplicity (YAGNI)

Start with the simplest implementation that works. No premature abstractions, no over-engineering. Add complexity only when a concrete requirement demands it.

### VI. Human-Maintainable Code

Code must be concise, tested, and immediately understandable by a solo maintainer. Prefer fewer lines of clear code over abstractions. Every module must have tests. If a piece of code requires extensive comments to explain, it's too complex — simplify it.

## Technology Constraints

- **Runtime**: Node.js 20+ (LTS)
- **Language**: TypeScript (full-stack)
- **Frontend**: React with Vite
- **Backend**: Express or Fastify (lightweight HTTP server)
- **Headed mode**: Electron (for kiosk/window display)
- **Monorepo**: Shared types between frontend and backend
- **Package manager**: pnpm
- **Testing**: Vitest (unit), Playwright (E2E)
- **Dependencies**: Keep minimal — every new dependency must be justified

## Development Workflow

- **Commit style**: Messages complete the sentence "This commit will…" — e.g., `add weather component to dashboard`. Short header describing what was done, followed by a body explaining what and why.
- **Commit scope**: Group changes semantically. Each commit should be a coherent, reviewable unit — not too large, not trivially small.
- **Testing**: All code changes require tests.
- **Branching**: Feature branches per SpecKit workflow with sequential numbering.
- **CI**: Runs lint + tests before merge.
- **Dependencies**: Keep minimal — justify any new dependency.

## Governance

- This constitution supersedes all other project practices and conventions.
- Amendments require documentation and review before adoption.
- All code contributions must verify compliance with these principles.
- Complexity beyond what the constitution allows must be justified in writing.

### Variance Register

- **V-001 Dual-mode runtime packaging**
  - **Status**: Open
  - **Scope**: Headless mode is implemented and operational. Headed Electron runtime wiring is not yet implemented in this branch.
  - **Constraint**: Dashboard architecture must remain runtime-agnostic so Electron can be added without frontend fork.

**Version**: 1.1.0 | **Ratified**: 2026-04-28 | **Last Amended**: 2026-05-18
