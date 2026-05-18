# Implementation Plan: Dashboard Framework

**Branch**: `001-dashboard-framework` | **Date**: 2025-07-15 | **Spec**: `specs/001-dashboard-framework/spec.md`
**Input**: Feature specification from `specs/001-dashboard-framework/spec.md`

## Summary

Build the foundational dashboard framework for Heimdall: a config-driven, full-screen view cycling system with a modular component architecture. The dashboard reads a JSON configuration file, renders views one at a time, cycles through them on a timer, and adapts to any screen size. An image component with four display modes (contain, cover, stretch, center) serves as the first concrete component, proving the architecture end-to-end.

**Technical approach**: pnpm monorepo with three packages (shared types, Fastify server, React+Vite dashboard). Config is plain JSON read by the server and served via a single API endpoint. View cycling is a `setInterval` + React state. Image display modes map directly to CSS `object-fit`. Headless/browser mode is implemented; headed runtime packaging is tracked separately.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (LTS)
**Primary Dependencies**: React 18, Vite 5, Fastify 4, @fastify/static
**Storage**: JSON config file on local filesystem (`config.json`)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Local network — modern browser (headless). Headed Electron runtime is a tracked follow-up.
**Project Type**: Full-stack desktop/web application (monorepo)
**Performance Goals**: Instant view rendering (<100ms transition), smooth image loading
**Constraints**: No cloud dependencies, minimal external packages, local-network-first
**Scale/Scope**: Single dashboard instance per device, 1-20 views typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Modular-First** | ✅ PASS | Each view component is self-contained with own config schema and rendering logic. Component registry allows add/remove without affecting others. |
| **II. Configuration-Driven** | ✅ PASS | Dashboard layout, views, and component settings all defined in `config.json`. No code changes needed to reconfigure. |
| **III. Dual-Mode Operation** | ⚠️ PARTIAL | Headless mode is implemented. Dashboard code is runtime-agnostic, but Electron runtime wiring is not yet implemented in this branch (tracked variance V-001). |
| **IV. Local-Network-First** | ✅ PASS | No cloud dependencies. Server runs locally, serves local files. External URLs optional per-component. |
| **V. Simplicity (YAGNI)** | ✅ PASS | Three packages (minimum viable split). No animation lib, no state management lib, no CSS framework. JSON config (no YAML dep). CSS object-fit for image modes (no custom rendering). |
| **VI. Human-Maintainable** | ✅ PASS | Direct CSS mapping for display modes. Simple setInterval cycling. Flat component registry (a plain object). Every module testable in isolation. |

**Technology Constraints check**:
- ✅ Node.js 20+, TypeScript, React+Vite, Fastify, pnpm monorepo, Vitest+Playwright
- ⚠️ Headed Electron runtime is planned but not yet wired
- ✅ Minimal dependencies: only Fastify, @fastify/static, React, Vite, Electron — all justified by constitution

**Post-Phase 1 re-check**: All gates still pass. Three-package monorepo is the minimum viable split. No abstraction layers beyond what the spec requires.

## Project Structure

### Documentation (this feature)

```text
specs/001-dashboard-framework/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology decisions
├── data-model.md        # Phase 1 output — entity definitions
├── quickstart.md        # Phase 1 output — getting started guide
├── contracts/
│   └── api.md           # Phase 1 output — server API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/                    # Shared TypeScript types
│   ├── src/
│   │   └── types.ts           # DashboardConfig, ViewEntry, ImageSettings, ComponentProps
│   ├── package.json
│   └── tsconfig.json
│
├── server/                    # Fastify backend
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── config.ts          # Config file loading + validation
│   │   └── routes/
│   │       └── config.ts      # GET /api/config route
│   ├── tests/
│   │   ├── config.test.ts     # Config loading/validation unit tests
│   │   └── routes.test.ts     # API route tests
│   ├── package.json
│   └── tsconfig.json
│
└── dashboard/                 # React + Vite frontend
    ├── src/
    │   ├── main.tsx            # App entry point
    │   ├── App.tsx             # Root component — config loading, view cycling
    │   ├── components/
    │   │   ├── registry.ts     # Component type → React component map
    │   │   ├── ViewRenderer.tsx # Renders active view, handles unknown types
    │   │   ├── ImageView.tsx   # Image component (object-fit display modes)
    │   │   ├── EmptyState.tsx  # "No views configured" screen
    │   │   └── ErrorState.tsx  # Config error / invalid view screen
    │   └── styles/
    │       └── global.css      # Full-screen reset, viewport units
    ├── tests/
    │   ├── unit/
    │   │   ├── ImageView.test.tsx
    │   │   ├── ViewRenderer.test.tsx
    │   │   └── registry.test.ts
    │   └── e2e/
    │       ├── dashboard.spec.ts    # Full cycling + display E2E
    │       └── image.spec.ts        # Image display modes E2E
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── tsconfig.json

# Root config
config.json                    # Dashboard configuration (user-created)
assets/                        # Static image assets directory
pnpm-workspace.yaml            # Monorepo workspace definition
package.json                   # Root package.json with workspace scripts
tsconfig.base.json             # Shared TypeScript base config
vitest.workspace.ts            # Vitest workspace config
playwright.config.ts           # Playwright E2E config
```

**Structure Decision**: Three-package monorepo (`shared`, `server`, `dashboard`) — this is the minimum viable split for a full-stack TypeScript app with type sharing between frontend and backend. Matches constitution's modular-first principle without over-engineering.

## Complexity Tracking

No violations. All design decisions align with constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
